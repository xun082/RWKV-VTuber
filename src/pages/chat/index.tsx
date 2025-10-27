import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useAIMotionProcessor } from "../../hooks/useAIMotionProcessor.ts";
import { useChatOperations } from "../../hooks/useChatOperations.ts";
import { useChatSession } from "../../stores/useChatSession.ts";
import { useListenApi } from "../../stores/useListenApi.ts";
import { useStates } from "../../stores/useStates.ts";
import "../../styles/chat.css";

import { toast } from "sonner";
import { EmptyState, LoadingStates, MessageItem } from "../../components/chat";
import { PromptBox } from "../../components/chatgpt-prompt-input/";

export default function ChatPage() {
  const disabled = useStates((state) => state.disabled);
  const setDisabled = useStates((state) => state.setDisabled);

  useAIMotionProcessor();

  const listen = useListenApi((state) => state.listen);

  // 状态管理
  const [recognition, setRecognition] = useState<any | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [autoTTS, setAutoTTS] = useState<boolean>(true); // 自动TTS开关

  // 使用自定义Hooks
  const {
    messages,
    currentSessionId,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
  } = useChatSession();

  const { onChat, updateMemory, clearChat, usedToken } = useChatOperations({
    currentSessionId,
    messages,
    addMessage,
    updateLastMessage,
    saveMessage,
    clearMessages,
    setMessages,
    onClearInput: () => setInputValue(""),
    autoTTS, // 传递自动TTS状态
    isFullscreen: false, // 普通模式
  });

  const senderRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // 使用弹性布局撑满可见区域，无需 JS 计算高度

  return (
    <div className="w-full h-full grid place-items-center sm:p-4 md:p-6">
      <div className="w-full sm:max-w-6xl h-full sm:max-h-full sm:min-h-[640px] relative overflow-hidden bg-white/98 dark:bg-gray-900/98 sm:rounded-4xl sm:shadow-2xl sm:border sm:border-gray-200/40 dark:sm:border-gray-700/40 sm:backdrop-blur-2xl flex flex-col">
        {/* 头部区域 - 响应式优化 */}
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 border-b border-gray-100/60 dark:border-gray-800/60 bg-linear-to-br from-white/80 via-blue-50/50 to-indigo-50/40 dark:from-gray-900/80 dark:via-blue-950/40 dark:to-indigo-950/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-linear-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-xl shadow-blue-500/30 flex items-center justify-center ring-4 ring-blue-500/10 group-hover:ring-blue-500/20 transition-all duration-300">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/30 backdrop-blur-md flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-full border-[2.5px] sm:border-[3px] border-white dark:border-gray-900 shadow-lg">
                <div className="w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-gray-900 via-blue-700 to-indigo-700 dark:from-white dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
                智能助手
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                在线助手，随时为您服务
              </p>
            </div>
          </div>
        </div>

        {/* 聊天区域 - 优化背景和渐变 */}
        <div
          className={`flex-1 min-h-0 overflow-auto bg-linear-to-br from-gray-50/80 via-blue-50/60 to-indigo-50/80 dark:from-gray-800/80 dark:via-blue-950/50 dark:to-indigo-950/60 custom-scrollbar relative ${
            messages.length ? "flex flex-col" : "grid place-items-center"
          }`}
          ref={messagesRef}
        >
          {/* 优化背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none"></div>

          {messages.length ? (
            <div className="space-y-3 sm:space-y-4 relative z-10 px-4 sm:px-6 md:px-8 py-4 sm:py-6">
              {messages.map((msg, index: number) => (
                <MessageItem
                  key={`${msg.uuid}-${index}`}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="relative z-10">
              <EmptyState />
            </div>
          )}
        </div>

        {/* 输入区域 - 响应式优化 */}
        <div className="border-t border-gray-100/60 dark:border-gray-800/60 bg-linear-to-br from-white/90 via-gray-50/80 to-blue-50/60 dark:from-gray-900/90 dark:via-gray-850/80 dark:to-blue-950/40 backdrop-blur-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <PromptBox
            ref={senderRef}
            onSubmit={async () => {
              const text = inputValue.trim();
              if (!text) {
                toast.warning("请输入内容");
                return;
              }

              flushSync(() => setDisabled(LoadingStates.sending));

              setInputValue("");
              await onChat(text).catch(() => setInputValue(text));
              flushSync(() => setDisabled(false));
            }}
            disabled={disabled !== false}
            loading={disabled !== false}
            value={inputValue}
            onChange={(value: string) => {
              setInputValue(value);
            }}
            placeholder="按 Shift + Enter 发送消息"
            allowSpeech={
              listen
                ? {
                    recording: recognition !== null,
                    onRecordingChange: async (recording: boolean) => {
                      if (recording) {
                        toast.info("再次点击按钮结束说话");
                        const api = listen();
                        setRecognition(api);
                        api.start();
                        return;
                      }
                      try {
                        if (!recognition) {
                          throw new Error("语音识别未初始化");
                        }
                        recognition.stop();
                        const text = await recognition.result;
                        if (!text) {
                          throw new Error("未识别到任何文字");
                        }
                        setInputValue(text);
                      } catch (e) {
                        toast.warning(
                          e instanceof Error
                            ? e.message
                            : typeof e === "string"
                            ? e
                            : "未知错误"
                        );
                      } finally {
                        setRecognition(null);
                      }
                    },
                  }
                : undefined
            }
            chatActions={{
              disabled: disabled !== false,
              messagesLength: messages.length,
              usedToken: usedToken,
              onUpdateMemory: updateMemory,
              onClearChat: clearChat,
              autoTTS: autoTTS,
              onToggleAutoTTS: () => setAutoTTS(!autoTTS),
            }}
          />
        </div>
      </div>
    </div>
  );
}
