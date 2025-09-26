import { useEffect } from "react";
import { useChatSession } from "../stores/useChatSession";

export function ChatSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initializeSession, isInitialized, currentSessionId } =
    useChatSession();

  useEffect(() => {
    if (!isInitialized) {
      console.log("🚀 启动会话初始化...");
      initializeSession();
    }
  }, [initializeSession, isInitialized]);

  // 监控状态变化
  useEffect(() => {
    console.log("🔄 全局会话状态变化:", {
      isInitialized,
      currentSessionId,
    });
  }, [isInitialized, currentSessionId]);

  return <>{children}</>;
}
