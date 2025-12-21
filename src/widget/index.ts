import { captureScreenshot } from './screenshot';
import { createElementPicker } from './picker';
import { createAnnotator } from './annotator';
import {
  injectStyles,
  createModal,
  showToast,
  showLoadingOverlay,
  hideLoadingOverlay,
  setButtonLoading,
  showError,
  clearError,
} from './ui';

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

// Store root element for global access
let widgetRoot: HTMLElement | null = null;

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

  // Inject styles and create root wrapper
  const root = injectStyles(shadow, config);
  widgetRoot = root;

  const trigger = document.createElement('button');
  trigger.className = 'fw-trigger';
  trigger.innerHTML = '💬';
  trigger.setAttribute('aria-label', 'Send feedback');
  root.appendChild(trigger);

  // Handle trigger click
  trigger.addEventListener('click', () => openFeedbackFlow(root, config));
}

async function openFeedbackFlow(root: HTMLElement, config: WidgetConfig) {
  // Check if app is installed
  const installed = await checkInstallation(config);
  if (!installed) {
    showInstallPrompt(root, config);
    return;
  }

  // Step 1: Screenshot options
  const screenshotChoice = await showScreenshotOptions(root);

  let screenshot: string | null = null;
  let elementSelector: string | null = null;

  if (screenshotChoice === 'capture') {
    screenshot = await captureWithLoading(root);
  } else if (screenshotChoice === 'element') {
    const element = await createElementPicker();
    if (element) {
      screenshot = await captureWithLoading(root, element);
      elementSelector = getElementSelector(element);
    }
  }

  // Step 2: Annotate (if screenshot exists)
  let annotatedScreenshot = screenshot;
  if (screenshot) {
    annotatedScreenshot = await showAnnotationStep(root, screenshot);
  }

  // Step 3: Feedback form
  const formData = await showFeedbackForm(root, annotatedScreenshot);
  if (!formData) return; // User cancelled

  // Submit
  await submitFeedback(root, config, {
    ...formData,
    screenshot: annotatedScreenshot,
    elementSelector,
  });
}

