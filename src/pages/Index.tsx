import { WebRTCReceiver } from "@/components/WebRTCReceiver";
import { useState } from "react";

const Index = () => {
  // Generate a unique session ID for this laptop
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-tech-gradient bg-clip-text text-transparent mb-2">
            Live Object Detection
          </h1>
          <p className="text-muted-foreground">
            Scan the QR code with your phone to start streaming your camera
          </p>
        </div>
        
        <WebRTCReceiver sessionId={sessionId} />
      </div>
    </div>
  );
};

export default Index;