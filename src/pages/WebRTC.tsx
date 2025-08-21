import { useSearchParams } from "react-router-dom";
import { WebRTCReceiver } from "@/components/WebRTCReceiver";
import { WebRTCSender } from "@/components/WebRTCSender";
import { VideoFeed } from "@/components/VideoFeed";

const WebRTC = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const sessionId = searchParams.get('session') || Math.random().toString(36).substr(2, 9);

  // WebRTC phone-to-laptop streaming mode
  if (role === 'sender') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <WebRTCSender sessionId={sessionId} />
        </div>
      </div>
    );
  }

  if (role === 'receiver') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <WebRTCReceiver sessionId={sessionId} />
        </div>
      </div>
    );
  }

  // Default local camera mode (backwards compatibility)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-tech-gradient bg-clip-text text-transparent mb-2">
            Live Detection
          </h1>
          <p className="text-muted-foreground">
            Point your camera at objects to detect them
          </p>
        </div>
        
        <VideoFeed />
      </div>
    </div>
  );
};

export default WebRTC;