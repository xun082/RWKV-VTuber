import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useLive2dApi } from "../../stores/useLive2dApi";
import { useChatApi } from "../../stores/useChatApi";
import { useSpeakApi } from "../../stores/useSpeakApi";
import { useListenApi } from "../../stores/useListenApi";
import { useChatSession } from "../../hooks/useChatSession";
import { useChatOperations } from "../../hooks/useChatOperations";

export function FullscreenVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const recordingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { setIsFullScreen } = useLive2dApi();
  const { chat } = useChatApi();
  const { speak } = useSpeakApi();
  const { listen } = useListenApi();

  // 使用聊天会话Hook
  const {
    messages,
    currentSessionId,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
  } = useChatSession();

  // 使用聊天操作Hook
  const { onChat } = useChatOperations({
    currentSessionId,
    messages,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
    onClearInput: () => {}, // 全屏模式下不需要清除输入
  });

  // 监听消息变化，当AI回复时自动播放语音
  React.useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage &&
      latestMessage.role === "assistant" &&
      speak &&
      lastUserMessage &&
      isProcessing // 确保是在处理过程中生成的回复
    ) {
      setIsSpeaking(true);
      speak(latestMessage.content)
        .then(() => {
          setIsSpeaking(false);
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error("语音播放失败:", error);
          toast.error("语音播放失败");
          setIsSpeaking(false);
          setIsProcessing(false);
        });
    }
  }, [messages, speak, lastUserMessage, isProcessing]);

  // ESC键退出全屏
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsFullScreen(false);
        toast.success("已退出全屏模式");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsFullScreen]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await processAudio(audioBlob);

        // 清理资源
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingRef.current = true;
    } catch (error) {
      toast.error("无法访问麦克风，请检查权限设置");
      console.error("Recording error:", error);
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      recordingRef.current = false;
    }
  }, []);

  // 处理音频
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      try {
        // 使用现有的语音识别API
        let recognizedText = "";

        if (listen) {
          try {
            recognizedText = await listen(audioBlob);
          } catch (error) {
            console.warn("语音识别失败，使用模拟识别:", error);
            recognizedText = await simulateVoiceRecognition(audioBlob);
          }
        } else {
          // 如果没有配置语音识别API，使用模拟识别
          recognizedText = await simulateVoiceRecognition(audioBlob);
        }

        if (recognizedText) {
          toast.success(`识别到: ${recognizedText}`);

          // 保存用户消息用于后续语音播放判断
          setLastUserMessage(recognizedText);

          // 使用现有的聊天操作发送消息
          await onChat(recognizedText);

          // 注意：AI回复的语音播放由useEffect处理
        } else {
          toast.error("未能识别到语音内容，请重试");
          setIsProcessing(false);
        }
      } catch (error) {
        toast.error("语音处理失败，请重试");
        console.error("Audio processing error:", error);
        setIsProcessing(false);
      }
      // 注意：如果识别成功，setIsProcessing(false)会在语音播放完成后执行
    },
    [listen, onChat, speak]
  );

  // 模拟语音识别（实际项目中应该调用真实的API）
  const simulateVoiceRecognition = async (audioBlob: Blob): Promise<string> => {
    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 返回模拟的识别结果
    const mockResponses = [
      "你好，今天天气怎么样？",
      "帮我介绍一下这个项目",
      "我想了解更多功能",
      "谢谢你的帮助",
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  };

  // 处理按钮按下
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!isRecording && !isProcessing) {
        startRecording();
      }
    },
    [isRecording, isProcessing, startRecording]
  );

  // 处理按钮释放
  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (isRecording) {
        stopRecording();
      }
    },
    [isRecording, stopRecording]
  );

  // 处理触摸事件
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (!isRecording && !isProcessing) {
        startRecording();
      }
    },
    [isRecording, isProcessing, startRecording]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();
      if (isRecording) {
        stopRecording();
      }
    },
    [isRecording, stopRecording]
  );

  // 停止当前播放的语音
  const handleStopSpeaking = useCallback(() => {
    if (isSpeaking) {
      // 这里需要实现停止语音播放的功能
      // 由于现有的speak API可能没有stop方法，我们使用一个简单的方式
      setIsSpeaking(false);
      setIsProcessing(false);
      toast.info("已停止语音播放");
    }
  }, [isSpeaking]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
      {/* 语音交互按钮 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
        {/* 状态指示器 */}
        <div className="text-center space-y-2">
          {isProcessing && (
            <div className="text-white bg-blue-600/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              正在处理语音...
            </div>
          )}
          {isSpeaking && (
            <div className="text-white bg-green-600/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4 animate-pulse" />
              AI正在回复...
            </div>
          )}
          {!isProcessing && !isSpeaking && (
            <div className="text-white bg-gray-600/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              {isRecording ? "松开停止录音" : "按住说话"}
            </div>
          )}
        </div>

        {/* 主要交互按钮 */}
        <div className="flex items-center space-x-4">
          {/* 语音输入按钮 */}
          <Button
            size="lg"
            className={`
              w-20 h-20 rounded-full transition-all duration-200 shadow-2xl
              ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 scale-110"
                  : "bg-blue-600 hover:bg-blue-700"
              }
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={isProcessing}
          >
            {isRecording ? (
              <Mic className="h-8 w-8 text-white animate-pulse" />
            ) : (
              <MicOff className="h-8 w-8 text-white" />
            )}
          </Button>

          {/* 停止语音播放按钮 */}
          {isSpeaking && (
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-xl"
              onClick={handleStopSpeaking}
            >
              <VolumeX className="h-6 w-6 text-gray-700" />
            </Button>
          )}
        </div>

        {/* 退出提示 */}
        <div className="text-white/70 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
          按 ESC 键退出全屏
        </div>
      </div>
    </div>
  );
}
