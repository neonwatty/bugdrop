# Widget Implementation

## Overview

The widget is a self-contained JavaScript bundle that:
1. Renders a floating feedback button
2. Captures screenshots using html-to-image
3. Allows element selection with visual highlighting
4. Provides annotation tools (draw, arrow, highlight)
5. Submits feedback to the API

## Build Configuration

### Widget bundled as IIFE

The widget is bundled as an Immediately Invoked Function Expression (IIFE) so it can be loaded via a simple `<script>` tag.

```bash
# Build command
esbuild src/widget/index.ts \
  --bundle \
  --minify \
  --format=iife \
  --outfile=public/widget.js
```

### package.json script

```json
{
  "scripts": {
    "build:widget": "esbuild src/widget/index.ts --bundle --minify --format=iife --outfile=public/widget.js"
  }
}
```

## Widget Entry Point

### src/widget/index.ts

```typescript
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

  const shadow = host.attachShadow({ mode: 'closed' });

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
```

## Screenshot Capture

### src/widget/screenshot.ts

```typescript
// Load html-to-image dynamically to reduce initial bundle size
const HTML_TO_IMAGE_CDN = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';

let htmlToImage: typeof import('html-to-image') | null = null;

async function loadHtmlToImage() {
  if (htmlToImage) return htmlToImage;

  return new Promise<typeof import('html-to-image')>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML_TO_IMAGE_CDN;
    script.onload = () => {
      htmlToImage = (window as any).htmlToImage;
      resolve(htmlToImage!);
    };
    script.onerror = () => reject(new Error('Failed to load html-to-image'));
    document.head.appendChild(script);
  });
}

export async function captureScreenshot(element?: Element): Promise<string> {
  const lib = await loadHtmlToImage();

  const target = element || document.body;

  const dataUrl = await lib.toPng(target as HTMLElement, {
    cacheBust: true,
    pixelRatio: window.devicePixelRatio || 1,
    filter: (node: HTMLElement) => {
      // Exclude our widget from screenshot
      return node.id !== 'feedback-widget-host';
    },
  });

  return dataUrl;
}
```

## Element Picker

### src/widget/picker.ts

```typescript
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
```

## Canvas Annotator

### src/widget/annotator.ts

```typescript
type Tool = 'draw' | 'arrow' | 'rect' | 'text';

interface Point {
  x: number;
  y: number;
}

export function createAnnotator(
  container: HTMLElement,
  imageData: string
): {
  setTool: (tool: Tool) => void;
  undo: () => void;
  getImageData: () => string;
  destroy: () => void;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let currentTool: Tool = 'draw';
  let isDrawing = false;
  let points: Point[] = [];
  const history: ImageData[] = [];

  // Load image
  const img = new Image();
  img.onload = () => {
    // Scale to fit container
    const maxWidth = container.clientWidth || 600;
    const scale = Math.min(1, maxWidth / img.width);

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.style.maxWidth = '100%';
    canvas.style.cursor = 'crosshair';

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    // Save initial state
    saveState();
  };
  img.src = imageData;

  container.appendChild(canvas);

  // Drawing settings
  const color = '#ff0000';
  const lineWidth = 3;

  function saveState() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function getCanvasPoint(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function drawLine(from: Point, to: Point) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawArrow(from: Point, to: Point) {
    // Line
    drawLine(from, to);

    // Arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = 15;

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawRect(from: Point, to: Point) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  }

  // Event handlers
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    points = [getCanvasPoint(e)];
    saveState();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'draw') {
      drawLine(points[points.length - 1], point);
      points.push(point);
    } else {
      // Preview for arrow/rect
      ctx.putImageData(history[history.length - 1], 0, 0);

      if (currentTool === 'arrow') {
        drawArrow(points[0], point);
      } else if (currentTool === 'rect') {
        drawRect(points[0], point);
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    const point = getCanvasPoint(e);

    if (currentTool === 'arrow') {
      drawArrow(points[0], point);
    } else if (currentTool === 'rect') {
      drawRect(points[0], point);
    }

    points = [];
  });

  return {
    setTool(tool: Tool) {
      currentTool = tool;
    },

    undo() {
      if (history.length > 1) {
        history.pop();
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
    },

    getImageData(): string {
      return canvas.toDataURL('image/png');
    },

    destroy() {
      canvas.remove();
    },
  };
}
```

## UI Components

### src/widget/ui.ts

```typescript
import type { WidgetConfig } from './index';

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
```

## Usage

Users add this to their website:

```html
<script
  src="https://feedback-widget.example.com/widget.js"
  data-repo="owner/repo"
  data-position="bottom-right"
  data-theme="light">
</script>
```

That's it - one line, no npm install, no build step.
