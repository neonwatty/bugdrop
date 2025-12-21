interface WidgetConfig {
  repo: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark' | 'auto';
}

// Detect system dark mode preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function injectStyles(shadow: ShadowRoot, config: WidgetConfig) {
  const pos = config.position === 'bottom-left' ? 'left: 20px' : 'right: 20px';
  // Resolve 'auto' to actual theme based on system preference
  const resolvedTheme = config.theme === 'auto' ? getSystemTheme() : config.theme;
  const isDark = resolvedTheme === 'dark';

  const styles = document.createElement('style');
  styles.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

    :host {
      /* Typography */
      --fw-font: 'Space Grotesk', system-ui, sans-serif;

      /* Radius */
      --fw-radius-sm: 6px;
      --fw-radius-md: 10px;
      --fw-radius-lg: 14px;

      /* Transitions */
      --fw-transition: 0.15s ease;
      --fw-transition-slow: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Light Theme (Default) */
    .fw-root {
      --fw-bg-primary: #fafaf9;
      --fw-bg-secondary: #f5f5f4;
      --fw-bg-tertiary: #e7e5e4;
      --fw-text-primary: #1c1917;
      --fw-text-secondary: #57534e;
      --fw-text-muted: #a8a29e;
      --fw-border: #e7e5e4;
      --fw-border-focus: #14b8a6;
      --fw-primary: #14b8a6;
      --fw-primary-hover: #0d9488;
      --fw-primary-text: #ffffff;
      --fw-overlay-bg: rgba(0, 0, 0, 0.4);
      --fw-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --fw-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --fw-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.12);
      --fw-shadow-glow: none;
      --fw-success: #22c55e;
      --fw-error: #ef4444;
    }

    /* Dark Theme */
    .fw-root.fw-dark {
      --fw-bg-primary: #0f172a;
      --fw-bg-secondary: #1e293b;
      --fw-bg-tertiary: #334155;
      --fw-text-primary: #f1f5f9;
      --fw-text-secondary: #94a3b8;
      --fw-text-muted: #64748b;
      --fw-border: #334155;
      --fw-border-focus: #22d3ee;
      --fw-primary: #22d3ee;
      --fw-primary-hover: #06b6d4;
      --fw-primary-text: #0f172a;
      --fw-overlay-bg: rgba(0, 0, 0, 0.6);
      --fw-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
      --fw-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
      --fw-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
      --fw-shadow-glow: 0 0 40px rgba(34, 211, 238, 0.15);
      --fw-success: #34d399;
      --fw-error: #f87171;
    }

    .fw-root {
      font-family: var(--fw-font);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    * {
      box-sizing: border-box;
      font-family: inherit;
    }

    /* Trigger Button */
    .fw-trigger {
      position: fixed;
      bottom: 20px;
      ${pos};
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: var(--fw-primary);
      color: var(--fw-primary-text);
      font-size: 24px;
      cursor: pointer;
      box-shadow:
        var(--fw-shadow-md),
        0 0 0 0 var(--fw-primary);
      z-index: 999999;
      transition: transform var(--fw-transition), box-shadow var(--fw-transition);
    }

    .fw-trigger:hover {
      transform: scale(1.08);
      box-shadow:
        var(--fw-shadow-lg),
        0 0 20px rgba(20, 184, 166, 0.3);
    }

    .fw-trigger:active {
      transform: scale(0.96);
    }

    /* Modal Overlay */
    .fw-overlay {
      position: fixed;
      inset: 0;
      background: var(--fw-overlay-bg);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fw-fadeIn 0.2s ease;
    }

    /* Modal */
    .fw-modal {
      background: var(--fw-bg-primary);
      border-radius: var(--fw-radius-lg);
      border: 1px solid var(--fw-border);
      box-shadow: var(--fw-shadow-lg), var(--fw-shadow-glow);
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: fw-slideUp var(--fw-transition-slow);
    }

    /* Modal Header */
    .fw-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--fw-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--fw-bg-primary);
      animation: fw-fadeIn 0.2s ease 0.05s both;
    }

    .fw-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--fw-text-primary);
    }

    .fw-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--fw-radius-sm);
      font-size: 24px;
      cursor: pointer;
      color: var(--fw-text-secondary);
      padding: 0;
      line-height: 1;
      transition: background var(--fw-transition), color var(--fw-transition);
    }

    .fw-close:hover {
      background: var(--fw-bg-secondary);
      color: var(--fw-text-primary);
    }

    /* Modal Body with staggered animation */
    .fw-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .fw-body > *:nth-child(1) { animation: fw-fadeIn 0.2s ease 0.1s both; }
    .fw-body > *:nth-child(2) { animation: fw-fadeIn 0.2s ease 0.15s both; }
    .fw-body > *:nth-child(3) { animation: fw-fadeIn 0.2s ease 0.2s both; }
    .fw-body > *:nth-child(4) { animation: fw-fadeIn 0.2s ease 0.25s both; }
    .fw-body > *:nth-child(5) { animation: fw-fadeIn 0.2s ease 0.3s both; }

    /* Form Elements */
    .fw-form-group {
      margin-bottom: 16px;
    }

    .fw-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 13px;
      color: var(--fw-text-secondary);
      letter-spacing: 0.01em;
    }

    .fw-input, .fw-textarea {
      width: 100%;
      padding: 12px 14px;
      background: var(--fw-bg-primary);
      border: 1px solid var(--fw-border);
      border-radius: var(--fw-radius-sm);
      font-size: 14px;
      color: var(--fw-text-primary);
      transition: border-color var(--fw-transition), box-shadow var(--fw-transition);
    }

    .fw-input::placeholder, .fw-textarea::placeholder {
      color: var(--fw-text-muted);
    }

    .fw-input:focus, .fw-textarea:focus {
      outline: none;
      border-color: var(--fw-border-focus);
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
    }

    .fw-dark .fw-input:focus, .fw-dark .fw-textarea:focus {
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
    }

    .fw-textarea {
      min-height: 100px;
      resize: vertical;
    }

    /* Buttons */
    .fw-btn {
      padding: 11px 20px;
      border-radius: var(--fw-radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--fw-transition);
      position: relative;
    }

    .fw-btn-primary {
      background: var(--fw-primary);
      color: var(--fw-primary-text);
      border: none;
      box-shadow: var(--fw-shadow-sm);
    }

    .fw-btn-primary:hover {
      background: var(--fw-primary-hover);
      box-shadow: var(--fw-shadow-md);
    }

    .fw-dark .fw-btn-primary:hover {
      box-shadow: var(--fw-shadow-md), 0 0 20px rgba(34, 211, 238, 0.2);
    }

    .fw-btn-secondary {
      background: var(--fw-bg-primary);
      border: 1px solid var(--fw-border);
      color: var(--fw-text-primary);
    }

    .fw-btn-secondary:hover {
      background: var(--fw-bg-secondary);
    }

    .fw-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Loading States */
    .fw-btn--loading {
      color: transparent !important;
      pointer-events: none;
    }

    .fw-btn--loading::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      top: 50%;
      left: 50%;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-color: var(--fw-primary-text) transparent var(--fw-primary-text) transparent;
      border-radius: 50%;
      animation: fw-spin 0.8s linear infinite;
    }

    .fw-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--fw-border);
      border-top-color: var(--fw-primary);
      border-radius: 50%;
      animation: fw-spin 0.8s linear infinite;
    }

    .fw-spinner--lg {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }

    .fw-loading-overlay {
      position: absolute;
      inset: 0;
      background: var(--fw-bg-primary);
      opacity: 0.95;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 10;
      border-radius: var(--fw-radius-lg);
    }

    .fw-loading-text {
      font-size: 14px;
      color: var(--fw-text-secondary);
      font-weight: 500;
    }

    .fw-skeleton {
      background: linear-gradient(
        90deg,
        var(--fw-bg-secondary) 0%,
        var(--fw-bg-tertiary) 50%,
        var(--fw-bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: fw-shimmer 1.5s ease-in-out infinite;
      border-radius: var(--fw-radius-sm);
    }

    /* Error States */
    .fw-error-message {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--fw-radius-sm);
      color: var(--fw-error);
      font-size: 13px;
      margin-bottom: 16px;
    }

    .fw-dark .fw-error-message {
      background: rgba(248, 113, 113, 0.1);
      border-color: rgba(248, 113, 113, 0.2);
    }

    .fw-error-message__icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    .fw-error-message__text {
      flex: 1;
      line-height: 1.4;
    }

    .fw-error-message__retry {
      background: none;
      border: none;
      color: inherit;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
      font-size: 13px;
    }

    .fw-input--error, .fw-textarea--error {
      border-color: var(--fw-error) !important;
    }

    .fw-input--error:focus, .fw-textarea--error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
    }

    .fw-field-error {
      color: var(--fw-error);
      font-size: 12px;
      margin-top: 4px;
    }

    /* Actions */
    .fw-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    /* Tools Toolbar */
    .fw-tools {
      display: flex;
      gap: 6px;
      padding: 8px;
      background: var(--fw-bg-secondary);
      border: 1px solid var(--fw-border);
      border-radius: var(--fw-radius-md);
      margin-bottom: 12px;
    }

    .fw-tool {
      padding: 8px 14px;
      background: transparent;
      border: none;
      border-radius: var(--fw-radius-sm);
      font-size: 13px;
      font-weight: 500;
      color: var(--fw-text-secondary);
      cursor: pointer;
      transition: all var(--fw-transition);
    }

    .fw-tool:hover {
      background: var(--fw-bg-tertiary);
      color: var(--fw-text-primary);
    }

    .fw-tool.active {
      background: var(--fw-bg-primary);
      color: var(--fw-primary);
      box-shadow: var(--fw-shadow-sm);
    }

    /* Preview */
    .fw-preview {
      border: 1px solid var(--fw-border);
      border-radius: var(--fw-radius-md);
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: var(--fw-shadow-sm);
    }

    .fw-preview img {
      width: 100%;
      display: block;
    }

    /* Toast Notifications */
    .fw-toast {
      position: fixed;
      bottom: 100px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      border-radius: var(--fw-radius-md);
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000001;
      box-shadow: var(--fw-shadow-lg);
      animation: fw-slideIn 0.3s ease;
    }

    .fw-toast.success {
      background: var(--fw-success);
    }

    .fw-toast.error {
      background: var(--fw-error);
    }

    /* Animations */
    @keyframes fw-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fw-slideUp {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes fw-slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes fw-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fw-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Mobile Responsiveness */
    @media (max-width: 640px) {
      .fw-trigger {
        width: 52px;
        height: 52px;
        bottom: 16px;
        font-size: 22px;
      }

      .fw-overlay {
        align-items: flex-end;
      }

      .fw-modal {
        width: 100%;
        max-width: 100%;
        max-height: 95vh;
        border-radius: var(--fw-radius-lg) var(--fw-radius-lg) 0 0;
        animation: fw-slideUpMobile var(--fw-transition-slow);
      }

      .fw-header {
        padding: 16px;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      .fw-close {
        width: 44px;
        height: 44px;
        font-size: 28px;
      }

      .fw-body {
        padding: 16px;
        padding-bottom: 32px;
      }

      .fw-btn {
        padding: 14px 24px;
        font-size: 16px;
        min-height: 48px;
      }

      .fw-input, .fw-textarea {
        padding: 14px;
        font-size: 16px;
        min-height: 48px;
      }

      .fw-textarea {
        min-height: 120px;
      }

      .fw-actions {
        flex-direction: column-reverse;
        gap: 8px;
      }

      .fw-actions .fw-btn {
        width: 100%;
      }

      .fw-tools {
        flex-wrap: wrap;
      }

      .fw-tool {
        flex: 1;
        min-width: calc(50% - 4px);
        justify-content: center;
        padding: 12px;
        text-align: center;
      }

      .fw-toast {
        left: 16px;
        right: 16px;
        bottom: 80px;
        justify-content: center;
      }
    }

    @keyframes fw-slideUpMobile {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Touch-friendly hover states */
    @media (hover: none) {
      .fw-trigger:hover {
        transform: none;
        box-shadow: var(--fw-shadow-md);
      }

      .fw-trigger:active {
        transform: scale(0.95);
      }

      .fw-btn:hover {
        background: inherit;
      }

      .fw-btn-primary:hover {
        background: var(--fw-primary);
      }

      .fw-btn-primary:active {
        background: var(--fw-primary-hover);
      }

      .fw-btn-secondary:hover {
        background: var(--fw-bg-primary);
      }

      .fw-btn-secondary:active {
        background: var(--fw-bg-secondary);
      }
    }

    /* Safe area support for notched devices */
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .fw-modal {
        padding-bottom: env(safe-area-inset-bottom);
      }
    }

    /* Reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  shadow.appendChild(styles);

  // Create root wrapper with theme class
  const root = document.createElement('div');
  root.className = `fw-root${isDark ? ' fw-dark' : ''}`;
  shadow.appendChild(root);

  return root;
}

export function createModal(
  container: HTMLElement,
  title: string,
  content: string
): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'fw-overlay';
  overlay.innerHTML = `
    <div class="fw-modal">
      <div class="fw-header">
        <h2 class="fw-title">${title}</h2>
        <button class="fw-close">&times;</button>
      </div>
      <div class="fw-body">
        ${content}
      </div>
    </div>
  `;

  container.appendChild(overlay);
  return overlay;
}

export function showToast(
  container: HTMLElement,
  message: string,
  type: 'success' | 'error'
) {
  const toast = document.createElement('div');
  toast.className = `fw-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

