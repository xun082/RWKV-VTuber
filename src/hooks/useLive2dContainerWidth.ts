import { useCallback, useEffect } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useIsMobile } from "./useIsMobile";

export function useLive2dContainerWidth() {
  const isMobile = useIsMobile();
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);

  // 更新 Live2D 容器宽度的函数
  const updateLive2dContainerWidth = useCallback(() => {
    const bg = document.getElementById("back-container");
    const l2d = document.getElementById("live2d-container");

    if (!bg || !l2d) {
      console.error("容器加载失败");
      return;
    }

    if (isFullScreen || isMobile) {
      // 全屏模式或移动端都占满整个屏幕
      bg.style.width = "100dvw";
      l2d.style.width = "100dvw";
      bg.style.overflow = "visible";
      l2d.style.overflow = "visible";
      // 重置位置属性，确保全屏时从左上角开始
      bg.style.left = "0";
      l2d.style.left = "0";
      bg.style.top = "0";
      l2d.style.top = "0";
    } else {
      // 桌面模式下，左侧面板固定为 50%
      bg.style.width = "50%";
      l2d.style.width = "50%";
      // 确保容器不会裁剪内容
      bg.style.overflow = "visible";
      l2d.style.overflow = "visible";
      // 桌面模式下重置位置（由用户配置的位置会在useLive2dEffects中应用）
      bg.style.left = "0";
      // l2d的left由用户配置控制，这里不重置
    }
  }, [isMobile, isFullScreen]);

  // 布局调整 - 当模式切换时立即更新
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已更新
    const timer = setTimeout(() => {
      updateLive2dContainerWidth();
    }, 0);

    return () => clearTimeout(timer);
  }, [updateLive2dContainerWidth]);

  // 监听窗口大小变化
  useEffect(() => {
    // 监听窗口resize事件
    window.addEventListener("resize", updateLive2dContainerWidth);

    // 初始化时也调用一次
    updateLive2dContainerWidth();

    return () => {
      window.removeEventListener("resize", updateLive2dContainerWidth);
    };
  }, [updateLive2dContainerWidth]);

  return { updateLive2dContainerWidth };
}
