interface WidgetConfig {
  repo: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark';
}

export function injectStyles(shadow: ShadowRoot, config: WidgetConfig) {
  const pos = config.position === 'bottom-left' ? 'left: 20px' : 'right: 20px';

  const styles = document.createElement('style');
  styles.textContent = `
    * {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .fw-trigger {
      position: fixed;
      bottom: 20px;
      ${pos};
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #0066ff;
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .fw-trigger:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    .fw-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fw-modal {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .fw-header {
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .fw-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .fw-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      line-height: 1;
    }

    .fw-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .fw-form-group {
      margin-bottom: 16px;
    }

    .fw-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 14px;
    }

    .fw-input, .fw-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .fw-input:focus, .fw-textarea:focus {
      outline: none;
      border-color: #0066ff;
      box-shadow: 0 0 0 3px rgba(0,102,255,0.1);
    }

    .fw-textarea {
      min-height: 100px;
      resize: vertical;
    }

    .fw-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .fw-btn-primary {
      background: #0066ff;
      color: white;
      border: none;
    }

    .fw-btn-primary:hover {
      background: #0052cc;
    }

    .fw-btn-secondary {
      background: white;
      border: 1px solid #ddd;
      color: #333;
    }

    .fw-btn-secondary:hover {
      background: #f5f5f5;
    }

    .fw-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .fw-tools {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .fw-tool {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .fw-tool.active {
      background: #0066ff;
      color: white;
      border-color: #0066ff;
    }

    .fw-preview {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .fw-preview img {
      width: 100%;
      display: block;
    }

    .fw-toast {
      position: fixed;
      bottom: 100px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      z-index: 1000001;
      animation: fw-slideIn 0.3s ease;
    }

    .fw-toast.success { background: #22c55e; }
    .fw-toast.error { background: #ef4444; }

    @keyframes fw-slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;

  shadow.appendChild(styles);
}

export function createModal(
  shadow: ShadowRoot,
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

  shadow.appendChild(overlay);
  return overlay;
}

export function showToast(
  shadow: ShadowRoot,
  message: string,
  type: 'success' | 'error'
) {
  const toast = document.createElement('div');
  toast.className = `fw-toast ${type}`;
  toast.textContent = message;
  shadow.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
