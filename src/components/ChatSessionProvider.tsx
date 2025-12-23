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
      initializeSession();
    }
  }, [initializeSession, isInitialized]);

  // 监控状态变化
  useEffect(() => {
  }, [isInitialized, currentSessionId]);

  return <>{children}</>;
}
