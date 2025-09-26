import { Loader2, Volume2, VolumeX, VolumeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { generateAndPlayTTS, isAudioPlaying } from "../../lib/tts-utils.ts";
import { useSpeakApi } from "../../stores/useSpeakApi.ts";

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
  const currentSpeakApi = useSpeakApi((state) => state.currentSpeakApi);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);

  // 监听全局播放状态
  useEffect(() => {
    const checkGlobalPlayingState = () => {
      setIsGloballyPlaying(isAudioPlaying());
    };

    // 定期检查全局播放状态
    const interval = setInterval(checkGlobalPlayingState, 100);

    return () => clearInterval(interval);
  }, []);

  const handleSpeakClick = async () => {
    if (isPlaying || isGenerating) return;

    await generateAndPlayTTS(content, timestamp, {
      showToasts: true,
      onGeneratingChange: setIsGenerating,
      onPlayingChange: setIsPlaying,
    });
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
          {isAssistant && (
            <button
              onClick={handleSpeakClick}
              disabled={isPlaying || isGenerating}
              className={`
                 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                 ${
                   isPlaying || isGenerating
                     ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 cursor-not-allowed"
                     : isGloballyPlaying && !isPlaying
                     ? "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                     : !speak || currentSpeakApi === "关闭"
                     ? "bg-gray-100 dark:bg-gray-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:scale-110 cursor-pointer"
                     : "bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 cursor-pointer"
                 }
                 disabled:opacity-50
               `}
              title={
                isGenerating
                  ? "正在生成语音..."
                  : isPlaying
                  ? "正在播放..."
                  : isGloballyPlaying && !isPlaying
                  ? "其他音频正在播放，点击可切换到此条"
                  : !speak || currentSpeakApi === "关闭"
                  ? "点击启用语音播放"
                  : "手动播放语音"
              }
              aria-label={
                isGenerating
                  ? "正在生成语音"
                  : isPlaying
                  ? "正在播放语音"
                  : isGloballyPlaying && !isPlaying
                  ? "切换到此条音频"
                  : !speak || currentSpeakApi === "关闭"
                  ? "启用语音播放"
                  : "手动播放语音"
              }
              aria-busy={isPlaying || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-3 h-3" />
              ) : isGloballyPlaying && !isPlaying ? (
                <Volume2 className="w-3 h-3 opacity-60" />
              ) : !speak || currentSpeakApi === "关闭" ? (
                <VolumeOff className="w-3 h-3" />
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
