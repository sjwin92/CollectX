import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Upload } from "lucide-react";

interface CardCaptureStepProps {
  label: string;
  onCaptured: (base64: string) => void;
  onSkip?: () => void;
}

// Standard trading card is 2.5in x 3.5in — a 5:7 aspect ratio. The overlay
// guide below is sized to that ratio so lining the physical card up with it
// gives Ximilar a straight, filled-frame shot, which is what its docs say
// gives the most accurate corner/edge/centering read.
const CARD_ASPECT = 5 / 7;

const CardCaptureStep: React.FC<CardCaptureStepProps> = ({ label, onCaptured, onSkip }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.error('Camera unavailable, falling back to file upload:', err);
        setCameraError('Camera not available — use "Upload photo" instead.');
      }
    };

    startCamera();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const retake = () => setPreview(null);

  const confirm = () => {
    if (preview) onCaptured(preview);
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: CARD_ASPECT }}>
          <img src={preview} alt={`${label} preview`} className="w-full h-full object-contain bg-black" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={retake} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" /> Retake
          </Button>
          <Button onClick={confirm} className="flex-1">Use this photo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Line the card up with the guide — fill the frame, keep it flat and well-lit.
      </p>

      <div className="relative rounded-lg overflow-hidden bg-black" style={{ aspectRatio: CARD_ASPECT }}>
        {streamActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
            {cameraError ?? 'Starting camera…'}
          </div>
        )}

        {/* Alignment overlay: a card-shaped guide frame with corner markers,
            matching common grading-photo advice (fill the frame, square corners visible). */}
        <div className="pointer-events-none absolute inset-3 border-2 border-dashed border-white/70 rounded-md">
          {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4', 'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'].map((pos, i) => (
            <div key={i} className={`absolute w-6 h-6 border-primary ${pos}`} />
          ))}
        </div>
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {label}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

      <div className="flex gap-2">
        <Button onClick={capture} disabled={!streamActive} className="flex-1">
          <Camera className="mr-2 h-4 w-4" /> Capture
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Upload photo
        </Button>
      </div>

      {onSkip && (
        <Button variant="ghost" size="sm" onClick={onSkip} className="w-full">
          Skip — front only (less accurate)
        </Button>
      )}
    </div>
  );
};

export default CardCaptureStep;
