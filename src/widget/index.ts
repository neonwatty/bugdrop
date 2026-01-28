import { captureScreenshot } from './screenshot';
import { createElementPicker } from './picker';
import { createAnnotator } from './annotator';
import {
  injectStyles,
  createModal,
  showSuccessModal,
} from './ui';

interface WidgetConfig {
  repo: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark' | 'auto';
  // Name/email field configuration
  showName: boolean;
  requireName: boolean;
  showEmail: boolean;
  requireEmail: boolean;
  // Dismissible button configuration
  buttonDismissible: boolean;
  dismissDuration?: number; // Days before dismissed button reappears (undefined = forever)
  showRestore: boolean; // Show a restore pill after dismissing (default true when dismissible)
  // Button visibility (false = API-only mode)
  showButton: boolean;
}

// BugDrop JavaScript API interface
interface BugDropAPI {
  open: () => void;
  close: () => void;
  hide: () => void;
  show: () => void;
  isOpen: () => boolean;
  isButtonVisible: () => boolean;
}

// Declare global BugDrop API
declare global {
  interface Window {
    BugDrop?: BugDropAPI;
  }
}

interface FeedbackData {
  title: string;
  description: string;
  screenshot: string | null;
  elementSelector: string | null;
  name?: string;
  email?: string;
}

// localStorage key for dismissed state
const BUGDROP_DISMISSED_KEY = 'bugdrop_dismissed';

// Store widget state for API access
let _widgetRoot: HTMLElement | null = null;
let _triggerButton: HTMLElement | null = null;
let _restorePill: HTMLElement | null = null;
let _isModalOpen = false;
let _widgetConfig: WidgetConfig | null = null;

// Helper to check if button was dismissed
function isButtonDismissed(dismissDuration?: number): boolean {
  try {
    const dismissedAt = localStorage.getItem(BUGDROP_DISMISSED_KEY);
    if (!dismissedAt) return false;

    // Legacy support: if stored value is 'true', treat as permanently dismissed
    if (dismissedAt === 'true') return true;

    const timestamp = parseInt(dismissedAt, 10);
    if (isNaN(timestamp)) return false;

    // If no duration set, dismissed forever
    if (dismissDuration === undefined) return true;

    // Check if duration has passed (duration is in days)
    const durationMs = dismissDuration * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < durationMs;
  } catch {
    // localStorage may be blocked in some contexts
    return false;
  }
}

// Helper to dismiss the button
function dismissButton(): void {
  try {
    localStorage.setItem(BUGDROP_DISMISSED_KEY, Date.now().toString());
  } catch {
    // localStorage may be blocked in some contexts
  }
}

// Read config from script tag
const script = document.currentScript as HTMLScriptElement;
const rawTheme = script?.dataset.theme as WidgetConfig['theme'] | undefined;
const config: WidgetConfig = {
  repo: script?.dataset.repo || '',
  apiUrl: script?.src.replace('/widget.js', '/api') || '',
  position: (script?.dataset.position as WidgetConfig['position']) || 'bottom-right',
  theme: rawTheme || 'auto', // Default to auto-detection
  // Name/email field configuration (all default to false for backwards compatibility)
  showName: script?.dataset.showName === 'true',
  requireName: script?.dataset.requireName === 'true',
  showEmail: script?.dataset.showEmail === 'true',
  requireEmail: script?.dataset.requireEmail === 'true',
  // Dismissible button configuration
  buttonDismissible: script?.dataset.buttonDismissible === 'true',
  dismissDuration: script?.dataset.dismissDuration
    ? parseInt(script.dataset.dismissDuration, 10)
    : undefined,
  // Show restore pill after dismissing (default true when dismissible, unless explicitly false)
  showRestore: script?.dataset.showRestore !== 'false',
  // Button visibility (default true, set to false for API-only mode)
  showButton: script?.dataset.button !== 'false',
};

// Validate config
if (!config.repo) {
  console.error('[BugDrop] Missing data-repo attribute');
} else {
  initWidget(config);
}

// Create the restore pill shown after dismissing the button
function createRestorePill(root: HTMLElement, config: WidgetConfig): HTMLElement {
  const pill = document.createElement('button');
  pill.className = 'bd-restore-pill';
  pill.innerHTML = '🐛 Feedback';
  pill.setAttribute('aria-label', 'Show feedback button');

  pill.addEventListener('click', () => {
    // Clear dismissed state
    try {
      localStorage.removeItem(BUGDROP_DISMISSED_KEY);
    } catch {
      // localStorage may be blocked
    }

    // Remove the pill
    pill.remove();
    _restorePill = null;

    // Recreate the trigger button
    createTriggerButton(root, config);
  });

  root.appendChild(pill);
  _restorePill = pill;
  return pill;
}

