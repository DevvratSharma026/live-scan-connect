import { useSearchParams } from "react-router-dom";
import { WebRTCReceiver } from "@/components/WebRTCReceiver";
import { WebRTCSender } from "@/components/WebRTCSender";
import { VideoFeed } from "@/components/VideoFeed";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-screen bg-background p-4">
        <div className="w-full max-w-6xl mx-auto">
          <WebRTCReceiver sessionId={sessionId} />
        </div>
      </div>
    );
  }

  // Default mode - show options for WebRTC streaming
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-tech-gradient bg-clip-text text-transparent">
            Live Object Detection
          </h1>
          <p className="text-muted-foreground text-lg">
            Stream from phone to laptop for real-time AI detection
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-6 border border-video space-y-4">
            <h2 className="text-xl font-semibold">📱 Phone Mode</h2>
            <p className="text-muted-foreground">
              Use your phone as a camera to stream video to your laptop
            </p>
            <Button 
              className="w-full bg-tech-gradient hover:opacity-90 transition-smooth"
              onClick={() => window.open(`/webrtc?role=sender&session=${sessionId}`, '_blank')}
            >
              Open Phone Camera
            </Button>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-video space-y-4">
            <h2 className="text-xl font-semibold">💻 Laptop Mode</h2>
            <p className="text-muted-foreground">
              Receive video stream and run AI object detection
            </p>
            <Button 
              className="w-full bg-tech-gradient hover:opacity-90 transition-smooth"
              onClick={() => window.location.href = `/webrtc?role=receiver&session=${sessionId}`}
            >
              Start Receiving
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">How it works:</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-2xl">1️⃣</div>
              <p>Open laptop mode to generate QR code</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">2️⃣</div>
              <p>Scan QR with phone to start streaming</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">3️⃣</div>
              <p>Watch real-time AI detection on laptop</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Or use <a href="/webrtc?local=true" className="text-primary hover:underline">local camera mode</a> for single-device detection
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebRTC;