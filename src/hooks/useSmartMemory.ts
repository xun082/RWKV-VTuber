import { useCallback } from "react";
import { db } from "../lib/db/index.ts";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

interface FilteredContent {
  content: string;
  isUseful: boolean;
  reason?: string;
}

/**
 * 智能记忆过滤Hook
 * 用于过滤对话中无意义的内容，提升记忆质量
 */
export function useSmartMemory() {
  /**
   * 过滤无意义的内容
   */
  const filterMeaninglessContent = useCallback(
    (content: string): FilteredContent => {
      const cleanContent = content.trim();

      // 检查是否为空或仅包含空白字符
      if (!cleanContent || cleanContent.length < 2) {
        return {
          content: cleanContent,
          isUseful: false,
          reason: "内容为空或过短",
        };
      }

      // 检查是否为纯表情符号或符号
      const emojiOnlyRegex =
        /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]*$/u;
      if (emojiOnlyRegex.test(cleanContent)) {
        return {
          content: cleanContent,
          isUseful: false,
          reason: "仅包含表情符号",
        };
      }

      // 检查是否为无意义的短语
      const meaninglessPatterns = [
        /^(嗯|啊|哦|呃|额|哈|哈哈|呵呵|嘿嘿|嘻嘻|哎|哎呀|喂|咦|咳|哼|嗯哼|是吗|真的吗|好的|ok|OK|对|不对|哇|靠|我去|不会吧|什么鬼)[\s\u{1F600}-\u{1F64F}]*$/u,
        /^[\?\？]+$/,
        /^[\.。…]+$/,
        /^[!！]+$/,
        /^[,，]+$/,
        /^[\s]*$/,
        /^你好[\s\u{1F600}-\u{1F64F}]*$/u,
        /^再见[\s\u{1F600}-\u{1F64F}]*$/u,
        /^谢谢[\s\u{1F600}-\u{1F64F}]*$/u,
        /^不客气[\s\u{1F600}-\u{1F64F}]*$/u,
      ];

      for (const pattern of meaninglessPatterns) {
        if (pattern.test(cleanContent)) {
          return {
            content: cleanContent,
            isUseful: false,
            reason: "内容过于简单或无意义",
          };
        }
      }

      // 检查是否包含有用的信息
      const usefulPatterns = [
        /[为什么|怎么|如何|什么是|怎样|为啥|咋|怎样]/,
        /[请|帮我|能否|可以|想要|希望|需要]/,
        /[学习|工作|生活|技术|编程|代码|问题|解决|方法]/,
        /[告诉我|介绍|解释|说明|描述|分析]/,
        /\w{5,}/, // 包含较长的单词或短语
      ];

      const hasUsefulContent = usefulPatterns.some((pattern) =>
        pattern.test(cleanContent)
      );

      // 如果内容较长且包含实质性信息，认为是有用的
      if (cleanContent.length >= 10 && hasUsefulContent) {
        return {
          content: cleanContent,
          isUseful: true,
        };
      }

      // 中等长度的内容，检查是否包含有意义的词汇
      if (cleanContent.length >= 5) {
        const meaningfulWords = cleanContent.match(
          /[\u4e00-\u9fa5]{2,}|[a-zA-Z]{3,}/g
        );
        if (meaningfulWords && meaningfulWords.length >= 2) {
          return {
            content: cleanContent,
            isUseful: true,
          };
        }
      }

      return {
        content: cleanContent,
        isUseful: false,
        reason: "内容缺乏实质性信息",
      };
    },
    []
  );

  /**
   * 过滤消息数组，移除无意义的内容
   */
  const filterMessages = useCallback(
    (messages: SimpleMessage[]): SimpleMessage[] => {
      return messages.filter((message) => {
        const filtered = filterMeaninglessContent(message.content);

        // 保留系统消息和有用的消息
        if (message.role === "system") {
          return true;
        }

        return filtered.isUseful;
      });
    },
    [filterMeaninglessContent]
  );

  /**
   * 智能选择上下文消息
   * 根据重要性和相关性选择最相关的历史消息
   */
  const selectContextMessages = useCallback(
    (
      messages: SimpleMessage[],
      currentQuery: string,
      maxMessages: number = 8
    ): SimpleMessage[] => {
      // 首先过滤掉无意义的消息
      const filteredMessages = filterMessages(messages);

      if (filteredMessages.length <= maxMessages) {
        return filteredMessages;
      }

      // 计算消息的重要性分数
      const scoredMessages = filteredMessages.map((message, index) => {
        let score = 0;

        // 时间权重 - 越新的消息分数越高
        const timeWeight = index / filteredMessages.length;
        score += timeWeight * 0.3;

        // 长度权重 - 较长的消息通常包含更多信息
        const lengthWeight = Math.min(message.content.length / 100, 1);
        score += lengthWeight * 0.2;

        // 相关性权重 - 与当前查询的相关性
        const currentQueryLower = currentQuery.toLowerCase();
        const messageLower = message.content.toLowerCase();
        const relevanceScore =
          currentQueryLower
            .split("")
            .filter((char) => messageLower.includes(char)).length /
          currentQueryLower.length;
        score += relevanceScore * 0.3;

        // 角色权重 - 用户消息和助手消息权重不同
        if (message.role === "user") {
          score += 0.1; // 用户的问题通常比较重要
        } else if (message.role === "assistant") {
          score += 0.1; // 助手的回答也很重要
        }

        return { message, score, index };
      });

      // 按分数排序并选择最高分的消息
      const topMessages = scoredMessages
        .sort((a, b) => b.score - a.score)
        .slice(0, maxMessages)
        .sort((a, b) => a.index - b.index) // 恢复时间顺序
        .map((item) => item.message);

      // 确保包含最近的几条消息以保持对话连续性
      const recentCount = Math.min(3, filteredMessages.length);
      const recentMessages = filteredMessages.slice(-recentCount);

      // 合并并去重
      const uniqueMessages = new Map<string, SimpleMessage>();

      [...topMessages, ...recentMessages].forEach((msg) => {
        uniqueMessages.set(msg.uuid, msg);
      });

      return Array.from(uniqueMessages.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-maxMessages);
    },
    [filterMessages]
  );

  /**
   * 生成智能摘要
   * 生成更有针对性的对话摘要
   */
  const generateSmartSummary = useCallback(
    async (
      messages: SimpleMessage[],
      chatApi: any,
      modelName: string
    ): Promise<string> => {
      const filteredMessages = filterMessages(messages);

      if (filteredMessages.length === 0) {
        return "空对话或无有效内容";
      }

      // 提取关键话题和实体
      const conversation = filteredMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const enhancedSummaryPrompt = `请为以下对话生成一个结构化的智能摘要，包括：

1. 主要话题和关键词
2. 用户的核心需求或问题
3. 助手提供的主要信息或建议
4. 对话中的重要细节和上下文

对话内容：
${conversation}

要求：
- 摘要应该简洁但全面
- 突出最重要的信息
- 保留有助于后续对话的上下文
- 过滤掉无关紧要的客套话`;

      try {
        const response = await chatApi.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的对话摘要助手，擅长提取对话中的关键信息和上下文。",
            },
            { role: "user", content: enhancedSummaryPrompt },
          ],
          temperature: 0.3, // 降低温度以获得更一致的摘要
          max_tokens: 300,
        });

        return response.choices[0]?.message?.content || conversation;
      } catch (error) {
        console.error("生成智能摘要失败:", error);
        return conversation;
      }
    },
    [filterMessages]
  );

  /**
   * 搜索相关记忆（增强版）
   */
  const searchRelevantMemories = useCallback(
    async (query: string, limit: number = 3) => {
      try {
        // 首先进行基础搜索
        const basicResults = await db.searchMemories(query, limit * 2);

        if (basicResults.length === 0) {
          return [];
        }

        // 对结果进行重新评分
        const queryLower = query.toLowerCase();
        const queryWords = queryLower
          .split(/\s+/)
          .filter((word) => word.length > 1);

        const scoredResults = basicResults.map((memory) => {
          let score = memory.importance || 0;

          // 计算关键词匹配度
          const contentLower = (
            memory.content +
            " " +
            memory.summary
          ).toLowerCase();
          const matchCount = queryWords.reduce((count, word) => {
            return count + (contentLower.includes(word) ? 1 : 0);
          }, 0);

          score += (matchCount / queryWords.length) * 10;

          // 时间衰减因子 - 较新的记忆权重更高
          const daysSinceCreation =
            (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
          score += Math.max(0, 5 - daysSinceCreation * 0.1);

          return { ...memory, score };
        });

        // 返回评分最高的记忆
        return scoredResults.sort((a, b) => b.score - a.score).slice(0, limit);
      } catch (error) {
        console.error("搜索相关记忆失败:", error);
        return [];
      }
    },
    []
  );

  return {
    filterMeaninglessContent,
    filterMessages,
    selectContextMessages,
    generateSmartSummary,
    searchRelevantMemories,
  };
}
