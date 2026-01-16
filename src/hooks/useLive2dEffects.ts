import { useEffect } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";

/**
 * Live2D 效果管理 - 简化版
 */
export function useLive2dEffects() {
  const setLive2dOpen = useLive2dApi((state) => state.setLive2dOpen);
  const background = useLive2dApi((state) => state.background);
  const live2dPositionY = useLive2dApi((state) => state.live2dPositionY);
  const live2dPositionX = useLive2dApi((state) => state.live2dPositionX);
  const live2dScale = useLive2dApi((state) => state.live2dScale);

  // 初始化 Live2D 模型
  useEffect(() => {
    setLive2dOpen(true);
    return () => {
      setLive2dOpen(false);
    };
  }, [setLive2dOpen]);

  // 设置背景图片
  useEffect(() => {
    const element = document.getElementById("back");
    if (element instanceof HTMLImageElement) {
      if (background.startsWith("data:")) {
        element.src = background;
      } else {
        element.src = `${background.split("?")[0]}?v=${Date.now()}`;
      }
    }
  }, [background]);

  // 调整模型位置和缩放
  useEffect(() => {
    const canvas = document.getElementById("live2d");
    if (!canvas) return;

    canvas.style.transform = `translate(${live2dPositionX}px, ${live2dPositionY}px) scale(${live2dScale})`;
    canvas.style.transformOrigin = "center center";

    return () => {
      canvas.style.transform = "translate(0, 0) scale(1)";
    };
  }, [live2dPositionX, live2dPositionY, live2dScale]);
}
