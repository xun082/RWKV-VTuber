import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { LoadingStates } from "../components/chat/LoadingIndicator.tsx";
import { db, isDatabaseReady } from "../lib/db/index.ts";
import { MOTION_COMMAND_REGEX, buildSystemPrompt } from "../lib/prompts.ts";
import { generateTTSOnly, playAudioFromBuffer } from "../lib/tts-utils.ts";
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
      console.log("💬 添加用户消息:", userMessage);
      // 添加用户消息
      addMessage(userMessage);
      await saveMessage(userMessage);
      console.log("✅ 用户消息已保存到数据库");

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
        messageCount: conversationPattern.messageCount || 0,
      });

      // 加载最新的知识库
      loadKnowledgeBase();

      // 构建系统提示 - 结合知识库和记忆
      const baseSystemPrompt = buildSystemPrompt(optimizedContext.memories);
      const knowledgeSystemPrompt = getSystemPrompt();

      // 合并系统提示：知识库优先
      const systemPrompt = `${knowledgeSystemPrompt}\n\n${baseSystemPrompt}`;

      // 构建消息数组 - 确保包含当前用户消息
      let messagesToSend: SimpleMessage[] = [];

      if (optimizedContext.messages.length > 0) {
        // 使用优化后的上下文
        messagesToSend = optimizedContext.messages;

        // 确保当前用户消息在最后
        const hasCurrentMessage = messagesToSend.some(
          (msg) => msg.uuid === userMessage.uuid
        );

        if (!hasCurrentMessage) {
          console.warn("⚠️ 优化后的上下文不包含当前消息，强制添加");
          messagesToSend = [...messagesToSend, userMessage];
        }
      } else {
        // fallback：只发送当前消息
        console.warn("⚠️ 上下文优化失败，只发送当前消息");
        messagesToSend = [userMessage];
      }

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messagesToSend.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      if (isFullscreen) {
        // 全屏模式：使用非流式响应，确保语音播放
        console.log("🖥️ 全屏模式：收集完整响应");
        const stream = await chat(chatMessages);

        let assistantContent = "";
        for await (const chunk of stream) {
          assistantContent += chunk;
        }

        if (!assistantContent) {
          assistantContent = "抱歉，我无法回应。";
        }

        // Process motion commands first
        processAIResponse(assistantContent);

        // Remove motion commands from content for display and speech
        let cleanContent = assistantContent
          .replace(MOTION_COMMAND_REGEX, "")
          .trim();

        // 如果清理后内容为空，说明AI只返回了动作指令
        if (!cleanContent || cleanContent.length === 0) {
          const hasMotionCommands = MOTION_COMMAND_REGEX.test(assistantContent);
          if (hasMotionCommands) {
            cleanContent = "*收到你的消息啦~* 😊";
          } else {
            cleanContent = "...";
          }
        }

        flushSync(() => setDisabled(LoadingStates.thinking));

        // 创建并添加助手消息
        const assistantMessage: SimpleMessage = {
          role: "assistant",
          content: cleanContent,
          timestamp: time,
          uuid: uuid(),
        };

        addMessage(assistantMessage);
        setTips(cleanContent);

        // 短暂延迟后隐藏提示
        setTimeout(() => {
          hideTips();
        }, 3000);

        // 保存助手消息
        await saveMessage(assistantMessage);

        // 全屏模式不需要自动TTS，因为它有自己的语音处理逻辑
        console.log("✅ 全屏模式消息处理完成，等待语音处理");
      } else {
        // 普通模式：使用流式响应
        console.log("💬 普通模式：使用流式API");
        const stream = await chat(chatMessages);

        flushSync(() => setDisabled(LoadingStates.thinking));

        // 创建初始的助手消息
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

          // 实时更新显示内容（移除motion命令）
          const cleanContent = assistantContent
            .replace(MOTION_COMMAND_REGEX, "")
            .trim();

          updateLastMessage(cleanContent);
          setTips(cleanContent);
        }

        // Process motion commands
        processAIResponse(assistantContent);

        // 获取最终清理后的内容
        const finalCleanContent = assistantContent
          .replace(MOTION_COMMAND_REGEX, "")
          .trim();

        // 如果清理后内容为空，说明AI只返回了动作指令
        if (!finalCleanContent || finalCleanContent.length === 0) {
          const hasMotionCommands = MOTION_COMMAND_REGEX.test(assistantContent);
          const fallbackMessage = hasMotionCommands
            ? "*收到你的消息啦~* 😊"
            : "抱歉，我没有收到回复内容";
          updateLastMessage(fallbackMessage);
          setTips(fallbackMessage);
        } else {
          // 有正常内容，显示
          updateLastMessage(finalCleanContent);
          setTips(finalCleanContent);
        }

        // 获取要保存和播放的最终内容
        const contentToSave = finalCleanContent || "*收到你的消息啦~* 😊";

        // 自动TTS - 只在开启时执行且有实际内容时
        const tts =
          autoTTS && contentToSave && contentToSave !== "..."
            ? (async () => {
                try {
                  console.log("🔊 自动TTS已开启，开始生成和播放语音...");
                  const audioBuffer = await generateTTSOnly(
                    contentToSave,
                    time
                  );

                  if (audioBuffer) {
                    // 自动播放
                    await playAudioFromBuffer(audioBuffer);
                    console.log("✅ 自动TTS播放完成");
                  }
                } catch (error) {
                  console.error("❌ 自动TTS失败:", error);
                  // 自动播放失败时不显示错误提示，避免干扰用户
                }
              })()
            : Promise.resolve();

        // 短暂延迟后隐藏提示
        setTimeout(() => {
          hideTips();
        }, 3000);

        // 保存最终的助手消息
        const finalAssistantMessage: SimpleMessage = {
          role: "assistant",
          content: contentToSave,
          timestamp: time,
          uuid: assistantMessage.uuid,
        };

        await saveMessage(finalAssistantMessage);
        flushSync(() => setDisabled(LoadingStates.generating));
        await tts;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("聊天失败:", errorMessage);

      // 记录 AI 对话调用错误
      errorLogger.logCustomError("AI 对话生成失败", {
        model: modelName || "unknown",
        operation: "ai_chat",
        mode: isFullscreen ? "fullscreen" : "normal",
        userMessage: text.substring(0, 100), // 只记录前100个字符
        error: errorMessage,
        contextSize: messagesToSend?.length || 0,
      });

      // 显示错误信息（不暴露敏感信息）
      if (
        errorMessage.includes("Connection") ||
        errorMessage.includes("network")
      ) {
        toast.error("网络连接失败，请检查网络");
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        toast.error("服务暂时不可用，请稍后再试");
      } else {
        toast.error("抱歉，处理消息时出现问题");
      }
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
        modelName
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
      if (
        conversationPattern.avgMessageLength &&
        conversationPattern.avgMessageLength > 100
      ) {
        importance += 2; // 较长的消息通常包含更多信息
      }

      importance = Math.min(importance, 15); // 最大重要性限制

      // 提取标签 - 基于对话类型
      const tags = getSimpleTags(conversationPattern.type);

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
      await clearMessages();
      await setUsedToken(-1);
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
