import { useEffect, useState } from "react";
import {
  db,
  initializeDatabase,
  isDatabaseReady,
  handleDatabaseError,
} from "../lib/db/index.ts";
import { toast } from "sonner";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

export function useChatSession() {
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // 初始化数据库和会话
  useEffect(() => {
    const initDatabaseAndSession = async () => {
      try {
        await initializeDatabase();

        if (!isDatabaseReady()) {
          throw new Error("数据库未能正确初始化");
        }

        let session = await db.getActiveSession();
        if (!session) {
          const sessionId = await db.createSession("默认对话");
          session = {
            id: sessionId,
            name: "默认对话",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: 1,
          };
        }

        if (session?.id) {
          setCurrentSessionId(session.id);

          const dbMessages = await db.getSessionMessages(session.id);
          const simpleMessages: SimpleMessage[] = dbMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            uuid: msg.uuid,
          }));

          setMessages(simpleMessages);
        }
      } catch (error) {
        console.error("初始化失败:", error);
        const errorMessage = handleDatabaseError(error);
        toast.error(`数据库初始化失败: ${errorMessage}`);
      }
    };

    initDatabaseAndSession();
  }, []);

  const addMessage = (message: SimpleMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateLastMessage = (content: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          content,
        };
      }
      return newMessages;
    });
  };

  const saveMessage = async (message: SimpleMessage) => {
    if (currentSessionId && isDatabaseReady()) {
      try {
        await db.addMessage({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          uuid: message.uuid,
          sessionId: currentSessionId,
        });
      } catch (dbError) {
        console.error("保存消息失败:", dbError);
        const errorMessage = handleDatabaseError(dbError);
        toast.warning(`消息保存失败: ${errorMessage}`);
      }
    }
  };

  const clearMessages = async () => {
    setMessages([]);
    if (currentSessionId && isDatabaseReady()) {
      try {
        await db.clearSessionMessages(currentSessionId);
      } catch (dbError) {
        console.error("清除数据库消息失败:", dbError);
        const errorMessage = handleDatabaseError(dbError);
        toast.warning(`清除数据库失败: ${errorMessage}`);
      }
    }
  };

  return {
    messages,
    currentSessionId,
    setMessages,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
  };
}
