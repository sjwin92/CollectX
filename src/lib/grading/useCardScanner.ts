import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanFrameResult, StillMeasurement } from "./scanTypes";
import { analyzeFrame as analyzeFrameSync, measureStill as measureStillSync } from "./detectCard";

// Live analysis runs on a small frame; the still measurement gets more pixels.
const LIVE_WIDTH = 340;
const STILL_WIDTH = 900;
const CAPTURE_MAX_WIDTH = 1600; // what we actually send to the grader
const FRAME_INTERVAL_MS = 90; // ~11 fps analysis

interface PendingStill {
  resolve: (m: StillMeasurement) => void;
  reject: (e: unknown) => void;
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  canvas: HTMLCanvasElement,
): ImageData {
  const scale = Math.min(1, targetW / srcW);
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export function useCardScanner() {
  const workerRef = useRef<Worker | null>(null);
  const workerBrokenRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameAt = useRef(0);
  const analyzingRef = useRef(false);
  const msgId = useRef(0);
  const pendingStills = useRef<Map<number, PendingStill>>(new Map());
  const liveCanvas = useRef<HTMLCanvasElement | null>(null);
  const stillCanvas = useRef<HTMLCanvasElement | null>(null);

  const [frame, setFrame] = useState<ScanFrameResult | null>(null);
  const frameRef = useRef<ScanFrameResult | null>(null);

  // ── Worker lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    liveCanvas.current = document.createElement("canvas");
    stillCanvas.current = document.createElement("canvas");
    try {
      const worker = new Worker(new URL("./cardScanner.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (e: MessageEvent) => {
        const { type, id, result, error } = e.data ?? {};
        if (type === "frame") {
          analyzingRef.current = false;
          if (!error && result) {
            frameRef.current = result;
            setFrame(result);
          }
        } else if (type === "still") {
          const pending = pendingStills.current.get(id);
          if (pending) {
            pendingStills.current.delete(id);
            if (error) pending.reject(new Error(error));
            else pending.resolve(result);
          }
        }
      };
      worker.onerror = () => {
        workerBrokenRef.current = true;
      };
      workerRef.current = worker;
    } catch {
      workerBrokenRef.current = true;
    }

    const pending = pendingStills.current;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  // ── Per-frame pump ─────────────────────────────────────────────────────
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const video = videoRef.current;
    const canvas = liveCanvas.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    const now = performance.now();
    if (now - lastFrameAt.current < FRAME_INTERVAL_MS) return;
    if (analyzingRef.current) return;
    lastFrameAt.current = now;

    let imageData: ImageData;
    try {
      imageData = drawScaled(video, video.videoWidth, video.videoHeight, LIVE_WIDTH, canvas);
    } catch {
      return;
    }

    if (workerRef.current && !workerBrokenRef.current) {
      analyzingRef.current = true;
      const buf = imageData.data.buffer.slice(0);
      workerRef.current.postMessage(
        { type: "frame", id: msgId.current++, width: imageData.width, height: imageData.height, buffer: buf },
        [buf],
      );
    } else {
      // main-thread fallback
      try {
        const result = analyzeFrameSync(imageData.data, imageData.width, imageData.height);
        frameRef.current = result;
        setFrame(result);
      } catch {
        /* ignore a bad frame */
      }
    }
  }, []);

  const start = useCallback(
    (video: HTMLVideoElement) => {
      videoRef.current = video;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    videoRef.current = null;
  }, []);

  const runStill = useCallback((imageData: ImageData): Promise<StillMeasurement> => {
    if (workerRef.current && !workerBrokenRef.current) {
      return new Promise<StillMeasurement>((resolve, reject) => {
        const id = msgId.current++;
        pendingStills.current.set(id, { resolve, reject });
        const buf = imageData.data.buffer.slice(0);
        workerRef.current!.postMessage(
          { type: "still", id, width: imageData.width, height: imageData.height, buffer: buf },
          [buf],
        );
        setTimeout(() => {
          if (pendingStills.current.has(id)) {
            pendingStills.current.delete(id);
            reject(new Error("measure timed out"));
          }
        }, 8000);
      });
    }
    return Promise.resolve(measureStillSync(imageData.data, imageData.width, imageData.height));
  }, []);

  /** Grab the current video frame: returns a JPEG data URL + geometry measurement. */
  const captureFromVideo = useCallback(async (): Promise<{
    dataUrl: string;
    measurement: StillMeasurement | null;
  }> => {
    const video = videoRef.current;
    const canvas = stillCanvas.current;
    if (!video || !canvas || video.videoWidth === 0) {
      throw new Error("camera not ready");
    }
    // Full-quality JPEG for the grader.
    const capData = drawScaled(video, video.videoWidth, video.videoHeight, CAPTURE_MAX_WIDTH, canvas);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    // Separate, smaller pass for the geometry math.
    let measurement: StillMeasurement | null = null;
    try {
      const measData = drawScaled(video, video.videoWidth, video.videoHeight, STILL_WIDTH, canvas);
      measurement = await runStill(measData);
    } catch {
      measurement = null;
    }
    // leave the capture pixels on the canvas untouched for callers? no — re-draw
    void capData;
    return { dataUrl, measurement };
  }, [runStill]);

  /** Lean geometry-only measure of the current video frame (no JPEG encode). */
  const measureFromVideo = useCallback(async (): Promise<StillMeasurement | null> => {
    const video = videoRef.current;
    const canvas = stillCanvas.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    try {
      const data = drawScaled(video, video.videoWidth, video.videoHeight, STILL_WIDTH, canvas);
      return await runStill(data);
    } catch {
      return null;
    }
  }, [runStill]);

  /** Measure geometry from an already-captured data URL (upload path). */
  const measureDataUrl = useCallback(
    (dataUrl: string): Promise<StillMeasurement | null> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = stillCanvas.current;
          if (!canvas) return resolve(null);
          try {
            const data = drawScaled(img, img.naturalWidth, img.naturalHeight, STILL_WIDTH, canvas);
            resolve(await runStill(data));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      }),
    [runStill],
  );

  return { frame, frameRef, start, stop, captureFromVideo, measureFromVideo, measureDataUrl };
}
