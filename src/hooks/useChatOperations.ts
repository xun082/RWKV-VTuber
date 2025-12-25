import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { LoadingStates } from "../components/chat/LoadingIndicator.tsx";
import { db, isDatabaseReady } from "../lib/db/index.ts";
import { MOTION_COMMAND_REGEX, buildSystemPrompt } from "../lib/prompts.ts";
import {
  enqueueAutoTtsTask,
  pauseCurrentAudio,
  resumeCurrentAudio,
  stopCurrentAudio,
  clearAutoTtsQueue,
} from "../lib/tts-utils.ts";
import { uuid } from "../lib/utils.ts";
import { useChatApi } from "../stores/useChatApi.ts";
import { useLive2dApi } from "../stores/useLive2dApi.ts";
import { useStates } from "../stores/useStates.ts";
import { useContextManager } from "./useContextManager.ts";
import { useLive2dTextProcessor } from "./useLive2dTextProcessor.ts";
import { useSmartMemory } from "./useSmartMemory.ts";
import { errorLogger } from "../lib/error-logger.ts";

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
  autoTTS?: boolean; // 自动TTS开关状态，可选
  isFullscreen?: boolean; // 是否为全屏模式
}

export function useChatOperations({
  currentSessionId,
  messages,
  addMessage,
  updateLastMessage,
  saveMessage,
  clearMessages,
  onClearInput,
  autoTTS = false,
  isFullscreen = false,
}: UseChatOperationsParams) {
  const setDisabled = useStates((state) => state.setDisabled);
  const ttsPlaybackState = useStates((state) => state.ttsPlaybackState);
  const setTtsPlaybackState = useStates((state) => state.setTtsPlaybackState);
  const setTtsActiveMessageId = useStates(
    (state) => state.setTtsActiveMessageId
  );
  const setTtsLoadingMessageId = useStates(
    (state) => state.setTtsLoadingMessageId
  );
  const chat = useChatApi((state) => state.chat);
  const usedToken = useChatApi((state) => state.usedToken);
  const setUsedToken = useChatApi((state) => state.setUsedToken);
  const modelName = useChatApi((state) => state.modelName);
  const processAIResponse = useChatApi((state) => state.processAIResponse);
  const getSystemPrompt = useChatApi((state) => state.getSystemPrompt);
  const loadKnowledgeBase = useChatApi((state) => state.loadKnowledgeBase);
  const showTips = useLive2dApi((state) => state.showTips);
  const hideTips = useLive2dApi((state) => state.hideTips);
  const setTips = useLive2dApi((state) => state.setTips);
  // Live2D文本处理器
  useLive2dTextProcessor();

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

  // 辅助函数：处理和清理 AI 响应内容
  const processAndCleanContent = (content: string): string => {
    processAIResponse(content);
    const cleaned = content.replace(MOTION_COMMAND_REGEX, "").trim();

    if (!cleaned) {
      return MOTION_COMMAND_REGEX.test(content)
        ? "*收到你的消息啦~* 😊"
        : "...";
    }

    return cleaned;
  };

  // 辅助函数：自动延迟隐藏提示
  const autoHideTips = (delay = 3000) => {
    setTimeout(hideTips, delay);
  };

  const onChat = async (text: string) => {
    if (!currentSessionId || !isDatabaseReady()) {
      toast.error("会话未准备就绪");
      return;
    }

    const time = Date.now();
    const userMessage: SimpleMessage = {
      role: "user",
      content: text,
      timestamp: time,
      uuid: uuid(),
    };

    let messagesToSend: SimpleMessage[] = [userMessage]; // 声明在外部作用域

    try {
      // 添加并保存用户消息
      addMessage(userMessage);
      await saveMessage(userMessage);

      setTips("......");
      showTips();

      // 构建优化的上下文
      const optimizedContext = await buildOptimizedContext(text, [
        ...messages,
        userMessage,
      ]);

      // 分析对话模式
      const conversationPattern = analyzeConversationPattern([
        ...messages,
        userMessage,
      ]);

      // 更新上下文信息供 UI 显示
      setLastContextInfo({
        messagesCount: optimizedContext.messages.length,
        memoriesCount: optimizedContext.memories.length,
        tokenEstimate: optimizedContext.tokenEstimate,
      });

      setLastConversationPattern({
        type: conversationPattern.type,
        description: conversationPattern.description,
        messageCount: conversationPattern.messageCount || 0,
      });

      loadKnowledgeBase();
      const knowledgeSystemPrompt = getSystemPrompt();
      const baseSystemPrompt = buildSystemPrompt();
      const systemPrompt = `${baseSystemPrompt} ${knowledgeSystemPrompt}`;

      // 构建消息数组：使用优化后的上下文，确保当前消息在最后
      messagesToSend =
        optimizedContext.messages.length > 0
          ? optimizedContext.messages.some(
              (msg) => msg.uuid === userMessage.uuid
            )
            ? optimizedContext.messages
            : [...optimizedContext.messages, userMessage]
          : [userMessage];
      console.log(systemPrompt);

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messagesToSend.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      if (isFullscreen) {
        // 全屏模式：收集完整响应后处理
        const stream = await chat(chatMessages);
        let assistantContent = "";

        for await (const chunk of stream) {
          assistantContent += chunk;
        }

        const cleanContent = processAndCleanContent(
          assistantContent || "抱歉，我无法回应。"
        );

        flushSync(() => setDisabled(LoadingStates.thinking));

        const assistantMessage: SimpleMessage = {
          role: "assistant",
          content: cleanContent,
          timestamp: time,
          uuid: uuid(),
        };

        addMessage(assistantMessage);
        setTips(cleanContent);
        autoHideTips();
        await saveMessage(assistantMessage);
      } else {
        // 普通模式：流式响应
        const stream = await chat(chatMessages);
        flushSync(() => setDisabled(LoadingStates.thinking));

        const assistantMessage: SimpleMessage = {
          role: "assistant",
          content: "",
          timestamp: time,
          uuid: uuid(),
        };

        addMessage(assistantMessage);

        // 流式处理响应
        let assistantContent = "";
        for await (const chunk of stream) {
          assistantContent += chunk;
          const displayContent = assistantContent
            .replace(MOTION_COMMAND_REGEX, "")
            .trim();
          updateLastMessage(displayContent);
          setTips(displayContent);
        }

        // 处理最终内容
        const finalContent = processAndCleanContent(assistantContent);
        updateLastMessage(finalContent);
        setTips(finalContent);

        if (autoTTS && finalContent && finalContent !== "...") {
          // 如果当前有暂停的音频，在开始新的自动TTS前清理掉
          // 这样可以确保新消息的语音能正常自动播放
          if (ttsPlaybackState === "paused") {
            stopCurrentAudio();
            clearAutoTtsQueue();
            setTtsPlaybackState("idle");
            setTtsActiveMessageId(null);
            setTtsLoadingMessageId(null);
          }

          enqueueAutoTtsTask(finalContent, time, {
            onGeneratingStart: () => {
              setTtsLoadingMessageId(assistantMessage.uuid);
            },
            onGeneratingEnd: () => {
              setTtsLoadingMessageId((current) =>
                current === assistantMessage.uuid ? null : current
              );
            },
            onPlayingStart: () => {
              setTtsPlaybackState("playing");
              setTtsActiveMessageId(assistantMessage.uuid);
            },
            onPlayingEnd: () => {
              setTtsPlaybackState("idle");
              setTtsActiveMessageId((current) =>
                current === assistantMessage.uuid ? null : current
              );
            },
          });
        }

        autoHideTips();

        await saveMessage({
          role: "assistant",
          content: finalContent,
          timestamp: time,
          uuid: assistantMessage.uuid,
        });

        flushSync(() => setDisabled(LoadingStates.generating));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("聊天失败:", errorMessage);

      errorLogger.logCustomError("AI 对话生成失败", {
        model: modelName || "unknown",
        operation: "ai_chat",
        mode: isFullscreen ? "fullscreen" : "normal",
        userMessage: text.substring(0, 100),
        error: errorMessage,
        contextSize: messagesToSend?.length || 0,
      });

      // 显示用户友好的错误信息
      const errorMsg = errorMessage.toLowerCase();
      if (errorMsg.includes("connection") || errorMsg.includes("network")) {
        toast.error("网络连接失败，请检查网络");
      } else if (errorMsg.includes("401") || errorMsg.includes("403")) {
        toast.error("服务暂时不可用，请稍后再试");
      } else {
        toast.error("抱歉，处理消息时出现问题");
      }
    } finally {
      flushSync(() => setDisabled(false));
    }
  };

  // 辅助函数：计算记忆重要性
  const calculateImportance = (pattern: any, messageCount: number): number => {
    let importance = Math.min(messageCount, 10);

    // 根据对话类型调整
    if (["help", "explanation", "tutorial"].includes(pattern.type)) {
      importance += 3;
    } else if (pattern.type === "casual") {
      importance = Math.max(1, importance - 2);
    }

    // 根据消息长度调整
    if (pattern.avgMessageLength > 100) {
      importance += 2;
    }

    return Math.min(importance, 15);
  };

  const updateMemory = async () => {
    if (messages.length === 0) {
      toast.warning("没有对话内容需要保存");
      return;
    }

    try {
      flushSync(() => setDisabled(LoadingStates.updating));

      const conversationPattern = analyzeConversationPattern(messages);
      const smartSummary = await generateSmartSummary(
        messages,
        chat,
        modelName
      );
      const conversation = messages
        .map((msg: SimpleMessage) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const importance = calculateImportance(
        conversationPattern,
        messages.length
      );
      const tags = getSimpleTags(conversationPattern.type);

      await db.addMemory({
        content: conversation,
        summary: smartSummary,
        timestamp: Date.now(),
        importance,
        tags,
      });

      await clearMessages();
      toast.success(
        `记忆已保存 (重要性: ${importance}/15, 类型: ${conversationPattern.description})`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新记忆失败");
      console.error("更新记忆失败:", error);
    } finally {
      flushSync(() => setDisabled(false));
    }
  };

  // 简化的标签生成 - 基于对话类型
  const getSimpleTags = (conversationType: string): string[] => {
    switch (conversationType) {
      case "help":
      case "explanation":
      case "tutorial":
        return ["技术讨论"];
      case "casual":
        return ["日常聊天"];
      default:
        return ["对话"];
    }
  };

  const clearChat = async () => {
    try {
      flushSync(() => setDisabled(LoadingStates.clearing));
      await Promise.all([clearMessages(), setUsedToken(-1)]);
      onClearInput?.();
      toast.success("对话已清除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清除对话失败");
    } finally {
      flushSync(() => setDisabled(false));
    }
  };

  // TTS 控制函数
  const handleTtsPause = () => {
    pauseCurrentAudio();
    setTtsPlaybackState("paused");
  };

  const handleTtsResume = async () => {
    setTtsPlaybackState("playing");
    try {
      await resumeCurrentAudio();
      // 播放结束后设置为idle
      setTtsPlaybackState("idle");
      setTtsActiveMessageId(null);
    } catch (err) {
      console.error("❌ 继续播放失败:", err);
      setTtsPlaybackState("idle");
      setTtsActiveMessageId(null);
    }
  };

  const handleTtsStop = () => {
    stopCurrentAudio();
    clearAutoTtsQueue(); // 清空队列，确保不会有旧任务继续播放
    setTtsPlaybackState("idle");
    setTtsActiveMessageId(null);
    setTtsLoadingMessageId(null); // 同时清除加载状态
  };

  return {
    onChat,
    updateMemory,
    clearChat,
    usedToken,
    contextInfo: lastContextInfo,
    conversationPattern: lastConversationPattern,
    ttsPlaybackState,
    handleTtsPause,
    handleTtsResume,
    handleTtsStop,
  };
}
