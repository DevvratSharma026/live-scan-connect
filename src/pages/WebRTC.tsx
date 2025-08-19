import { VideoFeed } from "@/components/VideoFeed";

const WebRTC = () => {
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