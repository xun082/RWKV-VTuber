import { useRef } from "react";
import { Outlet } from "react-router-dom";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { Navigation } from "./Navigation";
import { FullscreenVoiceChat } from "../FullscreenVoiceChat";
import { useLive2dContainerWidth } from "../../hooks/useLive2dContainerWidth";
import { useResponsive } from "../../hooks/useResponsive";
import { useLive2dApi } from "../../stores/useLive2dApi";

export function DesktopLayout() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const { updateLive2dContainerWidth } = useLive2dContainerWidth(leftPanelRef);
  const { screenType } = useResponsive();
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);

  // 根据屏幕类型动态调整面板比例
  const getPanelSizes = () => {
    switch (screenType) {
      case "tablet":
        return { left: 50, right: 50 }; // 平板时平分
      case "desktop-sm":
        return { left: 55, right: 45 }; // 小桌面屏幕
      case "desktop-md":
        return { left: 60, right: 40 }; // 中等桌面屏幕
      case "desktop-lg":
        return { left: 65, right: 35 }; // 大桌面屏幕，Live2D区域更大
      default:
        return { left: 50, right: 50 };
    }
  };

  const panelSizes = getPanelSizes();

  if (isFullScreen) {
    return (
      <main className="w-dvw h-dvh overflow-hidden desktop-layout relative">
        {/* 全屏时的 Live2D 区域 */}
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

        {/* 全屏语音聊天界面 */}
        <FullscreenVoiceChat />
      </main>
    );
  }

  return (
    <main className="w-dvw h-dvh overflow-hidden desktop-layout">
      <PanelGroup direction="horizontal" className="h-full">
        {/* 左侧 Live2D 区域 */}
        <Panel
          ref={leftPanelRef}
          defaultSize={panelSizes.left}
          minSize={screenType === "tablet" ? 40 : 30}
          maxSize={screenType === "tablet" ? 70 : 80}
          className="relative overflow-visible"
          onResize={updateLive2dContainerWidth}
        >
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
        </Panel>

        {/* 拖拽手柄 */}
        <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-gray-400 transition-colors cursor-col-resize" />

        {/* 右侧控制面板 */}
        <Panel
          defaultSize={panelSizes.right}
          minSize={screenType === "tablet" ? 25 : 20}
          maxSize={screenType === "tablet" ? 65 : 75}
          className="bg-white flex-shrink-0 relative z-10"
        >
          <div className="w-full h-full overflow-hidden grid grid-rows-[1fr_auto]">
            <div
              className={`
                w-full h-full overflow-y-auto overflow-x-hidden flex flex-col
                transition-all duration-300 scroll-smooth
                ${
                  screenType === "tablet"
                    ? "px-3"
                    : screenType === "desktop-sm"
                    ? "px-4"
                    : "px-6"
                }
              `}
            >
              <div className="w-full h-full min-h-0 flex-1">
                <Outlet />
              </div>
            </div>
            <div className="flex-shrink-0">
              <Navigation />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </main>
  );
}
