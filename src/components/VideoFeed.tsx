import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Placeholder inference function - to be implemented with onnxruntime-web
const runInference = (frame: ImageData) => {
  // TODO: Implement ONNX model inference here
  console.log("Running inference on frame:", frame.width, "x", frame.height);
  return [];
};

export const VideoFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

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

      console.log("Camera access granted, setting up video...");
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Ensure video starts playing
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, starting playback...");
          videoRef.current?.play().then(() => {
            console.log("Video playback started successfully");
            setStream(mediaStream);
            setIsStreaming(true);
            
            toast({
              title: "Camera Access Granted",
              description: "Live detection is now active",
              duration: 3000,
            });
          }).catch((playError) => {
            console.error("Error starting video playback:", playError);
            toast({
              title: "Video Playback Error",
              description: "Could not start video playback",
              variant: "destructive",
              duration: 5000,
            });
          });
        };
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

  // Process video frames for inference
  useEffect(() => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas (hidden)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for inference
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Run inference (placeholder)
      const detections = runInference(imageData);
      
      // Clear canvas for overlay drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw bounding boxes (example - will be implemented with real detections)
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.font = "16px system-ui";
      ctx.fillStyle = "hsl(var(--primary))";
      
      // TODO: Draw actual detection boxes from ONNX model results
      // detections.forEach(detection => {
      //   ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);
      //   ctx.fillText(detection.label, detection.x, detection.y - 5);
      // });
    };

    const interval = setInterval(processFrame, 100); // Process at 10 FPS
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="w-full space-y-4">
      <div className="relative aspect-[4/3] bg-secondary rounded-2xl overflow-hidden border border-video">
        {isStreaming ? (
          <>
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
                  description: "Error displaying video feed",
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
          </>
        ) : (
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
          size="lg"
          className={`${
            isStreaming 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-tech-gradient hover:opacity-90"
          } transition-smooth`}
        >
          {isStreaming ? (
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
    </div>
  );
};