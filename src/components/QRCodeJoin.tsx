import QRCode from "react-qr-code";

interface QRCodeJoinProps {
  url: string;
}

export const QRCodeJoin = ({ url }: QRCodeJoinProps) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-6 bg-card rounded-2xl shadow-scan-glow border border-video">
        <QRCode
          size={200}
          value={url}
          fgColor="hsl(var(--primary))"
          bgColor="hsl(var(--card))"
          level="M"
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Scan with your phone to access the camera
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {url}
        </p>
      </div>
    </div>
  );
};