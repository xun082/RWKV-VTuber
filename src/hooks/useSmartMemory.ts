import { useCallback } from "react";
import { db } from "../lib/db/index.ts";
import type { ChatMessage } from "../stores/useChatApi.ts";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

/**
 * 智能记忆Hook
 * 用于管理对话记忆和上下文
 */
export function useSmartMemory() {
  /**
   * 选择上下文消息
   * 返回最近的消息作为上下文
   */
  const selectContextMessages = useCallback(
    (
      messages: SimpleMessage[],
      _currentQuery: string,
      maxMessages = 8
    ): SimpleMessage[] => {
      // 直接返回最近的消息
      return messages.slice(-maxMessages);
    },
    []
  );

  /**
   * 生成对话摘要
   */
  const generateSmartSummary = useCallback(
    async (
      messages: SimpleMessage[],
      chatApi: (messages: ChatMessage[]) => Promise<AsyncIterable<string>>,
      _modelName: string
    ): Promise<string> => {
      if (messages.length === 0) {
        return "空对话";
      }

      // 直接使用所有消息生成摘要
      const conversation = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const summaryPrompt = `请为以下对话生成一个简洁的摘要，包括：

1. 主要话题和关键词
2. 用户的核心需求或问题
3. 助手提供的主要信息或建议
4. 对话中的重要细节和上下文

对话内容：
${conversation}

要求：
- 摘要应该简洁但全面
- 突出最重要的信息
- 保留有助于后续对话的上下文`;

      try {
        const stream = await chatApi([
          {
            role: "system" as const,
            content:
              "你是一个专业的对话摘要助手，擅长提取对话中的关键信息和上下文。",
          },
          { role: "user" as const, content: summaryPrompt },
        ]);

        let summary = "";
        for await (const chunk of stream) {
          summary += chunk;
        }

        return summary || conversation;
      } catch (error) {
        console.error("生成摘要失败:", error);
        return conversation;
      }
    },
    []
  );

  /**
   * 搜索相关记忆
   */
  const searchRelevantMemories = useCallback(
    async (query: string, limit = 3) => {
      try {
        // 直接返回数据库搜索结果
        return await db.searchMemories(query, limit);
      } catch (error) {
        console.error("搜索相关记忆失败:", error);
        return [];
      }
    },
    []
  );

  return {
    selectContextMessages,
    generateSmartSummary,
    searchRelevantMemories,
  };
}
