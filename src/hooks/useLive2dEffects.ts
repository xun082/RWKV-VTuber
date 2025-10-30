import { useEffect } from "react";
import { toast } from "sonner";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useIsMobile } from "./useIsMobile";

export function useLive2dEffects() {
  const isMobile = useIsMobile();

  const setLive2dOpen = useLive2dApi((state) => state.setLive2dOpen);
  const background = useLive2dApi((state) => state.background);
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);
  const live2dPositionY = useLive2dApi((state) => state.live2dPositionY);
  const live2dPositionX = useLive2dApi((state) => state.live2dPositionX);
  const live2dScale = useLive2dApi((state) => state.live2dScale);

  // 加载看板娘 - 移动端也显示
  useEffect(() => {
    setLive2dOpen(true);
    return () => {
      setLive2dOpen(false);
    };
  }, [setLive2dOpen]);

  // 调整看板娘位置 (Y) - 仅在桌面分屏模式下应用
  useEffect(() => {
    // 全屏或移动端不应用用户位置配置
    if (isFullScreen || isMobile) {
      return;
    }

    const container = document.getElementById("live2d-container");
    if (!container) {
      toast.error("Live2d容器加载失败");
      return;
    }
    if (live2dPositionY >= 0) {
      container.style.bottom = "unset";
      container.style.top = `${live2dPositionY}px`;
    } else {
      container.style.top = "unset";
      container.style.bottom = `${-live2dPositionY}px`;
    }

    const message = document.getElementById("live2d-message");
    if (!message) {
      toast.error("Live2d消息框加载失败");
      return;
    }
    const canvas = document.getElementById("live2d");
    if (!canvas) {
      toast.error("Live2d模型加载失败");
      return;
    }
    const messageTop = canvas.clientHeight * 0.05 + 10;
    message.style.top = `${messageTop}px`;

    return () => {
      message.style.top = "0";
      container.style.top = "0";
      container.style.bottom = "unset";
    };
  }, [live2dPositionY, isFullScreen, isMobile]);

  // 调整看板娘位置 (X) - 仅在桌面分屏模式下应用
  useEffect(() => {
    // 全屏或移动端不应用用户位置配置
    if (isFullScreen || isMobile) {
      return;
    }

    const container = document.getElementById("live2d-container");
    if (!container) {
      toast.error("Live2d容器加载失败");
      return;
    }
    container.style.left = `${live2dPositionX}px`;
    return () => {
      container.style.left = "0";
    };
  }, [live2dPositionX, isFullScreen, isMobile]);

  // 调整看板娘缩放 - 仅在桌面分屏模式下应用
  useEffect(() => {
    const canvas = document.getElementById("live2d");
    if (!canvas) {
      toast.error("Live2d模型加载失败");
      return;
    }
    
    // 确保canvas保持原始宽高比
    if (canvas instanceof HTMLCanvasElement) {
      // 让canvas保持原始尺寸比例
      canvas.style.width = 'auto';
      canvas.style.height = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
    }
    
    // 确保变换原点在中心，并添加智能缩放限制
    canvas.style.transformOrigin = "center center";

    // 全屏或移动端使用默认缩放，桌面使用用户配置
    const scale = isFullScreen || isMobile ? 1 : live2dScale;
    canvas.style.transform = `scale(${scale})`;

    // 当缩放过大时，调整容器以适应（仅桌面模式）
    const container = document.getElementById("live2d-container");
    if (container) {
      if (!isFullScreen && !isMobile && live2dScale > 1.5) {
        container.style.padding = `${Math.max(20, live2dScale * 30)}px`;
      } else {
        container.style.padding = "20px";
      }
    }

    return () => {
      canvas.style.transform = "scale(1)";
      canvas.style.transformOrigin = "center center";
      if (container) {
        container.style.padding = "20px";
      }
    };
  }, [live2dScale, isFullScreen, isMobile]);

  // 加载背景
  useEffect(() => {
    const element = document.getElementById("back");
    if (!(element instanceof HTMLImageElement)) {
      toast.error("背景图片加载失败");
      return;
    }
    element.src = background;
  }, [background]);

  return { isFullScreen, isMobile };
}
