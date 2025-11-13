import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import {
  db,
  handleDatabaseError,
  initializeDatabase,
  isDatabaseReady,
} from "../lib/db/index.ts";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

interface ChatSessionState {
  messages: SimpleMessage[];
  currentSessionId: number | null;
  isInitialized: boolean;

  // Actions
  setMessages: (messages: SimpleMessage[]) => void;
  addMessage: (message: SimpleMessage) => void;
  updateLastMessage: (content: string) => void;
  saveMessage: (message: SimpleMessage) => Promise<void>;
  clearMessages: () => Promise<void>;
  initializeSession: () => Promise<void>;
  setCurrentSessionId: (sessionId: number | null) => void;
}

export const useChatSession = create<ChatSessionState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentSessionId: null,
      isInitialized: false,

      setMessages: (messages) => set({ messages }),

      addMessage: (message) => {
        console.log(
          "📝 添加消息到全局状态:",
          message.role,
          message.content.substring(0, 50)
        );
        set((state) => {
          const newMessages = [...state.messages, message];
          console.log(
            "📊 消息数量变化:",
            state.messages.length,
            "→",
            newMessages.length
          );
          return { messages: newMessages };
        });
      },

      updateLastMessage: (content) => {
        set((state) => {
          const newMessages = [...state.messages];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content,
            };
          }
          return { messages: newMessages };
        });
      },

      saveMessage: async (message) => {
        const { currentSessionId } = get();
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
      },

      clearMessages: async () => {
        const { currentSessionId } = get();
        
        // 清空界面显示
        console.log("🗑️ 清空界面显示的聊天记录");
        set({ messages: [] });
        
        // 标记会话已清除（不删除数据库消息，保留用于导出）
        if (currentSessionId && isDatabaseReady()) {
          try {
            await db.markSessionAsCleared(currentSessionId);
            console.log("✅ 会话已标记为已清除，所有消息仍保留在数据库中供导出");
          } catch (dbError) {
            console.error("标记会话清除失败:", dbError);
            const errorMessage = handleDatabaseError(dbError);
            toast.warning(`清除失败: ${errorMessage}`);
          }
        }
      },

      setCurrentSessionId: (sessionId) => {
        console.log("🔗 设置会话ID:", sessionId);
        set({ currentSessionId: sessionId });
      },

      initializeSession: async () => {
        try {
          console.log("开始初始化数据库和会话...");
          await initializeDatabase();

          if (!isDatabaseReady()) {
            throw new Error("数据库未能正确初始化");
          }

          let session = await db.getActiveSession();
          if (!session) {
            console.log("未找到活跃会话，创建新会话...");
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
            console.log(`会话初始化成功，ID: ${session.id}`);

            // 只加载未被清除的消息（已清除的消息仍保留在数据库中供导出）
            const dbMessages = await db.getSessionMessages(session.id, false);
            const simpleMessages: SimpleMessage[] = dbMessages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              uuid: msg.uuid,
            }));

            // 原子性更新所有状态
            set({
              currentSessionId: session.id,
              messages: simpleMessages,
              isInitialized: true,
            });

            console.log(`加载了 ${simpleMessages.length} 条历史消息（已清除的消息不显示）`);
          } else {
            throw new Error("会话对象无效");
          }
        } catch (error) {
          console.error("初始化失败:", error);
          const errorMessage = handleDatabaseError(error);
          toast.error(`数据库初始化失败: ${errorMessage}`);

          // 尝试重新初始化
          setTimeout(() => {
            console.log("尝试重新初始化...");
            get().initializeSession();
          }, 2000);
        }
      },
    }),
    {
      name: "chat-session",
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        // 不持久化 messages，每次从数据库加载
      }),
    }
  )
);
