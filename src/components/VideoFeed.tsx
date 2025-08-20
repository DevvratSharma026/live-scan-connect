import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ObjectDetector, Detection, DetectionMetrics } from "@/utils/objectDetection";
import { drawDetections, drawMetrics, drawLoadingIndicator } from "@/utils/detectionDrawing";

export const VideoFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [detector] = useState(() => new ObjectDetector());
  const [isDetectorLoading, setIsDetectorLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [metrics, setMetrics] = useState<DetectionMetrics>({
    fps: 0,
    medianLatency: 0,
    lastProcessingTime: 0
  });
  const { toast } = useToast();

  // Initialize detector when streaming starts
  useEffect(() => {
    if (isStreaming && !detector.isReady() && !detector.isInitializing()) {
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
  }, [isStreaming, detector, toast]);

  // Effect to handle pending stream when video element becomes available
  useEffect(() => {
    if (pendingStream && videoRef.current && !isStreaming) {
      console.log("Video element now available, setting up stream...");
      const video = videoRef.current;
      
      video.srcObject = pendingStream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      setStream(pendingStream);
      setPendingStream(null);
      
      const handleLoadedMetadata = () => {
        console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
        setIsStreaming(true);
        
        toast({
          title: "Camera Access Granted",
          description: "Live detection is now active",
          duration: 3000,
        });
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Try to play
      video.play().then(() => {
        console.log("Video play() succeeded");
      }).catch((error) => {
        console.error("Video play() failed:", error);
      });
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [pendingStream, isStreaming, toast]);

  const startCamera = async () => {
    try {
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use rear camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      console.log("Camera access granted, stream tracks:", mediaStream.getTracks().map(t => t.kind));
      console.log("Video ref available:", !!videoRef.current);
      
      if (videoRef.current) {
        console.log("Setting stream directly...");
        const video = videoRef.current;
        
        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        setStream(mediaStream);
        
        const handleLoadedMetadata = () => {
          console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
          setIsStreaming(true);
          
          toast({
            title: "Camera Access Granted",
            description: "Live detection is now active",
            duration: 3000,
          });
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        
        // Try to play
        video.play().then(() => {
          console.log("Video play() succeeded");
        }).catch((error) => {
          console.error("Video play() failed:", error);
        });
      } else {
        console.log("Video ref not available, storing stream for later...");
        setPendingStream(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use live detection",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopCamera = () => {
    console.log("Stopping camera...");
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setStream(null);
      setIsStreaming(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      toast({
        title: "Camera Stopped",
        description: "Camera has been turned off",
        duration: 2000,
      });
    }
  };

  // Process video frames for object detection
  useEffect(() => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

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
        
        // Draw metrics
        const newMetrics = detector.getMetrics();
        setMetrics(newMetrics);
        drawMetrics(ctx, newMetrics, canvas.width);
        
      } catch (error) {
        console.error('Frame processing error:', error);
        // Clear canvas on error
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const interval = setInterval(processFrame, 100); // Process at ~10 FPS
    return () => clearInterval(interval);
  }, [isStreaming, detector, isDetectorLoading]);

  return (
    <div className="w-full space-y-4">
      <div className="relative aspect-[4/3] bg-secondary rounded-2xl overflow-hidden border border-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          onError={(e) => {
            console.error("Video element error:", e);
            toast({
              title: "Video Error",
              description: "Error displaying video feed",
              variant: "destructive",
            });
          }}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${isStreaming ? 'block' : 'hidden'}`}
          style={{ background: "transparent" }}
        />
        {isStreaming && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center space-x-1 bg-primary/20 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs text-primary font-medium">LIVE</span>
            </div>
          </div>
        )}
        {!isStreaming && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Camera not active</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={isDetectorLoading}
          size="lg"
          className={`${
            isStreaming 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-tech-gradient hover:opacity-90"
          } transition-smooth min-w-[140px]`}
        >
          {isDetectorLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading AI...
            </>
          ) : isStreaming ? (
            <>
              <CameraOff className="w-5 h-5 mr-2" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              Start Camera
            </>
          )}
        </Button>
      </div>
      
      {detections.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Detected {detections.length} object{detections.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};