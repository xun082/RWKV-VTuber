import { Button } from "@/components/ui/button";
import { Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatOperations } from "../../hooks/useChatOperations";
import { useChatSession } from "../../stores/useChatSession";
import { useListenApi } from "../../stores/useListenApi";
import { useLive2dApi } from "../../stores/useLive2dApi";
import { useLive2dTextProcessor } from "../../hooks/useLive2dTextProcessor";
import { speak_minimax } from "../../lib/api/shared/api.minimax-tts";

export function FullscreenVoiceChat() {
  const { setIsFullScreen } = useLive2dApi();
  const { processSentenceSync } = useLive2dTextProcessor();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const [currentRecognitionText, setCurrentRecognitionText] = useState("");

  const recognitionRef = useRef<any>(null);
  const lastMessageCountRef = useRef(0);
  const messageStabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false); // 取消标志位

  // 使用全局聊天会话状态
  const {
    messages,
    currentSessionId,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
    isInitialized,
  } = useChatSession();

  const { onChat } = useChatOperations({
    currentSessionId,
    messages,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
    autoTTS: false, // 全屏模式不使用自动TTS，有自己的语音处理
    isFullscreen: true, // 全屏模式
  });

  const { listen } = useListenApi();

  // 监控会话状态变化
  useEffect(() => {
    console.log("🔄 FullscreenVoiceChat 会话状态:", {
      isInitialized,
      currentSessionId,
      messagesCount: messages.length,
    });
  }, [isInitialized, currentSessionId, messages.length]);

  // 开始录音
  const startRecording = useCallback(async () => {
    if (!listen) {
      toast.error("语音识别服务未配置");
      return;
    }

    try {
      // 重置取消标志位
      isCancelledRef.current = false;
      // 清空之前的识别文本
      setCurrentRecognitionText("");

      setIsRecording(true);
      console.log("开始语音识别...");

      const recognition = listen((text: string) => {
        console.log("实时识别结果:", text);
        setCurrentRecognitionText(text);
      });

      recognitionRef.current = recognition;
      recognition.start();

      const result = await recognition.result;
      setIsRecording(false);
      // 清空实时显示的文本
      setCurrentRecognitionText("");

      // 检查是否已被取消
      if (isCancelledRef.current) {
        console.log("🚫 语音识别已被取消，不处理结果");
        return;
      }

      if (result && result.trim()) {
        console.log("最终识别结果:", result);
        await handleUserMessage(result);
      } else {
        toast.warning("未识别到语音内容，请重试");
      }
    } catch (error) {
      console.error("语音识别失败:", error);
      setIsRecording(false);
      setCurrentRecognitionText("");

      const errorMsg = error instanceof Error ? error.message : "未知错误";
      if (errorMsg.includes("not-allowed")) {
        toast.error("请允许麦克风权限");
      } else if (errorMsg.includes("network")) {
        toast.error("网络错误，请检查网络连接");
      } else {
        toast.error(`语音识别失败: ${errorMsg}`);
      }
    }
  }, [listen]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // 简单的语音播放消息
  const speakMessage = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true);
        console.log("开始语音合成:", text);

        // 同时启动Live2D口型同步
        processSentenceSync(text, {
          mode: "detailed",
          intensity: 0.9,
          speed: 75,
        });

        // 语音合成
        const result = await speak_minimax(text);

        if (result.audio.length > 0) {
          await playAudioData(result.audio);
        }

        setIsSpeaking(false);
      } catch (error) {
        console.error("语音合成失败:", error);
        setIsSpeaking(false);
        toast.error(
          `语音合成失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
    },
    [processSentenceSync]
  );

  // 监听消息变化，检测AI回复完成（现在是即时的）
  useEffect(() => {
    if (waitingForAI && messages.length >= lastMessageCountRef.current + 2) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.role === "assistant") {
        console.log("检测到AI回复完成:", {
          length: lastMessage.content.length,
          content: lastMessage.content.substring(0, 50) + "...",
        });

        // 检查是否已被取消
        if (isCancelledRef.current) {
          console.log("🚫 AI回复处理已被取消");
          setWaitingForAI(false);
          setIsProcessing(false);
          return;
        }

        // 清除之前的定时器
        if (messageStabilityTimerRef.current) {
          clearTimeout(messageStabilityTimerRef.current);
        }

        // AI回复现在是即时完成的，直接检查内容长度
        if (lastMessage.content && lastMessage.content.trim().length > 3) {
          console.log("AI回复已完成，准备语音同步显示:", lastMessage.content);
          setWaitingForAI(false);
          setIsProcessing(false);

          // 再次检查是否已被取消
          if (isCancelledRef.current) {
            console.log("🚫 语音合成已被取消");
            return;
          }

          // 确保这不是超时消息
          if (
            !lastMessage.content.includes("超时") &&
            !lastMessage.content.includes("抱歉")
          ) {
            // 开始语音合成
            speakMessage(lastMessage.content);
          } else {
            console.log("跳过超时或错误消息的语音合成");
          }
        } else {
          console.warn("AI回复内容太短:", lastMessage.content);
          setWaitingForAI(false);
          setIsProcessing(false);
        }
      }
    }
  }, [messages, waitingForAI, speakMessage]);

  // 处理用户消息
  const handleUserMessage = useCallback(
    async (message: string) => {
      try {
        // 检查是否已被取消
        if (isCancelledRef.current) {
          console.log("🚫 消息处理已被取消");
          return;
        }

        // 检查会话是否已初始化
        if (!currentSessionId) {
          toast.error("会话未初始化，请稍候重试");
          return;
        }

        console.log("🎤 用户说话:", message);
        console.log("📊 当前消息数量:", messages.length);
        console.log("🔗 会话ID:", currentSessionId);

        setIsProcessing(true);
        setWaitingForAI(true);

        // 记录当前消息数量（发送前）
        lastMessageCountRef.current = messages.length;

        // 发送消息给AI
        await onChat(message);

        // 检查是否在AI处理过程中被取消
        if (isCancelledRef.current) {
          console.log("🚫 AI处理过程中被取消");
          setWaitingForAI(false);
          setIsProcessing(false);
          return;
        }

        // 设置超时保护（不进行语音合成）
        setTimeout(() => {
          if (waitingForAI && !isCancelledRef.current) {
            console.warn("AI回复超时");
            setWaitingForAI(false);
            setIsProcessing(false);
            // 不对超时消息进行语音合成
          }
        }, 15000); // 增加到15秒超时
      } catch (error) {
        console.error("处理消息失败:", error);
        setIsProcessing(false);
        setWaitingForAI(false);
        toast.error("处理消息失败");
      }
    },
    [currentSessionId, onChat, messages, waitingForAI, speakMessage]
  );

  // 播放音频数据
  const playAudioData = useCallback(async (audioData: Uint8Array) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const blob = new Blob([new Uint8Array(audioData)], {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error("音频播放失败"));
        };

        audio.play();
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // 强制退出所有状态
  const forceExit = useCallback(() => {
    // 设置取消标志位
    isCancelledRef.current = true;

    // 停止录音
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // 清理定时器
    if (messageStabilityTimerRef.current) {
      clearTimeout(messageStabilityTimerRef.current);
    }

    // 重置所有状态
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setWaitingForAI(false);
    setCurrentRecognitionText("");

    // 退出全屏模式
    setIsFullScreen(false);

    console.log("🚫 强制退出全屏语音模式，取消所有处理");
  }, [setIsFullScreen]);

  // 按键事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC键强制退出（任何状态下都可以退出）
      if (event.key === "Escape") {
        event.preventDefault();
        forceExit();
        return;
      }

      // 空格键说话（只有在空闲状态才允许）
      if (
        event.code === "Space" &&
        !isRecording &&
        !isProcessing &&
        !isSpeaking
      ) {
        event.preventDefault();
        startRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRecording, isProcessing, isSpeaking, startRecording, forceExit]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 设置取消标志位
      isCancelledRef.current = true;

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (messageStabilityTimerRef.current) {
        clearTimeout(messageStabilityTimerRef.current);
      }
    };
  }, []);

  // 更新isActive的计算，加入会话状态
  const isActive =
    isRecording || isProcessing || isSpeaking || !currentSessionId;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* 状态指示器 - 右上角 */}
      {isActive && (
        <div className="absolute top-4 right-4 pointer-events-auto">
          <div className="flex items-center space-x-3">
            <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 text-white">
              {!currentSessionId && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">初始化中</span>
                </div>
              )}
              {currentSessionId && isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">正在聆听</span>
                </div>
              )}
              {currentSessionId && isProcessing && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">AI思考中</span>
                </div>
              )}
              {currentSessionId && isSpeaking && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">正在播放</span>
                </div>
              )}
            </div>

            {/* 强制退出按钮 */}
            <Button
              onClick={forceExit}
              className="bg-red-500/80 hover:bg-red-600 text-white border-0 w-8 h-8 rounded-full p-0"
              title="强制退出 (ESC)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 控制按钮 - 底部中央 */}
      {!isActive && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <Button
            onClick={startRecording}
            disabled={!currentSessionId}
            className={`text-white border-0 w-16 h-16 rounded-full shadow-lg ${
              currentSessionId
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-500 cursor-not-allowed"
            }`}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* 实时识别文本显示 */}
      {isRecording && currentRecognitionText && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 pointer-events-auto max-w-4xl w-full px-4">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-4 text-white text-center">
            <div className="text-sm text-gray-300 mb-2">正在识别...</div>
            <div className="text-lg font-medium leading-relaxed">
              {currentRecognitionText}
            </div>
          </div>
        </div>
      )}

      {/* 录音中的停止按钮 */}
      {isRecording && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <Button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white border-0 w-16 h-16 rounded-full shadow-lg animate-pulse"
          >
            <MicOff className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* 帮助提示 - 左下角 */}
      {!isActive && (
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 text-white text-xs">
            <p>空格键：开始说话</p>
            <p>ESC键：退出模式</p>
          </div>
        </div>
      )}
    </div>
  );
}
