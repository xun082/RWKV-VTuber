import { useEffect, useRef } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";

const SWIPE_THRESHOLD = 30;
const TAP_MAX_DIST = 20;
const TAP_MAX_MS = 400;

/**
 * 在 Live2D 画布上绑定鼠标/触控：点击=Tap，上滑=FlickUp，下滑=FlickDown，左右滑=Flick
 */
export function useLive2dMouseControl() {
  const startRef = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
  } | null>(null);

  useEffect(() => {
    const canvas = document.getElementById("live2d");
    if (!canvas) return;

    const play = (group: string) => {
      useLive2dApi.getState().playMotion(group);
    };

    const onDown = (e: PointerEvent) => {
      if (startRef.current) return;
      startRef.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
      };
    };

    const onUp = (e: PointerEvent) => {
      const s = startRef.current;
      if (!s || s.id !== e.pointerId) return;
      startRef.current = null;

      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dt = Date.now() - s.t;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TAP_MAX_DIST && dt < TAP_MAX_MS) {
        play("Tap");
      } else if (dist >= SWIPE_THRESHOLD) {
        if (Math.abs(dy) > Math.abs(dx)) {
          play(dy < 0 ? "FlickUp" : "FlickDown");
        } else {
          play("Flick");
        }
      }
    };

    const onCancel = (e: PointerEvent) => {
      if (startRef.current?.id === e.pointerId) startRef.current = null;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
    };
  }, []);
}
