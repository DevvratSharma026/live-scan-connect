import { QRCodeJoin } from "@/components/QRCodeJoin";
import { Button } from "@/components/ui/button";
import { Smartphone, Scan } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const Index = () => {
  console.log("Index component rendering");
  const webrtcUrl = `${window.location.origin}/webrtc`;
  
  useEffect(() => {
    console.log("Index component mounted, Router context should be available");
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tech-gradient rounded-2xl shadow-scan-glow">
            <Scan className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold bg-tech-gradient bg-clip-text text-transparent mb-2">
              Scan to Start Live Detection
            </h1>
            <p className="text-muted-foreground">
              Use your phone's camera for real-time AI object detection
            </p>
          </div>
        </div>

        {/* QR Code */}
        <QRCodeJoin url={webrtcUrl} />

        {/* Alternative Access */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link to="/webrtc">
            <Button variant="outline" className="w-full">
              <Smartphone className="w-4 h-4 mr-2" />
              Open Camera Directly
            </Button>
          </Link>
        </div>

        {/* Instructions */}
        <div className="bg-card border border-video rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-sm">How it works:</h3>
          <ol className="text-xs text-muted-foreground space-y-1 text-left">
            <li>1. Scan the QR code with your phone</li>
            <li>2. Allow camera access when prompted</li>
            <li>3. Point your camera at objects to detect them</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Index;