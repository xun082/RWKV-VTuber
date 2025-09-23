import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSpeakApi } from "../../stores/useSpeakApi.ts";
import { toast } from "sonner";
import emojiReg from "emoji-regex";

interface MessageItemProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  index: number;
}

export function MessageItem({
  role,
  content,
  timestamp,
  index,
}: MessageItemProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const speak = useSpeakApi((state) => state.speak);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeakClick = async () => {
    if (!speak || isPlaying) return;

    try {
      setIsPlaying(true);
      const emoji = emojiReg();
      const cleanContent = content.replace(emoji, "").trim();

      if (!cleanContent) {
        toast.warning("没有可播放的文本内容");
        return;
      }

      await speak(cleanContent);
      toast.success("语音播放完成");
    } catch (error) {
      console.error("语音播放失败:", error);
      toast.error("语音播放失败");
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } animate-in slide-in-from-bottom-4 duration-300`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`max-w-[80%] p-4 rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 hover:shadow-xl relative overflow-hidden ${
          isUser
            ? "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white border-blue-500/30 shadow-blue-600/20 ml-auto"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200/60 dark:border-gray-700/60 shadow-gray-900/10 dark:shadow-black/20"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-base relative z-10">
          {content}
        </div>
        <div
          className={`text-xs mt-3 flex items-center justify-between relative z-10 ${
            isUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-current opacity-60 animate-pulse"></div>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* 语音播放按钮 - 只在AI消息中显示 */}
          {isAssistant && speak && (
            <button
              onClick={handleSpeakClick}
              disabled={isPlaying}
              className={`
                flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                ${
                  isPlaying
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 cursor-pointer"
                }
                disabled:opacity-50
              `}
              title={isPlaying ? "正在播放..." : "播放语音"}
              aria-label={isPlaying ? "正在播放语音" : "播放语音"}
              aria-busy={isPlaying}
            >
              {isPlaying ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
