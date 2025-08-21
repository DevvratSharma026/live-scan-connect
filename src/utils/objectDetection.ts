import * as ort from 'onnxruntime-web';
import { MetricsCollector, PerformanceMetrics, MetricsSample } from './metricsUtils';

export interface Detection {
  bbox: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
  score: number;
  classId: number;
  label: string;
}

export interface DetectionMetrics {
  fps: number;
  medianLatency: number;
  lastProcessingTime: number;
  p95Latency: number;
  samplesCollected: number;
}

export class ObjectDetector {
  private session: ort.InferenceSession | null = null;
  private labels: { [key: string]: string } = {};
  private isLoading = false;
  private metricsCollector = new MetricsCollector();
  private lastMetricsUpdate = Date.now();

  async initialize(): Promise<void> {
    if (this.isLoading || this.session) return;
    
    this.isLoading = true;
    console.log('Loading ONNX model and labels...');

    try {
      // Configure ONNX Runtime for WASM
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
      
      // Load model and labels in parallel
      const [session, config] = await Promise.all([
        ort.InferenceSession.create(
          'https://huggingface.co/onnx-community/yolov10n/resolve/main/onnx/model.onnx',
          { executionProviders: ['wasm'] }
        ),
        fetch('https://huggingface.co/onnx-community/yolov10n/resolve/main/config.json')
          .then(response => response.json())
      ]);

      this.session = session;
      this.labels = config.id2label || {};
      
      console.log('Model loaded successfully');
      console.log('Labels loaded:', Object.keys(this.labels).length, 'classes');
    } catch (error) {
      console.error('Failed to load model or labels:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const { width, height, data } = imageData;
    const targetSize = 640;
    
    // Calculate letterbox parameters
    const scale = Math.min(targetSize / width, targetSize / height);
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    const padX = (targetSize - scaledWidth) / 2;
    const padY = (targetSize - scaledHeight) / 2;

    // Create output tensor
    const input = new Float32Array(3 * targetSize * targetSize);
    
    // Resize and letterbox
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const srcX = Math.round((x - padX) / scale);
        const srcY = Math.round((y - padY) / scale);
        
        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          const dstIdx = y * targetSize + x;
          
          // Normalize to [0, 1] and convert BGR to RGB
          input[dstIdx] = data[srcIdx] / 255.0; // R
          input[targetSize * targetSize + dstIdx] = data[srcIdx + 1] / 255.0; // G
          input[targetSize * targetSize * 2 + dstIdx] = data[srcIdx + 2] / 255.0; // B
        }
      }
    }

    return new ort.Tensor('float32', input, [1, 3, targetSize, targetSize]);
  }

  private postprocessDetections(
    output: ort.Tensor,
    originalWidth: number,
    originalHeight: number,
    scoreThreshold = 0.4
  ): Detection[] {
    const targetSize = 640;
    const scale = Math.min(targetSize / originalWidth, targetSize / originalHeight);
    const padX = (targetSize - originalWidth * scale) / 2;
    const padY = (targetSize - originalHeight * scale) / 2;
    
    const detections: Detection[] = [];
    const data = output.data as Float32Array;
    
    // YOLOv10 output format: [batch, detections, 6] where 6 = [xmin, ymin, xmax, ymax, score, class_id]
    const numDetections = output.dims[1];
    
    for (let i = 0; i < numDetections; i++) {
      const offset = i * 6;
      const score = data[offset + 4];
      
      if (score >= scoreThreshold) {
        const classId = Math.round(data[offset + 5]);
        const label = this.labels[classId.toString()] || `Class ${classId}`;
        
        // Convert back to original image coordinates
        const xmin = (data[offset] - padX) / scale;
        const ymin = (data[offset + 1] - padY) / scale;
        const xmax = (data[offset + 2] - padX) / scale;
        const ymax = (data[offset + 3] - padY) / scale;
        
        detections.push({
          bbox: [
            Math.max(0, Math.min(xmin, originalWidth)),
            Math.max(0, Math.min(ymin, originalHeight)),
            Math.max(0, Math.min(xmax, originalWidth)),
            Math.max(0, Math.min(ymax, originalHeight))
          ],
          score,
          classId,
          label
        });
      }
    }
    
    return detections;
  }

  async detect(imageData: ImageData): Promise<Detection[]> {
    if (!this.session) {
      throw new Error('Model not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Preprocess
      const inputTensor = this.preprocessImage(imageData);
      
      // Run inference
      const outputs = await this.session.run({ images: inputTensor });
      const output = outputs[Object.keys(outputs)[0]] as ort.Tensor;
      
      // Postprocess
      const detections = this.postprocessDetections(
        output,
        imageData.width,
        imageData.height
      );
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metricsCollector.addFrame(processingTime);
      
      return detections;
    } catch (error) {
      console.error('Detection error:', error);
      return [];
    }
  }

  getMetrics(): DetectionMetrics {
    const perfMetrics = this.metricsCollector.getMetrics();
    return {
      fps: perfMetrics.currentFPS,
      medianLatency: perfMetrics.medianLatency,
      lastProcessingTime: 0, // Keep for backward compatibility
      p95Latency: perfMetrics.p95Latency,
      samplesCollected: perfMetrics.samplesCollected
    };
  }

  getMetricsSamples(): MetricsSample[] {
    return this.metricsCollector.getSamples();
  }

  resetMetrics(): void {
    this.metricsCollector.reset();
  }

  isReady(): boolean {
    return this.session !== null && !this.isLoading;
  }

  isInitializing(): boolean {
    return this.isLoading;
  }
}
