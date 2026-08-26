/// <reference lib="webworker" />
// Runs the card-scan CV off the main thread so the camera preview never janks.
// Messages in:  { type: "frame" | "still", id, width, height, buffer }
// Messages out: { type: "frame", result } | { type: "still", result }

import { analyzeFrame, measureStill } from "./detectCard";

type InMsg = {
  type: "frame" | "still";
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
};

self.onmessage = (e: MessageEvent<InMsg>) => {
  const { type, id, width, height, buffer } = e.data;
  const data = new Uint8ClampedArray(buffer);
  try {
    if (type === "frame") {
      const result = analyzeFrame(data, width, height);
      (self as unknown as Worker).postMessage({ type: "frame", id, result });
    } else {
      const result = measureStill(data, width, height);
      (self as unknown as Worker).postMessage({ type: "still", id, result });
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
