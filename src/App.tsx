import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ChatSessionProvider } from "./components/ChatSessionProvider";
import { DesktopLayout } from "./components/Layout/DesktopLayout";
import { UpdateNotification } from "./components/UpdateNotification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLive2dEffects } from "./hooks/useLive2dEffects";
import { useWelcomeMessage } from "./hooks/useWelcomeMessage";
import { errorLogger } from "./lib/error-logger";
import "./lib/electron";

/**
 * RWKV-VTuber 主应用组件
 * 
 * 架构说明：
 * - 左右分栏布局：左侧 Live2D 展示，右侧功能控制
 * - 不支持移动端/小屏幕，专为桌面环境优化
 * - 使用 React Router 管理页面路由
 * - 集成错误边界、日志系统、自动更新等功能
 */
export default function App() {
  // 初始化错误日志系统
  useEffect(() => {
    errorLogger.init();
    return () => errorLogger.destroy();
  }, []);

  // 初始化 Live2D 模型和背景
  useLive2dEffects();

  // 初始化欢迎消息
  useWelcomeMessage();

  return (
    <ErrorBoundary>
      <ChatSessionProvider>
        {/* 左右分栏桌面布局 */}
        <DesktopLayout />
        
        {/* 全局通知组件 */}
        <UpdateNotification />
        <Toaster />
      </ChatSessionProvider>
    </ErrorBoundary>
  );
}
