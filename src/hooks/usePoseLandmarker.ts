import { useEffect, useRef, useState } from "react";
import type { Landmark } from "@/lib/measure/plankPose";

export interface PoseLandmarkerLike {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks?: Landmark[][] };
  close: () => void;
}

/** MediaPipe Pose Landmarker (lite) — model ve wasm kendi sunucumuzdan; bileşen açılınca bir kez yüklenir. */
export function usePoseLandmarker() {
  const ref = useRef<PoseLandmarkerLike | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const make = (delegate: "GPU" | "CPU") =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        let lm;
        try {
          lm = await make("GPU");
        } catch {
          lm = await make("CPU");
        }
        if (cancelled) {
          lm.close();
          return;
        }
        ref.current = lm as unknown as PoseLandmarkerLike;
        setState("ready");
      } catch (e) {
        console.error("Pose model load error:", e);
        if (!cancelled) {
          setState("error");
          setError("Yapay zekâ modeli yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
        }
      }
    })();
    return () => {
      cancelled = true;
      ref.current?.close();
      ref.current = null;
    };
  }, []);

  return { landmarker: ref, state, error };
}
