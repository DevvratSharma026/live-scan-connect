import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WebRTCConnection } from "@/utils/webrtcConnection";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Loader2 } from "lucide-react";

interface WebRTCSenderProps {
  sessionId: string;
}

export const WebRTCSender = ({ sessionId }: WebRTCSenderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connection, setConnection] = useState<WebRTCConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const webrtcConnection = new WebRTCConnection(
      sessionId,
      'sender',
      undefined, // Sender doesn't receive remote stream
      (state) => {
        setConnectionState(state);
        if (state === 'connected') {
          toast({
            title: "Connected",
            description: "Successfully streaming to laptop",
            duration: 3000,
          });
        } else if (state === 'disconnected' || state === 'failed') {
          toast({
            title: "Connection Lost",
            description: "Stream to laptop disconnected",
            variant: "destructive",
          });
        }
      }
    );

    setConnection(webrtcConnection);

    return () => {
      webrtcConnection.disconnect();
    };
  }, [sessionId, toast]);

  const startStreaming = async () => {
    if (!connection) return;

    setIsStarting(true);
    try {
      await connection.startSender();
      const stream = connection.getLocalStream();
      setLocalStream(stream);
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }

      toast({
        title: "Streaming Started",
        description: "Camera is now streaming to laptop",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera or start streaming",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopStreaming = () => {
    if (connection) {
      connection.disconnect();
      setLocalStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      toast({
        title: "Streaming Stopped",
        description: "Camera has been turned off",
        duration: 2000,
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-tech-gradient bg-clip-text text-transparent mb-2">
          Phone Camera
        </h1>
        <p className="text-muted-foreground">
          Stream your camera to the laptop for live detection
        </p>
      </div>

      <div className="relative aspect-[4/3] bg-secondary rounded-2xl overflow-hidden border border-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${localStream ? 'block' : 'hidden'}`}
          onError={(e) => {
            console.error("Video element error:", e);
            toast({
              title: "Video Error",
              description: "Error displaying camera feed",
              variant: "destructive",
            });
          }}
        />
        
        {localStream && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center space-x-1 bg-primary/20 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs text-primary font-medium">STREAMING</span>
            </div>
          </div>
        )}

        {!localStream && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Video className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Camera not active</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button
          onClick={localStream ? stopStreaming : startStreaming}
          disabled={isStarting}
          size="lg"
          className={`${
            localStream 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-tech-gradient hover:opacity-90"
          } transition-smooth min-w-[140px]`}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting...
            </>
          ) : localStream ? (
            <>
              <VideoOff className="w-5 h-5 mr-2" />
              Stop Stream
            </>
          ) : (
            <>
              <Video className="w-5 h-5 mr-2" />
              Start Stream
            </>
          )}
        </Button>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center space-x-2 bg-card rounded-full px-4 py-2 border">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' : 
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-gray-400'
          }`} />
          <span className="text-sm font-medium">
            {connectionState === 'connected' ? 'Connected to laptop' :
             connectionState === 'connecting' ? 'Connecting to laptop...' :
             localStream ? 'Waiting for laptop connection' : 'Not streaming'}
          </span>
        </div>
      </div>

      {connectionState === 'connected' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
          <p className="text-green-800 dark:text-green-200 font-medium">
            🎥 Successfully streaming to laptop
          </p>
          <p className="text-green-600 dark:text-green-300 text-sm mt-1">
            Your camera feed is being analyzed for object detection
          </p>
        </div>
      )}
    </div>
  );
};