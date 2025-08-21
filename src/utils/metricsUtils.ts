// Statistical utility functions for performance metrics

export interface MetricsSample {
  timestamp: number;
  latency: number;
  fps: number;
}

export interface PerformanceMetrics {
  currentFPS: number;
  medianLatency: number;
  p95Latency: number;
  totalFrames: number;
  samplesCollected: number;
}

export class MetricsCollector {
  private samples: MetricsSample[] = [];
  private frameCount = 0;
  private lastFPSTime = Date.now();
  private currentFPS = 0;
  private framesSinceLastSample = 0;
  private readonly maxSamples = 500;
  private readonly sampleInterval = 5; // Sample every 5 frames

  addFrame(latency: number): void {
    this.frameCount++;
    this.framesSinceLastSample++;

    // Update FPS calculation
    const now = Date.now();
    if (now - this.lastFPSTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSTime = now;
    }

    // Record sample every 5 frames
    if (this.framesSinceLastSample >= this.sampleInterval) {
      this.samples.push({
        timestamp: now,
        latency,
        fps: this.currentFPS
      });

      // Keep only the latest 500 samples
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }

      this.framesSinceLastSample = 0;
    }
  }

  getMetrics(): PerformanceMetrics {
    const latencies = this.samples.map(s => s.latency);
    
    return {
      currentFPS: this.currentFPS,
      medianLatency: this.calculateMedian(latencies),
      p95Latency: this.calculatePercentile(latencies, 95),
      totalFrames: this.samples.reduce((sum, s) => sum + s.fps, 0),
      samplesCollected: this.samples.length
    };
  }

  getSamples(): MetricsSample[] {
    return [...this.samples];
  }

  reset(): void {
    this.samples = [];
    this.frameCount = 0;
    this.currentFPS = 0;
    this.framesSinceLastSample = 0;
    this.lastFPSTime = Date.now();
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }
}

export const downloadMetricsAsJSON = (samples: MetricsSample[], filename = 'metrics.json'): void => {
  const data = {
    exportTime: new Date().toISOString(),
    totalSamples: samples.length,
    duration: samples.length > 0 ? samples[samples.length - 1].timestamp - samples[0].timestamp : 0,
    samples: samples.map(sample => ({
      timestamp: sample.timestamp,
      latency: sample.latency,
      fps: sample.fps
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};
