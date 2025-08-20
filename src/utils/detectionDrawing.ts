import { Detection, DetectionMetrics } from './objectDetection';

// Generate distinct colors for different classes
const generateClassColors = (): { [key: number]: string } => {
  const colors: { [key: number]: string } = {};
  const hueStep = 137.5; // Golden angle for good color distribution
  
  return new Proxy(colors, {
    get(target, prop) {
      const classId = Number(prop);
      if (!(classId in target)) {
        const hue = (classId * hueStep) % 360;
        target[classId] = `hsl(${hue}, 70%, 50%)`;
      }
      return target[classId];
    }
  });
};

const classColors = generateClassColors();

export const drawDetections = (
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  canvasWidth: number,
  canvasHeight: number
): void => {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Set drawing properties
  ctx.lineWidth = 2;
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  
  detections.forEach((detection) => {
    const [xmin, ymin, xmax, ymax] = detection.bbox;
    const color = classColors[detection.classId];
    const label = `${detection.label} ${(detection.score * 100).toFixed(0)}%`;
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);
    
    // Measure text for background
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 18; // Approximate height for 14px font
    
    // Draw label background
    ctx.fillStyle = color;
    ctx.fillRect(xmin, ymin - textHeight - 4, textWidth + 8, textHeight + 4);
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, xmin + 4, ymin - textHeight);
  });
};

export const drawMetrics = (
  ctx: CanvasRenderingContext2D,
  metrics: DetectionMetrics,
  canvasWidth: number
): void => {
  const padding = 10;
  const lineHeight = 20;
  const fontSize = 14;
  
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'top';
  
  const metricsText = [
    `FPS: ${metrics.fps}`,
    `Latency: ${metrics.medianLatency.toFixed(0)}ms`,
    `Last: ${metrics.lastProcessingTime}ms`
  ];
  
  // Calculate background size
  const maxWidth = Math.max(...metricsText.map(text => ctx.measureText(text).width));
  const bgWidth = maxWidth + padding * 2;
  const bgHeight = metricsText.length * lineHeight + padding * 2;
  
  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padding, padding, bgWidth, bgHeight);
  
  // Draw metrics text
  ctx.fillStyle = 'white';
  metricsText.forEach((text, index) => {
    ctx.fillText(text, padding * 2, padding * 2 + index * lineHeight);
  });
};

export const drawLoadingIndicator = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  message: string = 'Loading model...'
): void => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw loading text
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvasWidth / 2, canvasHeight / 2);
  
  // Reset text alignment
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
};