function initWidget(config: WidgetConfig) {
  // Store config for API access
  _widgetConfig = config;

  // Create Shadow DOM for style isolation
  const host = document.createElement('div');
  host.id = 'bugdrop-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles and create root wrapper
  const root = injectStyles(shadow, config);
  _widgetRoot = root;

  // Determine if button should be rendered
  const shouldShowButton = config.showButton &&
    !(config.buttonDismissible && isButtonDismissed(config.dismissDuration));

  if (shouldShowButton) {
    const trigger = document.createElement('button');
    trigger.className = 'bd-trigger';
    trigger.innerHTML = '🐛';
    trigger.setAttribute('aria-label', 'Report a bug or send feedback');

    // Add close button if dismissible
    if (config.buttonDismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'bd-trigger-close';
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('aria-label', 'Dismiss feedback button');
      trigger.appendChild(closeBtn);

      // Handle close button click
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger the main button
        dismissButton();
        trigger.remove();
        _triggerButton = null;

        // Show restore pill if enabled
        if (config.showRestore) {
          createRestorePill(root, config);
        }
      });
    }

    root.appendChild(trigger);
    _triggerButton = trigger;

    // Handle trigger click
    trigger.addEventListener('click', () => openFeedbackFlow(root, config));
  } else if (config.showButton && config.buttonDismissible && config.showRestore && isButtonDismissed(config.dismissDuration)) {
    // Button was previously dismissed - show restore pill
    createRestorePill(root, config);
  }

  // Expose the BugDrop API
  exposeBugDropAPI(root, config);

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('bugdrop:ready'));
}

// Create and expose the BugDrop JavaScript API
function exposeBugDropAPI(root: HTMLElement, config: WidgetConfig) {
  window.BugDrop = {
    // Open the feedback modal programmatically
    open: () => {
      if (!_isModalOpen) {
        openFeedbackFlow(root, config);
      }
    },

    // Close the current modal
    close: () => {
      if (_isModalOpen) {
        // Find and remove any open modal
        const modal = root.querySelector('.bd-modal');
        if (modal) {
          modal.remove();
        }
        _isModalOpen = false;
      }
    },

    // Hide the floating button
    hide: () => {
      if (_triggerButton) {
        _triggerButton.style.display = 'none';
      }
    },

    // Show the floating button (clears dismissed state when called)
    show: () => {
      // Clear dismissed state when explicitly called
      try {
        localStorage.removeItem(BUGDROP_DISMISSED_KEY);
      } catch {
        // localStorage may be blocked
      }

      // Remove restore pill if present
      if (_restorePill) {
        _restorePill.remove();
        _restorePill = null;
      }

      if (_triggerButton) {
        _triggerButton.style.display = '';
      } else if (config.showButton) {
        // Recreate button if it was removed
        createTriggerButton(root, config);
      }
    },

    // Check if modal is currently open
    isOpen: () => _isModalOpen,

    // Check if floating button is visible
    isButtonVisible: () => {
      return _triggerButton !== null &&
        _triggerButton.style.display !== 'none';
    },
  };
}

// Helper to create the trigger button (used by show() API)
function createTriggerButton(root: HTMLElement, config: WidgetConfig) {
  const trigger = document.createElement('button');
  trigger.className = 'bd-trigger';
  trigger.innerHTML = '🐛';
  trigger.setAttribute('aria-label', 'Report a bug or send feedback');

  if (config.buttonDismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'bd-trigger-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Dismiss feedback button');
    trigger.appendChild(closeBtn);

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissButton();
      trigger.remove();
      _triggerButton = null;
    });
  }

  root.appendChild(trigger);
  _triggerButton = trigger;

  trigger.addEventListener('click', () => openFeedbackFlow(root, config));
}

