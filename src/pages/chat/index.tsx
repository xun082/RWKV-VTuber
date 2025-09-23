import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useAIMotionProcessor } from "../../hooks/useAIMotionProcessor.ts";
import { useChatSession } from "../../hooks/useChatSession.ts";
import { useChatOperations } from "../../hooks/useChatOperations.ts";
import { useListenApi } from "../../stores/useListenApi.ts";
import { useStates } from "../../stores/useStates.ts";
import "../../styles/chat.css";

import { PromptBox } from "../../components/chatgpt-prompt-input/";
import { EmptyState, MessageItem, LoadingStates } from "../../components/chat";
import { toast } from "sonner";

export default function ChatPage() {
  const disabled = useStates((state) => state.disabled);
  const setDisabled = useStates((state) => state.setDisabled);

  useAIMotionProcessor();

  const listen = useListenApi((state) => state.listen);

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
  });

  const [recognition, setRecognition] = useState<any | null>(null);
  const [inputValue, setInputValue] = useState<string>("");

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
    <div className="w-full h-full grid place-items-center p-2 sm:p-4 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/20">
      <div className="w-full max-w-5xl max-h-full min-h-[520px] sm:min-h-[640px] relative overflow-hidden bg-white/98 dark:bg-gray-900/98 rounded-3xl shadow-xl border border-white/60 dark:border-gray-700/60 backdrop-blur-2xl flex flex-col">
        {/* 头部区域 */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100/80 dark:border-gray-800/80 bg-gradient-to-r from-white/50 to-blue-50/30 dark:from-gray-900/50 dark:to-blue-900/20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/25 flex items-center justify-center ring-2 ring-white/20">
                <div className="h-7 w-7 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                <div className="w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 dark:from-white dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                智能助手
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                在线助手，随时为您服务
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 border border-blue-200/60 dark:border-blue-700/60 shadow-sm">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Token: {usedToken}
              </span>
            </div>
          </div>
        </div>

        {/* 聊天区域 */}
        <div
          className={`flex-1 min-h-0 overflow-auto bg-gradient-to-br from-slate-50/60 via-blue-50/40 to-indigo-50/60 dark:from-gray-800/60 dark:via-blue-900/30 dark:to-indigo-900/40 custom-scrollbar relative ${
            messages.length ? "flex flex-col" : "grid place-items-center"
          }`}
          ref={messagesRef}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none"></div>
          {messages.length ? (
            <div className="space-y-4 sm:space-y-5 relative z-10 p-4 sm:p-6">
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

        {/* 输入区域 */}
        <div className="border-gray-100/80 dark:border-gray-800/80 bg-gradient-to-r from-white/60 via-slate-50/40 to-blue-50/30 dark:from-gray-900/60 dark:via-gray-800/40 dark:to-blue-900/20 backdrop-blur-sm">
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
            }}
          />
        </div>
      </div>
    </div>
  );
}
