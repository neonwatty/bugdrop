export function createElementPicker(): Promise<Element | null> {
  return new Promise((resolve) => {
    // Create highlight overlay
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #0066ff;
      background: rgba(0, 102, 255, 0.1);
      z-index: 999998;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(highlight);

    // Instruction tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      z-index: 999999;
    `;
    tooltip.textContent = 'Click on any element to select it (ESC to cancel)';
    document.body.appendChild(tooltip);

    let currentElement: Element | null = null;

    function onMouseMove(e: MouseEvent) {
      const target = e.target as Element;

      // Ignore our own elements
      if (target === highlight || target === tooltip) return;
      if (target.closest('#feedback-widget-host')) return;

      currentElement = target;
      const rect = target.getBoundingClientRect();

      highlight.style.top = `${rect.top}px`;
      highlight.style.left = `${rect.left}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      resolve(currentElement);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }

    function cleanup() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
      highlight.remove();
      tooltip.remove();
      document.body.style.cursor = '';
    }

    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
  });
}
