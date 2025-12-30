import { Outlet } from "react-router-dom";
import { useLive2dContainerWidth } from "../../hooks/useLive2dContainerWidth";
import { useResponsive } from "../../hooks/useResponsive";
import { useLive2dApi } from "../../stores/useLive2dApi";
import { FullscreenVoiceChat } from "../FullscreenVoiceChat";
import { Navigation } from "./Navigation";

export function DesktopLayout() {
  useLive2dContainerWidth();
  const { width } = useResponsive();
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);

  // 小屏幕判断
  const isSmallScreen = width < 1024;

  // 全屏模式或小屏幕都强制显示全屏语音界面
  if (isFullScreen || isSmallScreen) {
    return (
      <main className="w-dvw h-dvh overflow-hidden relative">
        {/* Live2D 背景和模型容器 */}
        <div
          id="back-container"
          className="absolute inset-0 w-full h-full"
          style={{ width: "100dvw", height: "100dvh" }}
        />
        <div
          id="live2d-container"
          className="absolute inset-0 w-full h-full"
          style={{ width: "100dvw", height: "100dvh" }}
        />

        {/* 小屏幕强制全屏语音模式 */}
        <FullscreenVoiceChat />
      </main>
    );
  }

  return (
    <main className="w-dvw h-dvh overflow-hidden desktop-layout">
      <div className="flex h-full">
        {/* 左侧 Live2D 区域 - 固定 50% */}
        <div className="w-1/2 relative overflow-visible">
          <div
            id="back-container"
            className="w-full h-full"
            style={{ width: "100%" }}
          />
          <div
            id="live2d-container"
            className="absolute inset-0 w-full h-full"
            style={{ width: "100%" }}
          />
        </div>

        {/* 右侧控制面板 - 固定 50% */}
        <div className="w-1/2 bg-linear-to-br from-gray-50 to-gray-100 shrink-0 relative z-10">
          <div className="w-full h-full overflow-hidden grid grid-rows-[1fr_auto]">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col transition-all duration-300 scroll-smooth">
              <div className="w-full h-full min-h-0 flex-1">
                <Outlet />
              </div>
            </div>
            <div className="shrink-0">
              <Navigation />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
