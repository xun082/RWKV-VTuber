import emojiReg from "emoji-regex";
import { useState } from "react";
import { flushSync } from "react-dom";
import {
  buildSystemPrompt,
  MEMORY_SYSTEM_PROMPT,
  MOTION_COMMAND_REGEX,
  SUMMARY_PROMPT_TEMPLATE,
  TEXT_SPLIT_REGEX,
} from "../lib/prompts.ts";
import { sleep, uuid } from "../lib/utils.ts";
import { useChatApi } from "../stores/useChatApi.ts";
import { useLive2dApi } from "../stores/useLive2dApi.ts";
import { useSpeakApi } from "../stores/useSpeakApi.ts";
import { useStates } from "../stores/useStates.ts";
import { db, isDatabaseReady } from "../lib/db/index.ts";
import { toast } from "sonner";
import { LoadingStates } from "../components/chat/LoadingIndicator.tsx";
import { useLive2dTextProcessor } from "./useLive2dTextProcessor.ts";
import { useSmartMemory } from "./useSmartMemory.ts";
import { useContextManager } from "./useContextManager.ts";

interface SimpleMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  uuid: string;
}

interface UseChatOperationsParams {
  currentSessionId: number | null;
  messages: SimpleMessage[];
  addMessage: (message: SimpleMessage) => void;
  updateLastMessage: (content: string) => void;
  saveMessage: (message: SimpleMessage) => void;
  clearMessages: () => void;
  setMessages: (messages: SimpleMessage[]) => void;
  onClearInput?: () => void;
}

