import { useCallback, useMemo } from "react";
import { useSmartMemory } from "./useSmartMemory.ts";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

interface ContextConfig {
  maxHistoryMessages: number;
  maxMemories: number;
  enableSmartFiltering: boolean;
  contextWindow: number; // 上下文窗口大小（token估算）
}

const DEFAULT_CONFIG: ContextConfig = {
  maxHistoryMessages: 8,
  maxMemories: 3,
  enableSmartFiltering: true,
  contextWindow: 4000, // 约4000 tokens
};

/**
 * 上下文管理Hook
 * 负责管理对话历史、记忆检索和上下文优化
 */
export function useContextManager(config: Partial<ContextConfig> = {}) {
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const { filterMessages, selectContextMessages, searchRelevantMemories } =
    useSmartMemory();

  /**
   * 估算文本的token数量（简单估算）
   */
  const estimateTokens = useCallback((text: string): number => {
    // 简单的token估算：中文字符约1个token，英文单词约0.75个token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const otherChars = text.length - chineseChars - englishWords;

    return Math.ceil(chineseChars + englishWords * 0.75 + otherChars * 0.5);
  }, []);

  /**
   * 智能截断消息以适应上下文窗口
   */
  const truncateToContextWindow = useCallback(
    (messages: SimpleMessage[], maxTokens: number): SimpleMessage[] => {
      let totalTokens = 0;
      const result: SimpleMessage[] = [];

      // 从最新的消息开始倒序计算
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const tokens = estimateTokens(message.content);

        if (totalTokens + tokens > maxTokens && result.length > 0) {
          // 如果添加这条消息会超出限制，但我们已经有一些消息了，就停止
          break;
        }

        totalTokens += tokens;
        result.unshift(message); // 插入到开头以保持时间顺序
      }

      return result;
    },
    [estimateTokens]
  );

  /**
   * 构建优化的上下文
   */
  const buildOptimizedContext = useCallback(
    async (
      currentQuery: string,
      historyMessages: SimpleMessage[],
      relevantMemories?: Array<{ summary: string; content: string }>
    ) => {
      // 1. 智能选择历史消息
      let contextMessages: SimpleMessage[] = [];

      if (finalConfig.enableSmartFiltering) {
        contextMessages = selectContextMessages(
          historyMessages,
          currentQuery,
          finalConfig.maxHistoryMessages
        );
      } else {
        // 简单截取最近的消息
        const filteredHistory = filterMessages(historyMessages);
        contextMessages = filteredHistory.slice(
          -finalConfig.maxHistoryMessages
        );
      }

      // 2. 获取相关记忆（如果没有提供）
      let memories = relevantMemories || [];
      if (!relevantMemories) {
        memories = await searchRelevantMemories(
          currentQuery,
          finalConfig.maxMemories
        );
      }

      // 3. 估算当前上下文的token使用量
      const memoryTokens = memories.reduce(
        (total, memory) => total + estimateTokens(memory.summary),
        0
      );

      const queryTokens = estimateTokens(currentQuery);
      const systemPromptTokens = 500; // 估算系统提示词的tokens

      const availableTokensForHistory =
        finalConfig.contextWindow -
        memoryTokens -
        queryTokens -
        systemPromptTokens -
        300; // 保留300作为缓冲

      // 4. 根据可用token调整历史消息
      if (availableTokensForHistory > 0) {
        contextMessages = truncateToContextWindow(
          contextMessages,
          availableTokensForHistory
        );
      } else {
        // 如果空间不够，优先保证最近的对话
        contextMessages = contextMessages.slice(-2);
      }

      return {
        messages: contextMessages,
        memories,
        tokenEstimate: {
          history: contextMessages.reduce(
            (total, msg) => total + estimateTokens(msg.content),
            0
          ),
          memories: memoryTokens,
          query: queryTokens,
          total:
            memoryTokens +
            queryTokens +
            systemPromptTokens +
            contextMessages.reduce(
              (total, msg) => total + estimateTokens(msg.content),
              0
            ),
        },
      };
    },
    [
      finalConfig,
      selectContextMessages,
      filterMessages,
      searchRelevantMemories,
      truncateToContextWindow,
      estimateTokens,
    ]
  );

  /**
   * 分析对话模式
   */
  const analyzeConversationPattern = useCallback(
    (messages: SimpleMessage[]) => {
      if (messages.length === 0) {
        return {
          type: "new",
          description: "新对话",
        };
      }

      const recentMessages = messages.slice(-6);
      const userMessages = recentMessages.filter((m) => m.role === "user");
      const assistantMessages = recentMessages.filter(
        (m) => m.role === "assistant"
      );

      // 分析对话类型
      let type = "general";
      let description = "一般对话";

      if (userMessages.length > 0) {
        const lastUserMessage =
          userMessages[userMessages.length - 1].content.toLowerCase();

        if (
          lastUserMessage.includes("问题") ||
          lastUserMessage.includes("帮助")
        ) {
          type = "help";
          description = "寻求帮助";
        } else if (
          lastUserMessage.includes("解释") ||
          lastUserMessage.includes("什么是")
        ) {
          type = "explanation";
          description = "请求解释";
        } else if (
          lastUserMessage.includes("如何") ||
          lastUserMessage.includes("怎么")
        ) {
          type = "tutorial";
          description = "教程指导";
        } else if (
          userMessages.length >= 3 &&
          userMessages.every((m) => m.content.length < 20)
        ) {
          type = "casual";
          description = "闲聊对话";
        }
      }

      return {
        type,
        description,
        messageCount: messages.length,
        recentUserQuestions: userMessages.length,
        avgMessageLength:
          messages.reduce((sum, m) => sum + m.content.length, 0) /
          messages.length,
      };
    },
    []
  );

  /**
   * 优化对话流
   */
  const optimizeConversationFlow = useCallback(
    (
      messages: SimpleMessage[],
      pattern: ReturnType<typeof analyzeConversationPattern>
    ): SimpleMessage[] => {
      // 根据对话模式调整消息选择策略
      let optimized = [...messages];

      switch (pattern.type) {
        case "casual":
          // 闲聊对话：保留最近的互动，过滤重复性内容
          optimized = messages.filter((msg, index) => {
            if (index < messages.length - 10) return false; // 只保留最近10条

            // 过滤重复的简单回应
            const content = msg.content.toLowerCase().trim();
            if (
              content.length < 5 &&
              ["好的", "是的", "嗯", "哈哈", "哦"].includes(content)
            ) {
              return false;
            }

            return true;
          });
          break;

        case "help":
        case "explanation":
        case "tutorial":
          // 技术性对话：保留问题和完整回答
          optimized = messages.filter((msg, index) => {
            // 保留所有用户问题
            if (msg.role === "user") return true;

            // 保留较长的助手回答（通常包含更多有用信息）
            if (msg.role === "assistant" && msg.content.length > 50)
              return true;

            // 保留最近的消息以维持对话连续性
            if (index >= messages.length - 5) return true;

            return false;
          });
          break;

        default:
          // 默认策略：智能过滤
          optimized = filterMessages(messages);
      }

      return optimized;
    },
    [filterMessages]
  );

  return {
    buildOptimizedContext,
    analyzeConversationPattern,
    optimizeConversationFlow,
    estimateTokens,
    config: finalConfig,
  };
}