async function captureWithLoading(
  root: HTMLElement,
  element?: Element
): Promise<string | null> {
  // Show a temporary loading indicator
  const loadingModal = createModal(
    root,
    'Capturing...',
    `
      <div style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
        <div class="fw-spinner fw-spinner--lg"></div>
        <p class="fw-loading-text" style="margin-top: 12px;">Capturing screenshot...</p>
      </div>
    `
  );

  try {
    const screenshot = await captureScreenshot(element);
    loadingModal.remove();
    return screenshot;
  } catch (error) {
    loadingModal.remove();

    // Show error with retry option
    return new Promise((resolve) => {
      const errorModal = createModal(
        root,
        'Capture Failed',
        `
          <div class="fw-error-message">
            <svg class="fw-error-message__icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-9.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5.5zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>
            <span class="fw-error-message__text">Failed to capture screenshot. This might be due to browser restrictions.</span>
          </div>
          <div class="fw-actions">
            <button class="fw-btn fw-btn-secondary" data-action="skip">Skip Screenshot</button>
            <button class="fw-btn fw-btn-primary" data-action="retry">Try Again</button>
          </div>
        `
      );

      const closeBtn = errorModal.querySelector('.fw-close') as HTMLElement;
      const skipBtn = errorModal.querySelector('[data-action="skip"]') as HTMLElement;
      const retryBtn = errorModal.querySelector('[data-action="retry"]') as HTMLElement;

      closeBtn?.addEventListener('click', () => {
        errorModal.remove();
        resolve(null);
      });

      skipBtn?.addEventListener('click', () => {
        errorModal.remove();
        resolve(null);
      });

      retryBtn?.addEventListener('click', async () => {
        errorModal.remove();
        const result = await captureWithLoading(root, element);
        resolve(result);
      });
    });
  }
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

function showInstallPrompt(root: HTMLElement, config: WidgetConfig) {
  const modal = createModal(
    root,
    'Install Required',
    `
      <p style="margin: 0 0 16px; color: var(--fw-text-secondary);">This feedback widget requires GitHub App installation.</p>
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

function showScreenshotOptions(root: HTMLElement): Promise<'skip' | 'capture' | 'element'> {
  return new Promise((resolve) => {
    const modal = createModal(
      root,
      'Capture Screenshot',
      `
        <p style="margin: 0 0 16px; color: var(--fw-text-secondary);">Would you like to include a screenshot with your feedback?</p>
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

function showAnnotationStep(root: HTMLElement, screenshot: string): Promise<string> {
  return new Promise((resolve) => {
    const modal = createModal(
      root,
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
  root: HTMLElement,
  screenshot: string | null
): Promise<{ title: string; description: string } | null> {
  return new Promise((resolve) => {
    const previewHtml = screenshot
      ? `<div class="fw-preview"><img src="${screenshot}" alt="Screenshot preview" /></div>`
      : '';

    const modal = createModal(
      root,
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
            <button type="submit" class="fw-btn fw-btn-primary" id="submit-btn">Submit</button>
          </div>
        </form>
      `
    );

    const form = modal.querySelector('#feedback-form') as HTMLFormElement;
    const titleInput = modal.querySelector('#title') as HTMLInputElement;
    const descriptionInput = modal.querySelector('#description') as HTMLTextAreaElement;
    const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
    const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;

    // Clear validation errors on input
    titleInput?.addEventListener('input', () => {
      titleInput.classList.remove('fw-input--error');
      const errorHint = form.querySelector('.fw-field-error');
      if (errorHint) errorHint.remove();
    });

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

      // Validate
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.classList.add('fw-input--error');
        const existingError = form.querySelector('.fw-field-error');
        if (!existingError) {
          const errorHint = document.createElement('div');
          errorHint.className = 'fw-field-error';
          errorHint.textContent = 'Title is required';
          titleInput.parentElement?.appendChild(errorHint);
        }
        titleInput.focus();
        return;
      }

      modal.remove();
      resolve({
        title,
        description: descriptionInput.value.trim(),
      });
    });
  });
}

async function submitFeedback(
  root: HTMLElement,
  config: WidgetConfig,
  data: FeedbackData
) {
  // Show submitting modal with loading state
  const modal = createModal(
    root,
    'Submitting...',
    `
      <div style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
        <div class="fw-spinner fw-spinner--lg"></div>
        <p class="fw-loading-text" style="margin-top: 12px;">Creating issue...</p>
      </div>
    `
  );

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
    modal.remove();

    if (result.success) {
      showToast(root, `Issue #${result.issueNumber} created!`, 'success');
    } else {
      showSubmitError(root, config, data, result.error || 'Failed to submit');
    }
  } catch (error) {
    modal.remove();
    showSubmitError(root, config, data, 'Network error. Please check your connection.');
  }
}

function showSubmitError(
  root: HTMLElement,
  config: WidgetConfig,
  data: FeedbackData,
  errorMessage: string
) {
  const modal = createModal(
    root,
    'Submission Failed',
    `
      <div class="fw-error-message">
        <svg class="fw-error-message__icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-9.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5.5zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
        <span class="fw-error-message__text">${errorMessage}</span>
      </div>
      <div class="fw-actions">
        <button class="fw-btn fw-btn-secondary" data-action="cancel">Cancel</button>
        <button class="fw-btn fw-btn-primary" data-action="retry">Try Again</button>
      </div>
    `
  );

  const closeBtn = modal.querySelector('.fw-close') as HTMLElement;
  const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;
  const retryBtn = modal.querySelector('[data-action="retry"]') as HTMLElement;

  closeBtn?.addEventListener('click', () => modal.remove());
  cancelBtn?.addEventListener('click', () => modal.remove());

  retryBtn?.addEventListener('click', async () => {
    modal.remove();
    await submitFeedback(root, config, data);
  });
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
