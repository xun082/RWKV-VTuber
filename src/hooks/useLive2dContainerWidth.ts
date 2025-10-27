import { type RefObject, useEffect } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useIsMobile } from "./useIsMobile";

export function useLive2dContainerWidth(
  leftPanelRef: RefObject<ImperativePanelHandle | null>
) {
  const isMobile = useIsMobile();
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);

  // 更新 Live2D 容器宽度的函数
  const updateLive2dContainerWidth = () => {
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
      // 在桌面模式下，获取左侧面板的实际宽度
      const leftPanel = leftPanelRef.current;
      if (leftPanel) {
        const size = leftPanel.getSize();
        const leftWidth = `${size}%`;
        bg.style.width = leftWidth;
        l2d.style.width = leftWidth;
        // 确保容器不会裁剪内容
        bg.style.overflow = "visible";
        l2d.style.overflow = "visible";
        // 桌面模式下重置位置（由用户配置的位置会在useLive2dEffects中应用）
        bg.style.left = "0";
        // l2d的left由用户配置控制，这里不重置
      }
    }
  };

  // 布局调整 - 当模式切换时立即更新
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已更新
    const timer = setTimeout(() => {
      updateLive2dContainerWidth();
    }, 0);

    return () => clearTimeout(timer);
  }, [isMobile, isFullScreen]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      updateLive2dContainerWidth();
    };

    // 监听窗口resize事件
    window.addEventListener("resize", handleResize);

    // 初始化时也调用一次
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile, isFullScreen]);

  // 监听面板大小变化（仅桌面模式）
  useEffect(() => {
    if (isMobile || isFullScreen) return;

    const handleResize = () => {
      updateLive2dContainerWidth();
    };

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(handleResize);
    const targetNode = document.body;
    observer.observe(targetNode, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style"],
    });

    return () => {
      observer.disconnect();
    };
  }, [isMobile, isFullScreen]);

  return { updateLive2dContainerWidth };
}
