import { useRef } from "react";
import {
  type ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Outlet } from "react-router-dom";
import { useLive2dContainerWidth } from "../../hooks/useLive2dContainerWidth";
import { useResponsive } from "../../hooks/useResponsive";
import { useLive2dApi } from "../../stores/useLive2dApi";
import { FullscreenVoiceChat } from "../FullscreenVoiceChat";
import { Navigation } from "./Navigation";

export function DesktopLayout() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const { updateLive2dContainerWidth } = useLive2dContainerWidth(leftPanelRef);
  const { screenType, width } = useResponsive();
  const isFullScreen = useLive2dApi((state) => state.isFullScreen);

  // 小屏幕判断
  const isSmallScreen = width < 1024;

  // 根据屏幕类型动态调整面板比例 - 优化为更紧凑的布局
  const getPanelSizes = () => {
    switch (screenType) {
      case "tablet":
        return { left: 35, right: 65 }; // 平板时聊天区域更大
      case "desktop-sm":
        return { left: 35, right: 65 }; // 小桌面屏幕
      case "desktop-md":
        return { left: 38, right: 62 }; // 中等桌面屏幕
      case "desktop-lg":
        return { left: 40, right: 60 }; // 大桌面屏幕，保持聊天区域主导
      default:
        return { left: 35, right: 65 };
    }
  };

  const panelSizes = getPanelSizes();

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
      <PanelGroup
        direction="horizontal"
        className="h-full"
        autoSaveId="rwkv-vtuber-desktop-layout"
      >
        {/* 左侧 Live2D 区域 */}
        <Panel
          ref={leftPanelRef}
          defaultSize={panelSizes.left}
          minSize={20}
          maxSize={70}
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
          minSize={30}
          maxSize={80}
          className="bg-linear-to-br from-gray-50 to-gray-100 shrink-0 relative z-10"
        >
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
        </Panel>
      </PanelGroup>
    </main>
  );
}