export function useChatOperations({
  currentSessionId,
  messages,
  addMessage,
  updateLastMessage,
  saveMessage,
  clearMessages,
  setMessages,
  onClearInput,
}: UseChatOperationsParams) {
  const setDisabled = useStates((state) => state.setDisabled);
  const chat = useChatApi((state) => state.chat);
  const usedToken = useChatApi((state) => state.usedToken);
  const setUsedToken = useChatApi((state) => state.setUsedToken);
  const openaiModelName = useChatApi((state) => state.openaiModelName);
  const processAIResponse = useChatApi((state) => state.processAIResponse);
  const speak = useSpeakApi((state) => state.speak);
  const showTips = useLive2dApi((state) => state.showTips);
  const hideTips = useLive2dApi((state) => state.hideTips);
  const setTips = useLive2dApi((state) => state.setTips);
  const {
    processCharacterDisplay,
    processBatchCharacters,
    stopSpeech: stopLipSync,
  } = useLive2dTextProcessor();

  // 智能记忆和上下文管理
  const { generateSmartSummary } = useSmartMemory();
  const { buildOptimizedContext, analyzeConversationPattern } =
    useContextManager({
      maxHistoryMessages: 10,
      maxMemories: 5,
      enableSmartFiltering: true,
      contextWindow: 6000,
    });

  // 添加状态来跟踪上下文信息
  const [lastContextInfo, setLastContextInfo] = useState<
    | {
        messagesCount: number;
        memoriesCount: number;
        tokenEstimate: {
          total: number;
          history: number;
          memories: number;
          query: number;
        };
      }
    | undefined
  >(undefined);

  const [lastConversationPattern, setLastConversationPattern] = useState<
    | {
        type: string;
        description: string;
        messageCount: number;
      }
    | undefined
  >(undefined);

  const onChat = async (text: string) => {
    if (!currentSessionId) {
      toast.error("会话未初始化");
      return;
    }

    if (!isDatabaseReady()) {
      toast.error("数据库未准备就绪，请重新初始化");
      return;
    }

    const time = Date.now();
    const userMessage: SimpleMessage = {
      role: "user",
      content: text,
      timestamp: time,
      uuid: uuid(),
    };

    try {
      // 添加用户消息
      addMessage(userMessage);
      await saveMessage(userMessage);

      setTips("......");
      showTips();

      // 分析对话模式
      const conversationPattern = analyzeConversationPattern([
        ...messages,
        userMessage,
      ]);
      console.log("对话模式分析:", conversationPattern);

      // 构建优化的上下文
      const optimizedContext = await buildOptimizedContext(text, [
        ...messages,
        userMessage,
      ]);

      console.log("上下文优化结果:", {
        messagesCount: optimizedContext.messages.length,
        memoriesCount: optimizedContext.memories.length,
        tokenEstimate: optimizedContext.tokenEstimate,
      });

      // 更新状态以供UI显示
      setLastContextInfo({
        messagesCount: optimizedContext.messages.length,
        memoriesCount: optimizedContext.memories.length,
        tokenEstimate: optimizedContext.tokenEstimate,
      });

      setLastConversationPattern({
        type: conversationPattern.type,
        description: conversationPattern.description,
        messageCount: conversationPattern.messageCount,
      });

      // 构建系统提示
      const systemPrompt = buildSystemPrompt(optimizedContext.memories);

      // 构建消息数组 - 使用优化后的消息
      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...optimizedContext.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // 调用聊天API
      const response = await chat.chat.completions.create({
        model: openaiModelName,
        messages: chatMessages,
      });

      const assistantContent =
        response.choices[0]?.message?.content || "抱歉，我无法回应。";
      const tokens = response.usage?.total_tokens || 0;

      await setUsedToken(tokens);

      // Process motion commands first
      processAIResponse(assistantContent);

      // Remove motion commands from content for display and speech
      const cleanContent = assistantContent
        .replace(MOTION_COMMAND_REGEX, "")
        .trim();

      // 语音合成
      const emoji = emojiReg();
      const tts =
        typeof speak === "function"
          ? speak(cleanContent.replace(emoji, "")).then(({ audio }) =>
              db.addAudioCache({
                timestamp: time,
                audio: audio.buffer
                  ? (audio.buffer as unknown as ArrayBuffer)
                  : (audio as unknown as ArrayBuffer),
              })
            )
          : Promise.resolve();

      flushSync(() => setDisabled(LoadingStates.thinking));

      // 创建初始的助手消息
      const assistantMessage: SimpleMessage = {
        role: "assistant",
        content: "",
        timestamp: time,
        uuid: uuid(),
      };

      addMessage(assistantMessage);

      // 优化的逐字显示效果配合增强嘴型同步
      let current = "";
      let steps = "";
      const characters = cleanContent.split("");

      for (let i = 0; i < characters.length; i++) {
        const w = characters[i];
        current += w;
        updateLastMessage(current);

        // 使用增强的批量字符处理
        processBatchCharacters(characters, i, {
          smoothTransition: true,
        });

        await sleep(25); // 稍微加快速度

        if (w.match(TEXT_SPLIT_REGEX)) {
          setTips(steps + w);
          steps = "";
          // 句子结束时平滑过渡到静默
          processCharacterDisplay(" ", false, {
            previousChar: w,
            smoothTransition: true,
          });
          await sleep(800); // 减少停顿时间
        } else {
          steps += w;
          setTips(steps);
        }
      }

      // 文本显示完成，平滑停止嘴型
      processCharacterDisplay("", true, {
        previousChar: characters[characters.length - 1],
        smoothTransition: true,
      });

      hideTips(10);

      // 保存最终的助手消息
      const finalAssistantMessage: SimpleMessage = {
        role: "assistant",
        content: cleanContent,
        timestamp: time,
        uuid: assistantMessage.uuid,
      };

      await saveMessage(finalAssistantMessage);
      flushSync(() => setDisabled(LoadingStates.generating));
      await tts;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "未知错误");
      console.error("聊天失败:", error);
    } finally {
      // 确保在任何情况下都重置禁用状态
      flushSync(() => setDisabled(false));
    }
  };

  const updateMemory = async () => {
    if (messages.length === 0) {
      toast.warning("没有对话内容需要保存");
      return;
    }

    try {
      flushSync(() => setDisabled(LoadingStates.updating));

      // 分析对话模式以确定重要性
      const conversationPattern = analyzeConversationPattern(messages);

      // 使用智能摘要生成
      const smartSummary = await generateSmartSummary(
        messages,
        chat,
        openaiModelName
      );

      // 构建对话内容
      const conversation = messages
        .map((msg: SimpleMessage) => `${msg.role}: ${msg.content}`)
        .join("\n");

      // 计算重要性分数
      let importance = Math.min(messages.length, 10);

      // 根据对话模式调整重要性
      switch (conversationPattern.type) {
        case "help":
        case "explanation":
        case "tutorial":
          importance += 3; // 技术性对话更重要
          break;
        case "casual":
          importance = Math.max(1, importance - 2); // 闲聊重要性较低
          break;
      }

      // 根据平均消息长度调整重要性
      if (conversationPattern.avgMessageLength > 100) {
        importance += 2; // 较长的消息通常包含更多信息
      }

      importance = Math.min(importance, 15); // 最大重要性限制

      // 提取标签（简单的关键词提取）
      const tags = extractKeywords(conversation);

      console.log("保存记忆:", {
        importance,
        tags,
        pattern: conversationPattern.type,
        summaryLength: smartSummary.length,
      });

      // 保存记忆到IndexedDB
      await db.addMemory({
        content: conversation,
        summary: smartSummary,
        timestamp: Date.now(),
        importance,
        tags,
      });

      // 清空当前对话
      await clearMessages();
      toast.success(
        `记忆已保存 (重要性: ${importance}/15, 类型: ${conversationPattern.description})`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新记忆失败");
      console.error("更新记忆失败:", error);
    } finally {
      // 确保在任何情况下都重置禁用状态
      flushSync(() => setDisabled(false));
    }
  };

  // 简单的关键词提取函数
  const extractKeywords = (text: string): string[] => {
    const keywords: string[] = [];

    // 技术关键词
    const techKeywords = [
      "编程",
      "代码",
      "开发",
      "技术",
      "算法",
      "数据库",
      "前端",
      "后端",
      "JavaScript",
      "TypeScript",
      "React",
      "Vue",
      "Node.js",
      "Python",
      "问题",
      "错误",
      "调试",
      "优化",
      "性能",
      "安全",
      "测试",
    ];

    // 学习关键词
    const learningKeywords = [
      "学习",
      "教程",
      "指南",
      "方法",
      "技巧",
      "经验",
      "知识",
      "理解",
      "解释",
      "说明",
      "介绍",
      "概念",
      "原理",
      "步骤",
      "流程",
    ];

    // 工作生活关键词
    const lifeKeywords = [
      "工作",
      "生活",
      "健康",
      "运动",
      "饮食",
      "娱乐",
      "旅行",
      "兴趣",
      "计划",
      "目标",
      "建议",
      "推荐",
      "选择",
      "决定",
    ];

    const allKeywords = [...techKeywords, ...learningKeywords, ...lifeKeywords];

    for (const keyword of allKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    // 限制标签数量
    return keywords.slice(0, 5);
  };

  const clearChat = async () => {
    try {
      flushSync(() => setDisabled(LoadingStates.clearing));
      await clearMessages();
      await setUsedToken(undefined);
      onClearInput?.();
      toast.success("对话已清除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清除对话失败");
    } finally {
      // 确保在任何情况下都重置禁用状态
      flushSync(() => setDisabled(false));
    }
  };

  return {
    onChat,
    updateMemory,
    clearChat,
    usedToken,
    contextInfo: lastContextInfo,
    conversationPattern: lastConversationPattern,
  };
}
