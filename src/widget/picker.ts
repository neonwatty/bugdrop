export function createElementPicker(): Promise<Element | null> {
  return new Promise((resolve) => {
    // Small delay to ensure any modal has been removed from the DOM
    setTimeout(() => {
      startPicker(resolve);
    }, 50);
  });
}

function startPicker(resolve: (element: Element | null) => void): void {
  // Create highlight overlay with higher z-index than modal (1000000)
  const highlight = document.createElement('div');
  highlight.id = 'feedback-element-picker-highlight';
  // Use teal color to match the widget theme
  highlight.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 3px solid #14b8a6;
    background: rgba(20, 184, 166, 0.15);
    z-index: 2147483646;
    transition: all 0.05s ease-out;
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.3);
    border-radius: 6px;
  `;
  document.body.appendChild(highlight);

  // Instruction tooltip with higher z-index
  const tooltip = document.createElement('div');
  tooltip.id = 'feedback-element-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    color: #f1f5f9;
    padding: 14px 28px;
    border-radius: 10px;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(34, 211, 238, 0.1);
    border: 1px solid #334155;
  `;
  tooltip.textContent = 'Click on any element to capture it (ESC to cancel)';
  document.body.appendChild(tooltip);

  let currentElement: Element | null = null;

  function onMouseMove(e: MouseEvent) {
    // Get the element under the cursor, ignoring our picker elements
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

    // Find the first element that's not our picker UI
    const target = elementsAtPoint.find((el) => {
      if (el === highlight || el === tooltip) return false;
      if (el.id === 'feedback-element-picker-highlight') return false;
      if (el.id === 'feedback-element-picker-tooltip') return false;
      if (el.closest('#feedback-widget-host')) return false;
      return true;
    });

    if (!target) return;

    currentElement = target;
    const rect = target.getBoundingClientRect();

    // Update highlight position with slight padding
    highlight.style.top = `${rect.top - 2}px`;
    highlight.style.left = `${rect.left - 2}px`;
    highlight.style.width = `${rect.width + 4}px`;
    highlight.style.height = `${rect.height + 4}px`;
    highlight.style.display = 'block';
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
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown);
    highlight.remove();
    tooltip.remove();
    document.body.style.cursor = '';
  }

  // Set cursor and start listening
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown);
}
