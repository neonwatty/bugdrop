import { captureScreenshot } from './screenshot';
import { createElementPicker } from './picker';
import { createAnnotator } from './annotator';
import { injectStyles, createModal, showToast } from './ui';

interface WidgetConfig {
  repo: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark';
}

interface FeedbackData {
  title: string;
  description: string;
  screenshot: string | null;
  elementSelector: string | null;
}

// Read config from script tag
const script = document.currentScript as HTMLScriptElement;
const config: WidgetConfig = {
  repo: script?.dataset.repo || '',
  apiUrl: script?.src.replace('/widget.js', '/api') || '',
  position: (script?.dataset.position as WidgetConfig['position']) || 'bottom-right',
  theme: (script?.dataset.theme as WidgetConfig['theme']) || 'light',
};

// Validate config
if (!config.repo) {
  console.error('[FeedbackWidget] Missing data-repo attribute');
} else {
  initWidget(config);
}

function initWidget(config: WidgetConfig) {
  // Create Shadow DOM for style isolation
  const host = document.createElement('div');
  host.id = 'feedback-widget-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles and trigger button
  injectStyles(shadow, config);

  const trigger = document.createElement('button');
  trigger.className = 'fw-trigger';
  trigger.innerHTML = '💬';
  trigger.setAttribute('aria-label', 'Send feedback');
  shadow.appendChild(trigger);

  // Handle trigger click
  trigger.addEventListener('click', () => openFeedbackFlow(shadow, config));
}

async function openFeedbackFlow(shadow: ShadowRoot, config: WidgetConfig) {
  // Check if app is installed
  const installed = await checkInstallation(config);
  if (!installed) {
    showInstallPrompt(shadow, config);
    return;
  }

  // Step 1: Screenshot options
  const screenshotChoice = await showScreenshotOptions(shadow);

  let screenshot: string | null = null;
  let elementSelector: string | null = null;

  if (screenshotChoice === 'capture') {
    screenshot = await captureScreenshot();
  } else if (screenshotChoice === 'element') {
    const element = await createElementPicker();
    if (element) {
      screenshot = await captureScreenshot(element);
      elementSelector = getElementSelector(element);
    }
  }

  // Step 2: Annotate (if screenshot exists)
  let annotatedScreenshot = screenshot;
  if (screenshot) {
    annotatedScreenshot = await showAnnotationStep(shadow, screenshot);
  }

  // Step 3: Feedback form
  const formData = await showFeedbackForm(shadow, annotatedScreenshot);
  if (!formData) return; // User cancelled

  // Submit
  await submitFeedback(shadow, config, {
    ...formData,
    screenshot: annotatedScreenshot,
    elementSelector,
  });
}

