import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Upload, Check } from "lucide-react";
import { useCardScanner } from "@/lib/grading/useCardScanner";
import type { AlignHint, StillMeasurement } from "@/lib/grading/scanTypes";

interface CardCaptureStepProps {
  label: string;
  onCaptured: (base64: string, measurement: StillMeasurement | null) => void;
  onSkip?: () => void;
}

// Standard trading card is 2.5in x 3.5in — a 5:7 aspect ratio.
const CARD_ASPECT = 5 / 7;
const AUTO_CAPTURE_MS = 750;

const HINT_TEXT: Record<AlignHint, string> = {
  searching: "Point the camera at your card",
  "move-closer": "Move closer — fill the frame",
  "move-back": "Too close — pull back a little",
  straighten: "Straighten up — hold the card square to the camera",
  glare: "Glare on the card — tilt away from the light",
  "too-dark": "Too dark — find better light",
  "hold-steady": "Hold steady…",
  ready: "Hold steady — capturing…",
};

const CardCaptureStep: React.FC<CardCaptureStepProps> = ({ label, onCaptured, onSkip }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveCentering, setLiveCentering] = useState<StillMeasurement["centering"] | null>(null);

  const scanner = useCardScanner();
  const alignedSinceRef = useRef<number | null>(null);
  const capturedRef = useRef(false);
  const overlayRafRef = useRef<number | null>(null);
  const lastLiveMeasureRef = useRef(0);

  // ── Camera ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setStreamActive(true);
        }
      } catch (err) {
        console.error("Camera unavailable, falling back to file upload:", err);
        setCameraError('Camera not available — use "Upload photo" instead.');
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (streamActive && videoRef.current) scanner.start(videoRef.current);
    return () => scanner.stop();
  }, [streamActive, scanner]);

  const handleCapture = useCallback(async () => {
    if (capturedRef.current || busy) return;
    capturedRef.current = true;
    setBusy(true);
    try {
      const { dataUrl, measurement } = await scanner.captureFromVideo();
      onCaptured(dataUrl, measurement);
    } catch {
      capturedRef.current = false;
      setBusy(false);
    }
  }, [busy, onCaptured, scanner]);

  // ── Overlay render loop ────────────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      overlayRafRef.current = requestAnimationFrame(draw);
      const canvas = overlayRef.current;
      const wrap = wrapRef.current;
      const video = videoRef.current;
      const frame = scanner.frameRef.current;
      if (!canvas || !wrap || !video || video.videoWidth === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const dispW = wrap.clientWidth;
      const dispH = wrap.clientHeight;
      if (canvas.width !== dispW * dpr || canvas.height !== dispH * dpr) {
        canvas.width = dispW * dpr;
        canvas.height = dispH * dpr;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dispW, dispH);

      // object-cover mapping: analysis frame -> displayed pixels
      const vW = video.videoWidth;
      const vH = video.videoHeight;
      const scale = Math.max(dispW / vW, dispH / vH);
      const shownW = vW * scale;
      const shownH = vH * scale;
      const offX = (dispW - shownW) / 2;
      const offY = (dispH - shownH) / 2;

      // Static guide frame
      const gx = dispW * 0.06;
      const gy = dispH * 0.05;
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(gx, gy, dispW - gx * 2, dispH - gy * 2);
      ctx.setLineDash([]);

      if (frame?.quad) {
        const fx = (p: { x: number; y: number }) => offX + (p.x / frame.frameWidth) * shownW;
        const fy = (p: { x: number; y: number }) => offY + (p.y / frame.frameHeight) * shownH;
        const [tl, tr, br, bl] = frame.quad;
        const color = frame.aligned
          ? "rgba(52, 211, 153, 0.95)"
          : frame.hint === "glare" || frame.hint === "too-dark"
            ? "rgba(248, 113, 113, 0.9)"
            : "rgba(0, 212, 245, 0.9)";

        ctx.beginPath();
        ctx.moveTo(fx(tl), fy(tl));
        ctx.lineTo(fx(tr), fy(tr));
        ctx.lineTo(fx(br), fy(br));
        ctx.lineTo(fx(bl), fy(bl));
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = frame.aligned ? 3.5 : 2.5;
        ctx.stroke();
        if (frame.aligned) {
          ctx.fillStyle = "rgba(52, 211, 153, 0.12)";
          ctx.fill();
        }

        // corner ticks
        const corners = [tl, tr, br, bl];
        ctx.lineWidth = 4;
        for (const c of corners) {
          const cx = fx(c);
          const cy = fy(c);
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    };
    overlayRafRef.current = requestAnimationFrame(draw);
    return () => {
      if (overlayRafRef.current) cancelAnimationFrame(overlayRafRef.current);
    };
  }, [scanner]);

  // ── Auto-capture + live centering ─────────────────────────────────────
  useEffect(() => {
    const frame = scanner.frame;
    if (!frame || preview || busy) return;

    const now = performance.now();
    if (frame.aligned) {
      if (alignedSinceRef.current == null) alignedSinceRef.current = now;
      if (now - alignedSinceRef.current >= AUTO_CAPTURE_MS && !capturedRef.current) {
        handleCapture();
      }
      // sample a live centering read roughly twice a second while aligned
      if (now - lastLiveMeasureRef.current > 550) {
        lastLiveMeasureRef.current = now;
        scanner
          .measureFromVideo()
          .then((measurement) => {
            if (measurement?.centering) setLiveCentering(measurement.centering);
          })
          .catch(() => undefined);
      }
    } else {
      alignedSinceRef.current = null;
    }
  }, [scanner.frame, scanner, preview, busy, handleCapture]);

  // ── Upload fallback ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmUpload = async () => {
    if (!preview) return;
    setBusy(true);
    const measurement = await scanner.measureDataUrl(preview);
    onCaptured(preview, measurement);
  };

  const retake = () => {
    setPreview(null);
    setBusy(false);
    capturedRef.current = false;
    alignedSinceRef.current = null;
  };

  const manualCapture = () => handleCapture();

  // ── Preview (upload path only; camera path calls onCaptured directly) ──
  if (preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: CARD_ASPECT }}>
          <img src={preview} alt={`${label} preview`} className="w-full h-full object-contain bg-black" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={retake} className="flex-1" disabled={busy}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retake
          </Button>
          <Button onClick={confirmUpload} className="flex-1" disabled={busy}>
            {busy ? "Checking…" : "Use this photo"}
          </Button>
        </div>
      </div>
    );
  }

  const frame = scanner.frame;
  const hint = frame?.hint ?? "searching";

  const Dot = ({ ok, warn }: { ok: boolean; warn?: boolean }) => (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        ok ? "bg-emerald-400" : warn ? "bg-red-400" : "bg-amber-400"
      }`}
    />
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Line the card up inside the frame. The outline snaps to the edges and turns green when
        it's square, sharp and glare-free — then it captures automatically.
      </p>

      <div
        ref={wrapRef}
        className="relative rounded-lg overflow-hidden bg-black"
        style={{ aspectRatio: CARD_ASPECT }}
      >
        {streamActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
            {cameraError ?? "Starting camera…"}
          </div>
        )}

        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded bg-black/65 px-2 py-1 text-xs text-white">
          {label}
        </div>

        {streamActive && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[92%] rounded-full bg-black/70 px-3 py-1 text-center text-xs font-medium text-white">
            {HINT_TEXT[hint]}
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Diagnostics + live centering read */}
      {streamActive && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Dot ok={!!frame && frame.fill >= 0.55 && frame.fill <= 0.94} /> Fill
            </span>
            <span className="flex items-center gap-1">
              <Dot ok={!!frame && frame.skew <= 0.16} /> Square
            </span>
            <span className="flex items-center gap-1">
              <Dot ok={!!frame && frame.glare <= 0.02} warn={!!frame && frame.glare > 0.05} /> Glare
            </span>
            <span className="flex items-center gap-1">
              <Dot ok={!!frame && frame.sharpness >= 14} /> Focus
            </span>
          </div>
          {liveCentering && (
            <span className="font-medium text-foreground">
              Centering ≈ {liveCentering.lr} · {liveCentering.tb}
            </span>
          )}
        </div>
      )}

      <canvas className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex gap-2">
        <Button onClick={manualCapture} disabled={!streamActive || busy} className="flex-1">
          {frame?.aligned ? <Check className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
          Capture now
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {onSkip && (
        <Button variant="ghost" size="sm" onClick={onSkip} className="w-full" disabled={busy}>
          Skip — front only (less accurate)
        </Button>
      )}
    </div>
  );
};

export default CardCaptureStep;
