import { Toaster } from "@/components/ui/sonner";
import { ChatSessionProvider } from "./components/ChatSessionProvider";
import { DesktopLayout } from "./components/Layout/DesktopLayout";
import { useLive2dEffects } from "./hooks/useLive2dEffects";
import { useWelcomeMessage } from "./hooks/useWelcomeMessage";

export default function App() {
  // 初始化 Live2D 效果
  useLive2dEffects();

  // 初始化欢迎消息和数据迁移
  useWelcomeMessage();

  // 统一使用桌面布局，小屏幕自动适配
  return (
    <ChatSessionProvider>
      <DesktopLayout />
      <Toaster />
    </ChatSessionProvider>
  );
}
