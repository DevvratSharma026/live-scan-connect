import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WebRTCConnection } from "@/utils/webrtcConnection";
import { ObjectDetector, Detection, DetectionMetrics } from "@/utils/objectDetection";
import { drawDetections, drawMetrics, drawLoadingIndicator } from "@/utils/detectionDrawing";
import { downloadMetricsAsJSON } from "@/utils/metricsUtils";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { QRCodeJoin } from "./QRCodeJoin";

interface WebRTCReceiverProps {
  sessionId: string;
}

export const WebRTCReceiver = ({ sessionId }: WebRTCReceiverProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connection, setConnection] = useState<WebRTCConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [detector] = useState(() => new ObjectDetector());
  const [isDetectorLoading, setIsDetectorLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [metrics, setMetrics] = useState<DetectionMetrics>({
    fps: 0,
    medianLatency: 0,
    lastProcessingTime: 0,
    p95Latency: 0,
    samplesCollected: 0
  });
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkTimeLeft, setBenchmarkTimeLeft] = useState(0);
  const { toast } = useToast();

  // Generate QR code URL for sender
  const senderUrl = `${window.location.origin}/webrtc?role=sender&session=${sessionId}`;

  useEffect(() => {
    const webrtcConnection = new WebRTCConnection(
      sessionId,
      'receiver',
      (stream) => {
        console.log('Received remote stream');
        setRemoteStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      },
      (state) => {
        setConnectionState(state);
        if (state === 'connected') {
          toast({
            title: "Connected",
            description: "Receiving live stream from phone",
            duration: 3000,
          });
        } else if (state === 'disconnected' || state === 'failed') {
          toast({
            title: "Connection Lost",
            description: "Stream from phone disconnected",
            variant: "destructive",
          });
        }
      }
    );

    webrtcConnection.startReceiver().catch((error) => {
      console.error('Error starting receiver:', error);
      toast({
        title: "Connection Error",
        description: "Failed to start WebRTC receiver",
        variant: "destructive",
      });
    });

    setConnection(webrtcConnection);

    return () => {
      webrtcConnection.disconnect();
    };
  }, [sessionId, toast]);

  // Initialize detector when we have a stream
  useEffect(() => {
    if (remoteStream && !detector.isReady() && !detector.isInitializing()) {
      setIsDetectorLoading(true);
      detector.initialize()
        .then(() => {
          console.log('Object detector initialized');
          toast({
            title: "AI Model Loaded",
            description: "Object detection is now active",
            duration: 3000,
          });
        })
        .catch((error) => {
          console.error('Failed to initialize detector:', error);
          toast({
            title: "Model Loading Failed",
            description: "Object detection unavailable",
            variant: "destructive",
            duration: 5000,
          });
        })
        .finally(() => {
          setIsDetectorLoading(false);
        });
    }
  }, [remoteStream, detector, toast]);

  const startBenchmark = () => {
    if (!remoteStream) {
      toast({
        title: "Stream Required",
        description: "Please connect phone stream before benchmarking",
        variant: "destructive",
      });
      return;
    }

    setIsBenchmarking(true);
    setBenchmarkTimeLeft(30);
    detector.resetMetrics();

    toast({
      title: "Benchmark Started",
      description: "Collecting performance data for 30 seconds...",
    });

    const countdownInterval = setInterval(() => {
      setBenchmarkTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          finishBenchmark();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishBenchmark = () => {
    setIsBenchmarking(false);
    setBenchmarkTimeLeft(0);

    const samples = detector.getMetricsSamples();
    if (samples.length > 0) {
      downloadMetricsAsJSON(samples, `webrtc-benchmark-${Date.now()}.json`);
      toast({
        title: "Benchmark Complete",
        description: `Collected ${samples.length} samples. Download started.`,
        duration: 5000,
      });
    } else {
      toast({
        title: "No Data Collected",
        description: "No performance samples were recorded.",
        variant: "destructive",
      });
    }
  };

  // Process video frames for object detection
  useEffect(() => {
    if (!remoteStream || !videoRef.current || !canvasRef.current) return;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.videoWidth === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Handle loading state
      if (isDetectorLoading || !detector.isReady()) {
        drawLoadingIndicator(
          ctx, 
          canvas.width, 
          canvas.height, 
          isDetectorLoading ? 'Loading AI model...' : 'Model not ready'
        );
        return;
      }

      try {
        // Create a temporary canvas to capture frame data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        tempCtx.drawImage(video, 0, 0);
        
        // Get image data for inference
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Run object detection
        const newDetections = await detector.detect(imageData);
        setDetections(newDetections);
        
        // Draw detections on overlay canvas
        drawDetections(ctx, newDetections, canvas.width, canvas.height);
        
        // Draw metrics (update display every second for performance)
        const now = Date.now();
        if (now - (window as any).lastMetricsUpdate > 1000 || !(window as any).lastMetricsUpdate) {
          const newMetrics = detector.getMetrics();
          setMetrics(newMetrics);
          (window as any).lastMetricsUpdate = now;
        }
        drawMetrics(ctx, metrics, canvas.width);
        
      } catch (error) {
        console.error('Frame processing error:', error);
        // Clear canvas on error
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const interval = setInterval(processFrame, 100); // Process at ~10 FPS
    return () => clearInterval(interval);
  }, [remoteStream, detector, isDetectorLoading, metrics]);

  return (
    <div className="w-full space-y-4">
      {!remoteStream ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">WebRTC Live Detection</h2>
            <p className="text-muted-foreground">
              Scan the QR code with your phone to start streaming
            </p>
          </div>
          
          <div className="flex justify-center">
            <QRCodeJoin url={senderUrl} />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-card rounded-full px-4 py-2 border">
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-green-500' : 
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {connectionState === 'connected' ? 'Connected' :
                 connectionState === 'connecting' ? 'Connecting...' :
                 'Waiting for connection'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative aspect-[4/3] bg-secondary rounded-2xl overflow-hidden border border-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Video element error:", e);
                toast({
                  title: "Video Error",
                  description: "Error displaying remote video feed",
                  variant: "destructive",
                });
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ background: "transparent" }}
            />
            <div className="absolute top-3 right-3">
              <div className="flex items-center space-x-1 bg-primary/20 backdrop-blur-sm rounded-full px-2 py-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs text-primary font-medium">LIVE</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={startBenchmark}
              disabled={!remoteStream || isDetectorLoading || isBenchmarking}
              size="lg"
              variant="outline"
              className="min-w-[160px] border-primary/20 hover:bg-primary/10"
            >
              {isBenchmarking ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {benchmarkTimeLeft}s left
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Benchmark (30s)
                </>
              )}
            </Button>
          </div>
          
          {detections.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Detected {detections.length} object{detections.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
};