async function checkInstallation(config: WidgetConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiUrl}/check/${config.repo}`);
    const data = await response.json();
    return data.installed === true;
  } catch {
    return false;
  }
}

function showInstallPrompt(shadow: ShadowRoot, config: WidgetConfig) {
  const modal = createModal(
    shadow,
    'Install Required',
    `
      <p style="margin: 0 0 16px;">This feedback widget requires GitHub App installation.</p>
      <div class="fw-actions">
        <button class="fw-btn fw-btn-secondary" data-action="cancel">Cancel</button>
        <a href="https://github.com/apps/YOUR_APP_NAME/installations/new" target="_blank" class="fw-btn fw-btn-primary" style="text-decoration: none;">Install App</a>
      </div>
    `
  );

  const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
  const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;

  closeBtn?.addEventListener('click', () => modal.remove());
  cancelBtn?.addEventListener('click', () => modal.remove());
}

function showScreenshotOptions(shadow: ShadowRoot): Promise<'skip' | 'capture' | 'element'> {
  return new Promise((resolve) => {
    const modal = createModal(
      shadow,
      'Capture Screenshot',
      `
        <p style="margin: 0 0 16px;">Would you like to include a screenshot with your feedback?</p>
        <div class="fw-actions">
          <button class="fw-btn fw-btn-secondary" data-action="skip">Skip</button>
          <button class="fw-btn fw-btn-secondary" data-action="element">Select Element</button>
          <button class="fw-btn fw-btn-primary" data-action="capture">Full Page</button>
        </div>
      `
    );

    const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
    const skipBtn = modal.querySelector('[data-action="skip"]') as HTMLElement;
    const elementBtn = modal.querySelector('[data-action="element"]') as HTMLElement;
    const captureBtn = modal.querySelector('[data-action="capture"]') as HTMLElement;

    closeBtn?.addEventListener('click', () => {
      modal.remove();
      resolve('skip');
    });

    skipBtn?.addEventListener('click', () => {
      modal.remove();
      resolve('skip');
    });

    elementBtn?.addEventListener('click', () => {
      modal.remove();
      resolve('element');
    });

    captureBtn?.addEventListener('click', () => {
      modal.remove();
      resolve('capture');
    });
  });
}

function showAnnotationStep(shadow: ShadowRoot, screenshot: string): Promise<string> {
  return new Promise((resolve) => {
    const modal = createModal(
      shadow,
      'Annotate Screenshot',
      `
        <div class="fw-tools">
          <button class="fw-tool active" data-tool="draw">✏️ Draw</button>
          <button class="fw-tool" data-tool="arrow">➡️ Arrow</button>
          <button class="fw-tool" data-tool="rect">▢ Rectangle</button>
          <button class="fw-tool" data-action="undo">↶ Undo</button>
        </div>
        <div id="annotation-canvas"></div>
        <div class="fw-actions">
          <button class="fw-btn fw-btn-secondary" data-action="skip">Skip Annotations</button>
          <button class="fw-btn fw-btn-primary" data-action="done">Done</button>
        </div>
      `
    );

    const canvasContainer = modal.querySelector('#annotation-canvas') as HTMLElement;
    const annotator = createAnnotator(canvasContainer, screenshot);

    // Tool buttons
    const toolButtons = modal.querySelectorAll('[data-tool]');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tool = target.dataset.tool;

        if (tool === 'undo') {
          annotator.undo();
        } else if (tool) {
          toolButtons.forEach((b) => b.classList.remove('active'));
          target.classList.add('active');
          annotator.setTool(tool as any);
        }
      });
    });

    // Action buttons
    const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
    const skipBtn = modal.querySelector('[data-action="skip"]') as HTMLElement;
    const doneBtn = modal.querySelector('[data-action="done"]') as HTMLElement;

    closeBtn?.addEventListener('click', () => {
      annotator.destroy();
      modal.remove();
      resolve(screenshot);
    });

    skipBtn?.addEventListener('click', () => {
      annotator.destroy();
      modal.remove();
      resolve(screenshot);
    });

    doneBtn?.addEventListener('click', () => {
      const annotated = annotator.getImageData();
      annotator.destroy();
      modal.remove();
      resolve(annotated);
    });
  });
}

function showFeedbackForm(
  shadow: ShadowRoot,
  screenshot: string | null
): Promise<{ title: string; description: string } | null> {
  return new Promise((resolve) => {
    const previewHtml = screenshot
      ? `<div class="fw-preview"><img src="${screenshot}" alt="Screenshot preview" /></div>`
      : '';

    const modal = createModal(
      shadow,
      'Send Feedback',
      `
        ${previewHtml}
        <form id="feedback-form">
          <div class="fw-form-group">
            <label class="fw-label" for="title">Title *</label>
            <input type="text" id="title" class="fw-input" required placeholder="Brief description of the issue" />
          </div>
          <div class="fw-form-group">
            <label class="fw-label" for="description">Description</label>
            <textarea id="description" class="fw-textarea" placeholder="Additional details..."></textarea>
          </div>
          <div class="fw-actions">
            <button type="button" class="fw-btn fw-btn-secondary" data-action="cancel">Cancel</button>
            <button type="submit" class="fw-btn fw-btn-primary">Submit</button>
          </div>
        </form>
      `
    );

    const form = modal.querySelector('#feedback-form') as HTMLFormElement;
    const titleInput = modal.querySelector('#title') as HTMLInputElement;
    const descriptionInput = modal.querySelector('#description') as HTMLTextAreaElement;
    const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
    const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;

    closeBtn?.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });

    cancelBtn?.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      modal.remove();
      resolve({
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
      });
    });
  });
}

async function submitFeedback(
  shadow: ShadowRoot,
  config: WidgetConfig,
  data: FeedbackData
) {
  try {
    const response = await fetch(`${config.apiUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: config.repo,
        title: data.title,
        description: data.description,
        screenshot: data.screenshot,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          timestamp: new Date().toISOString(),
          elementSelector: data.elementSelector,
        },
      }),
    });

    const result = await response.json();

    if (result.success) {
      showToast(shadow, `Issue #${result.issueNumber} created!`, 'success');
    } else {
      showToast(shadow, result.error || 'Failed to submit', 'error');
    }
  } catch (error) {
    showToast(shadow, 'Network error', 'error');
  }
}

function getElementSelector(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className) {
      const classes = current.className.split(' ').filter(c => c).slice(0, 2);
      if (classes.length) {
        selector += `.${classes.join('.')}`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
