import { Toaster } from "@/components/ui/sonner";
import { MobileLayout } from "./components/Layout/MobileLayout";
import { DesktopLayout } from "./components/Layout/DesktopLayout";
import { useIsMobile } from "./hooks/useIsMobile";
import { useLive2dEffects } from "./hooks/useLive2dEffects";
import { useWelcomeMessage } from "./hooks/useWelcomeMessage";

export default function App() {
  const isMobile = useIsMobile();

  // 初始化 Live2D 效果
  useLive2dEffects();

  // 初始化欢迎消息和数据迁移
  useWelcomeMessage();

  // 根据设备类型选择布局
  if (isMobile) {
    return (
      <>
        <MobileLayout />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <DesktopLayout />
      <Toaster />
    </>
  );
}