async function openFeedbackFlow(root: HTMLElement, config: WidgetConfig) {
  // Mark modal as open
  _isModalOpen = true;

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
  const formData = await showFeedbackForm(root, annotatedScreenshot, config);
  if (!formData) {
    // User cancelled
    _isModalOpen = false;
    return;
  }

  // Submit
  await submitFeedback(root, config, {
    ...formData,
    screenshot: annotatedScreenshot,
    elementSelector,
  });

  // Flow complete
  _isModalOpen = false;
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
        <div class="bd-spinner bd-spinner--lg"></div>
        <p class="bd-loading-text" style="margin-top: 12px;">Capturing screenshot...</p>
      </div>
    `
  );

  try {
    const screenshot = await captureScreenshot(element);
    loadingModal.remove();
    return screenshot;
  } catch (_error) {
    loadingModal.remove();

    // Show error with retry option
    return new Promise((resolve) => {
      const errorModal = createModal(
        root,
        'Capture Failed',
        `
          <div class="bd-error-message">
            <svg class="bd-error-message__icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-9.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5.5zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>
            <span class="bd-error-message__text">Failed to capture screenshot. This might be due to browser restrictions.</span>
          </div>
          <div class="bd-actions">
            <button class="bd-btn bd-btn-secondary" data-action="skip">Skip Screenshot</button>
            <button class="bd-btn bd-btn-primary" data-action="retry">Try Again</button>
          </div>
        `
      );

      const closeBtn = errorModal.querySelector('.bd-close') as HTMLElement;
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

function showInstallPrompt(root: HTMLElement, _config: WidgetConfig) {
  const modal = createModal(
    root,
    'Install Required',
    `
      <p style="margin: 0 0 16px; color: var(--bd-text-secondary);">BugDrop requires GitHub App installation to create issues.</p>
      <div class="bd-actions">
        <button class="bd-btn bd-btn-secondary" data-action="cancel">Cancel</button>
        <a href="https://github.com/apps/YOUR_APP_NAME/installations/new" target="_blank" class="bd-btn bd-btn-primary" style="text-decoration: none;">Install App</a>
      </div>
    `
  );

  const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
  const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;

  closeBtn?.addEventListener('click', () => {
    modal.remove();
    _isModalOpen = false;
  });
  cancelBtn?.addEventListener('click', () => {
    modal.remove();
    _isModalOpen = false;
  });
}

function showScreenshotOptions(root: HTMLElement): Promise<'skip' | 'capture' | 'element'> {
  return new Promise((resolve) => {
    const modal = createModal(
      root,
      'Capture Screenshot',
      `
        <p style="margin: 0 0 16px; color: var(--bd-text-secondary);">Would you like to include a screenshot with your feedback?</p>
        <div class="bd-actions">
          <button class="bd-btn bd-btn-secondary" data-action="skip">Skip</button>
          <button class="bd-btn bd-btn-secondary" data-action="element">Select Element</button>
          <button class="bd-btn bd-btn-primary" data-action="capture">Full Page</button>
        </div>
      `
    );

    const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
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
        <div class="bd-tools">
          <button class="bd-tool active" data-tool="draw">✏️ Draw</button>
          <button class="bd-tool" data-tool="arrow">➡️ Arrow</button>
          <button class="bd-tool" data-tool="rect">▢ Rectangle</button>
          <button class="bd-tool" data-action="undo">↶ Undo</button>
        </div>
        <div id="annotation-canvas"></div>
        <div class="bd-actions">
          <button class="bd-btn bd-btn-secondary" data-action="skip">Skip Annotations</button>
          <button class="bd-btn bd-btn-primary" data-action="done">Done</button>
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
    const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
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
  screenshot: string | null,
  config: WidgetConfig
): Promise<{ title: string; description: string; name?: string; email?: string } | null> {
  return new Promise((resolve) => {
    const previewHtml = screenshot
      ? `<div class="bd-preview"><img src="${screenshot}" alt="Screenshot preview" /></div>`
      : '';

    // Build optional name field
    const nameFieldHtml = config.showName
      ? `
          <div class="bd-form-group">
            <label class="bd-label" for="name">Name${config.requireName ? ' *' : ''}</label>
            <input type="text" id="name" class="bd-input" ${config.requireName ? 'required' : ''} placeholder="Your name" />
          </div>
        `
      : '';

    // Build optional email field
    const emailFieldHtml = config.showEmail
      ? `
          <div class="bd-form-group">
            <label class="bd-label" for="email">Email${config.requireEmail ? ' *' : ''}</label>
            <input type="email" id="email" class="bd-input" ${config.requireEmail ? 'required' : ''} placeholder="your@email.com" />
          </div>
        `
      : '';

    const modal = createModal(
      root,
      'Send Feedback',
      `
        ${previewHtml}
        <form id="feedback-form">
          ${nameFieldHtml}
          ${emailFieldHtml}
          <div class="bd-form-group">
            <label class="bd-label" for="title">Title *</label>
            <input type="text" id="title" class="bd-input" required placeholder="Brief description of the issue" />
          </div>
          <div class="bd-form-group">
            <label class="bd-label" for="description">Description</label>
            <textarea id="description" class="bd-textarea" placeholder="Additional details..."></textarea>
          </div>
          <div class="bd-actions">
            <button type="button" class="bd-btn bd-btn-secondary" data-action="cancel">Cancel</button>
            <button type="submit" class="bd-btn bd-btn-primary" id="submit-btn">Submit</button>
          </div>
        </form>
      `
    );

    const form = modal.querySelector('#feedback-form') as HTMLFormElement;
    const nameInput = modal.querySelector('#name') as HTMLInputElement | null;
    const emailInput = modal.querySelector('#email') as HTMLInputElement | null;
    const titleInput = modal.querySelector('#title') as HTMLInputElement;
    const descriptionInput = modal.querySelector('#description') as HTMLTextAreaElement;
    const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
    const cancelBtn = modal.querySelector('[data-action="cancel"]') as HTMLElement;

    // Clear validation errors on input
    const clearError = (input: HTMLInputElement) => {
      input.classList.remove('bd-input--error');
      const errorHint = input.parentElement?.querySelector('.bd-field-error');
      if (errorHint) errorHint.remove();
    };

    titleInput?.addEventListener('input', () => clearError(titleInput));
    nameInput?.addEventListener('input', () => clearError(nameInput));
    emailInput?.addEventListener('input', () => clearError(emailInput));

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

      // Validate required fields
      let hasError = false;

      const showError = (input: HTMLInputElement, message: string) => {
        input.classList.add('bd-input--error');
        const existingError = input.parentElement?.querySelector('.bd-field-error');
        if (!existingError) {
          const errorHint = document.createElement('div');
          errorHint.className = 'bd-field-error';
          errorHint.textContent = message;
          input.parentElement?.appendChild(errorHint);
        }
        if (!hasError) {
          input.focus();
          hasError = true;
        }
      };

      // Validate name if required
      if (config.requireName && nameInput && !nameInput.value.trim()) {
        showError(nameInput, 'Name is required');
      }

      // Validate email if required
      if (config.requireEmail && emailInput && !emailInput.value.trim()) {
        showError(emailInput, 'Email is required');
      }

      // Validate title (always required)
      const title = titleInput.value.trim();
      if (!title) {
        showError(titleInput, 'Title is required');
      }

      if (hasError) return;

      modal.remove();
      resolve({
        title,
        description: descriptionInput.value.trim(),
        name: nameInput?.value.trim() || undefined,
        email: emailInput?.value.trim() || undefined,
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
        <div class="bd-spinner bd-spinner--lg"></div>
        <p class="bd-loading-text" style="margin-top: 12px;">Creating issue...</p>
      </div>
    `
  );

  try {
    // Build submitter info if provided
    const submitter = (data.name || data.email)
      ? { name: data.name, email: data.email }
      : undefined;

    const response = await fetch(`${config.apiUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: config.repo,
        title: data.title,
        description: data.description,
        screenshot: data.screenshot,
        submitter,
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
      await showSuccessModal(
        root,
        result.issueNumber,
        result.issueUrl,
        result.isPublic ?? false
      );
    } else {
      showSubmitError(root, config, data, result.error || 'Failed to submit');
    }
  } catch (_error) {
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
      <div class="bd-error-message">
        <svg class="bd-error-message__icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-9.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5.5zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
        <span class="bd-error-message__text">${errorMessage}</span>
      </div>
      <div class="bd-actions">
        <button class="bd-btn bd-btn-secondary" data-action="cancel">Cancel</button>
        <button class="bd-btn bd-btn-primary" data-action="retry">Try Again</button>
      </div>
    `
  );

  const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
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
      // Handle SVG elements where className is SVGAnimatedString, not a string
      const classNameStr = typeof current.className === 'string'
        ? current.className
        : (current.className as SVGAnimatedString).baseVal || '';
      const classes = classNameStr.split(' ').filter(c => c).slice(0, 2);
      if (classes.length) {
        selector += `.${classes.join('.')}`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
