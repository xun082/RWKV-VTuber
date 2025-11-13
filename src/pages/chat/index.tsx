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
    <div className="w-full h-full flex flex-col">
      <div className="w-full h-full relative overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
        {/* 头部区域 - 紧凑优化 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/30 bg-linear-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-md flex items-center justify-center transition-all duration-300 hover:shadow-lg">
                <div className="h-5 w-5 rounded-md bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                <div className="w-full h-full bg-emerald-400 rounded-full animate-ping opacity-60"></div>
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                AI 工具助手
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                在线助手，随时为您服务
              </p>
            </div>
          </div>
        </div>

        {/* 聊天区域 - 优化背景和渐变 */}
        <div
          className={`flex-1 min-h-0 overflow-auto bg-linear-to-b from-gray-50/50 via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 custom-scrollbar relative ${
            messages.length ? "flex flex-col" : "grid place-items-center"
          }`}
          ref={messagesRef}
        >
          {/* 优化背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>

          {messages.length ? (
            <div className="space-y-2.5 relative z-10 px-4 py-4">
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

        {/* 输入区域 - 紧凑优化 */}
        <div className="border-t border-gray-200/30 bg-linear-to-b from-white/95 to-gray-50/90 backdrop-blur-xl px-4 py-3">
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
                        const api = listen();
                        setRecognition(api);
                        api.start();
                        return;
                      }
                      try {
                        if (!recognition) {
                          return;
                        }
                        recognition.stop();
                        const text = await recognition.result;
                        if (text && text.trim()) {
                          setInputValue(text);
                        }
                      } catch (e) {
                        console.error("语音识别错误:", e);
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
