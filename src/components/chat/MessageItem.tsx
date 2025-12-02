import { Loader2, Volume2, VolumeOff, Pause, Play, Square } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import MarkdownIt from "markdown-it";
import {
  generateAndPlayTTS,
  isAudioPlaying,
  pauseCurrentAudio,
  resumeCurrentAudio,
  stopCurrentAudio,
} from "../../lib/tts-utils.ts";
import { useSpeakApi } from "../../stores/useSpeakApi.ts";
import { useStates } from "../../stores/useStates.ts";
import { isElectron } from "../../lib/electron.ts";
import { openLink } from "../../lib/utils.ts";

interface MessageItemProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  index: number;
  uuid: string;
}

// 初始化 Markdown 渲染器
const md = new MarkdownIt({
  html: false, // 禁用 HTML 标签
  linkify: true, // 自动识别链接
  breaks: true, // 转换换行符为 <br>
  typographer: false, // 禁用排版替换（避免影响 ** 等符号）
});

export function MessageItem({
  role,
  content,
  timestamp,
  index,
  uuid,
}: MessageItemProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const speak = useSpeakApi((state) => state.speak);
  const currentSpeakApi = useSpeakApi((state) => state.currentSpeakApi);
  const ttsPlaybackState = useStates((state) => state.ttsPlaybackState);
  const setTtsPlaybackState = useStates((state) => state.setTtsPlaybackState);
  const ttsActiveMessageId = useStates((state) => state.ttsActiveMessageId);
  const setTtsActiveMessageId = useStates(
    (state) => state.setTtsActiveMessageId
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isActiveMessage = ttsActiveMessageId === uuid;

  // 过滤掉动作标签 [MMOTION:xxx]
  let displayContent = content.replace(/\[MMOTION:[^\]]+\]\s*/g, "").trim();

  // 修复 markdown 格式问题（仅对 AI 回复）
  if (isAssistant) {
    // 修复列表格式：-Text → - Text（在 - 后添加空格）
    displayContent = displayContent.replace(/^-([^\s-])/gm, "- $1");
    displayContent = displayContent.replace(/\n-([^\s-])/g, "\n- $1");

    // 规范化粗体格式：移除 ** 内部首尾的空格
    // ** 文本 ** → **文本**
    displayContent = displayContent.replace(
      /\*\*\s*([^*]+?)\s*\*\*/g,
      "**$1**"
    );
  }

  // 渲染 Markdown（仅对 AI 回复）
  const renderedContent = useMemo(() => {
    if (isAssistant) {
      return md.render(displayContent);
    }
    return displayContent;
  }, [displayContent, isAssistant]);

  // 监听全局播放状态
  useEffect(() => {
    const checkGlobalPlayingState = () => {
      setIsGloballyPlaying(isAudioPlaying());
    };

    const interval = setInterval(checkGlobalPlayingState, 100);
    return () => clearInterval(interval);
  }, []);

  // 处理链接点击
  useEffect(() => {
    if (!isAssistant || !contentRef.current) return;

    const handleLinkClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href) {
        e.preventDefault();
        e.stopPropagation();

        const url = link.href;

        // 在 Electron 环境中使用 IPC 打开外部链接
        if (isElectron() && window.electronAPI) {
          try {
            await window.electronAPI.invoke("open_external_link", { url });
          } catch (error) {
            console.error("打开链接失败:", error);
            // 降级到使用 openLink
            await openLink(url);
          }
        } else {
          // 在 Web 环境中使用 openLink
          await openLink(url);
        }
      }
    };

    const container = contentRef.current;
    container.addEventListener("click", handleLinkClick);

    return () => {
      container.removeEventListener("click", handleLinkClick);
    };
  }, [isAssistant, renderedContent]);

  const handleSpeakClick = async () => {
    if (isGenerating) return;

    setTtsActiveMessageId(uuid);

    await generateAndPlayTTS(content, timestamp, {
      onGeneratingChange: setIsGenerating,
      onPlayingChange: (playing) => {
        // 同步更新全局状态
        const newState = playing ? "playing" : "idle";
        setTtsPlaybackState(newState);
        if (!playing) {
          setTtsActiveMessageId((current) =>
            current === uuid ? null : current
          );
        }
      },
    });
  };

  const handlePause = () => {
    pauseCurrentAudio();
    setTtsPlaybackState("paused");
  };

  const handleResume = async () => {
    setTtsPlaybackState("playing");
    try {
      await resumeCurrentAudio();
    } catch (err) {
      console.error("❌ 继续播放失败:", err);
      setTtsPlaybackState("idle");
      setTtsActiveMessageId((current) => (current === uuid ? null : current));
    }
  };

  const handleStop = () => {
    stopCurrentAudio();
    setTtsPlaybackState("idle");
    setTtsActiveMessageId((current) => (current === uuid ? null : current));
  };

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } animate-in slide-in-from-bottom-4 duration-300`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] px-4 py-3 rounded-2xl backdrop-blur-md border transition-all duration-300 hover:shadow-lg hover:scale-[1.005] relative overflow-hidden ${
          isUser
            ? "bg-linear-to-br from-blue-500 via-blue-600 to-indigo-600 text-white border-blue-400/30 shadow-md shadow-blue-500/20 ml-auto rounded-br-sm"
            : "bg-white/80 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 border-gray-200/60 dark:border-gray-700/60 shadow-md shadow-gray-400/15 dark:shadow-black/30 rounded-bl-sm"
        }`}
      >
        {/* 消息装饰渐变 */}
        {isUser && (
          <div className="absolute inset-0 bg-linear-to-br from-white/15 via-transparent to-blue-900/10 opacity-40 pointer-events-none"></div>
        )}
        {!isUser && (
          <div className="absolute inset-0 bg-linear-to-br from-blue-50/60 via-white/20 to-transparent dark:from-blue-900/20 dark:via-transparent dark:to-gray-800/30 opacity-50 pointer-events-none"></div>
        )}

        {isAssistant ? (
          <div
            ref={contentRef}
            className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-[15px] relative z-10"
            style={{
              color: "inherit",
            }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed text-[15px] relative z-10">
            {displayContent}
          </div>
        )}
        <div
          className={`text-[10px] sm:text-[11px] mt-2 flex items-center justify-between relative z-10 ${
            isUser
              ? "text-blue-50/80"
              : "text-gray-500/90 dark:text-gray-400/90"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-current opacity-60"></div>
            <span className="font-medium opacity-90">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* 语音播放控制按钮组 - 只在AI消息中显示 */}
          {isAssistant && (
            <div className="flex items-center gap-1">
              {/* 播放按钮 - 当没有播放或暂停时显示 */}
              {(!isActiveMessage || ttsPlaybackState === "idle") && (
                <button
                  onClick={handleSpeakClick}
                  disabled={isGenerating}
                  className={`
                     flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm
                     ${
                       isGenerating
                         ? "bg-blue-500/20 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 cursor-not-allowed border border-blue-400/30"
                         : isGloballyPlaying
                         ? "bg-orange-500/15 dark:bg-orange-400/15 text-orange-600 dark:text-orange-400 hover:bg-red-500/20 dark:hover:bg-red-400/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer hover:scale-105 border border-orange-400/30 hover:border-red-400/30"
                         : !speak || currentSpeakApi === "关闭"
                         ? "bg-gray-200/60 dark:bg-gray-600/40 hover:bg-yellow-500/15 dark:hover:bg-yellow-400/15 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:scale-105 cursor-pointer border border-gray-300/40 dark:border-gray-600/40"
                         : "bg-gray-200/50 dark:bg-gray-600/30 hover:bg-blue-500/15 dark:hover:bg-blue-400/15 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 cursor-pointer border border-gray-300/30 dark:border-gray-600/30 hover:border-blue-400/30"
                     }
                     disabled:opacity-50
                   `}
                  title={isGenerating ? "正在生成语音..." : "播放语音"}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                  ) : !speak || currentSpeakApi === "关闭" ? (
                    <VolumeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </button>
              )}

              {/* 播放中：显示暂停和停止按钮 */}
              {isActiveMessage && ttsPlaybackState === "playing" && (
                <>
                  <button
                    onClick={handlePause}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm bg-blue-500/20 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 dark:hover:bg-blue-400/30 cursor-pointer hover:scale-105 border border-blue-400/30 animate-pulse"
                    title="暂停播放"
                  >
                    <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm bg-red-500/20 dark:bg-red-400/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 dark:hover:bg-red-400/30 cursor-pointer hover:scale-105 border border-red-400/30"
                    title="停止播放"
                  >
                    <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </>
              )}

              {/* 暂停中：显示继续和停止按钮 */}
              {isActiveMessage && ttsPlaybackState === "paused" && (
                <>
                  <button
                    onClick={handleResume}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm bg-green-500/20 dark:bg-green-400/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 dark:hover:bg-green-400/30 cursor-pointer hover:scale-105 border border-green-400/30"
                    title="继续播放"
                  >
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm bg-red-500/20 dark:bg-red-400/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 dark:hover:bg-red-400/30 cursor-pointer hover:scale-105 border border-red-400/30"
                    title="停止播放"
                  >
                    <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
