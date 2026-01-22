import { Loader2, Volume2, VolumeOff, Pause, Play, Square } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import MarkdownIt from "markdown-it";
import {
  generateAndPlayTTS,
  isAudioPlaying,
  isAudioPaused,
  getAudioCurrentTime,
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
  const ttsPausedMessageIds = useStates((state) => state.ttsPausedMessageIds);
  const ttsProgress = useStates((state) => state.ttsProgress);
  const addTtsPausedMessageId = useStates(
    (state) => state.addTtsPausedMessageId
  );
  const removeTtsPausedMessageId = useStates(
    (state) => state.removeTtsPausedMessageId
  );
  const setTtsProgress = useStates((state) => state.setTtsProgress);
  const clearTtsProgress = useStates((state) => state.clearTtsProgress);
  const ttsLoadingMessageId = useStates((state) => state.ttsLoadingMessageId);
  const setTtsLoadingMessageId = useStates(
    (state) => state.setTtsLoadingMessageId
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false); // 追踪当前消息是否正在播放
  const pausingRef = useRef(false); // 追踪是否正在执行暂停操作
  const isActiveMessage = ttsActiveMessageId === uuid;
  const isPausedMessage = ttsPausedMessageIds.includes(uuid);
  const isLoading = isGenerating || ttsLoadingMessageId === uuid;

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
    
    // 标记当前消息正在播放
    playingRef.current = true;
    
    // 保存旧的活跃消息 ID 和状态
    const oldActiveMessageId = ttsActiveMessageId;
    const oldPlaybackState = ttsPlaybackState;
    
    // 先处理旧消息（在更新状态之前）
    if (oldActiveMessageId && oldActiveMessageId !== uuid) {
      // 记录被打断消息的进度
      const progress = getAudioCurrentTime();
      if (!isNaN(progress) && progress > 0) {
        setTtsProgress(oldActiveMessageId, progress);
        console.log(`[MessageItem] 保存旧消息进度: ${oldActiveMessageId.slice(0, 8)}, ${progress.toFixed(2)}秒`);
      }
      // 添加到暂停列表（只有正在播放或暂停的才添加）
      if (oldPlaybackState === "playing" || oldPlaybackState === "paused") {
        addTtsPausedMessageId(oldActiveMessageId);
        console.log(`[MessageItem] 旧消息添加到暂停列表: ${oldActiveMessageId.slice(0, 8)}`);
      }
      // 停止旧音频
      stopCurrentAudio();
    }
    
    // 然后设置新状态
    setTtsPlaybackState("playing");
    setTtsActiveMessageId(uuid);
    removeTtsPausedMessageId(uuid);
    setTtsLoadingMessageId(uuid);
    console.log(`[MessageItem] 开始播放新消息: ${uuid.slice(0, 8)}`);

    const startOffsetSeconds = ttsProgress[uuid] ?? 0;
    if (startOffsetSeconds > 0) {
      console.log(`[MessageItem] 从进度 ${startOffsetSeconds.toFixed(2)}秒 开始播放`);
    }

    try {
      await generateAndPlayTTS(content, timestamp, {
        onGeneratingChange: setIsGenerating,
        onPlayingChange: (playing) => {
          if (playing) {
            playingRef.current = true;
            pausingRef.current = false;
            setTtsLoadingMessageId((current) =>
              current === uuid ? null : current
            );
          } else {
            // 播放结束：先检查是否是暂停操作触发的
            if (pausingRef.current) {
              return;
            }
            
            if (!playingRef.current) {
              return;
            }
            
            playingRef.current = false;
            
            // 从 store 获取最新状态（避免闭包问题）
            const currentState = useStates.getState();
            const currentActiveId = currentState.ttsActiveMessageId;
            const currentPausedIds = currentState.ttsPausedMessageIds;
            
            // 优先检查是否在暂停列表中
            if (currentPausedIds.includes(uuid)) {
              return;
            }
            
            // 如果当前全局状态是 paused，且活跃消息是当前消息，说明是主动暂停操作
            const currentPlaybackState = currentState.ttsPlaybackState;
            if (currentPlaybackState === "paused" && currentActiveId === uuid) {
              return;
            }
            
            // 如果不是活跃消息，忽略
            if (currentActiveId !== uuid) {
              return;
            }
            
            // 如果底层仍在播放，忽略这个回调
            if (isAudioPlaying()) {
              return;
            }
            
            // 正常播放结束：清空状态
            console.log(`[MessageItem] 播放结束: ${uuid.slice(0, 8)}`);
            setTtsPlaybackState("idle");
            setTtsActiveMessageId(null);
            clearTtsProgress(uuid);
          }
        },
        startOffsetSeconds,
      });
    } catch (error) {
      console.error("播放失败:", error);
      playingRef.current = false;
      throw error;
    } finally {
      setTtsLoadingMessageId((current) => (current === uuid ? null : current));
    }
  };

  const handlePause = () => {
    // 只有当前消息正在播放时才能暂停
    if (!isActiveMessage || ttsPlaybackState !== "playing") {
      console.log(`[MessageItem] 无法暂停: 不是活跃消息或未在播放 ${uuid.slice(0, 8)}`);
      return;
    }
    
    // 立即设置暂停标记，防止回调中清空状态
    pausingRef.current = true;
    playingRef.current = false;
    
    // 暂停音频（必须在记录进度之前暂停，否则进度会继续增加）
    pauseCurrentAudio();
    
    // 记录当前进度
    const progress = getAudioCurrentTime();
    if (!isNaN(progress) && progress > 0) {
      setTtsProgress(uuid, progress);
      console.log(`[MessageItem] 暂停并保存进度: ${uuid.slice(0, 8)}, ${progress.toFixed(2)}秒`);
    }
    
    // 设置暂停状态
    setTtsPlaybackState("paused");
    setTtsActiveMessageId(uuid);
    addTtsPausedMessageId(uuid);
    
    // 100ms 后重置暂停标记
    setTimeout(() => {
      pausingRef.current = false;
    }, 100);
  };

  const handleResume = async () => {
    // 标记当前消息正在播放
    playingRef.current = true;
    pausingRef.current = false;
    
    // 保存旧的活跃消息 ID 和状态
    const oldActiveMessageId = ttsActiveMessageId;
    const oldPlaybackState = ttsPlaybackState;
    
    // 检查当前是否是同一个消息的恢复播放
    const isSameMessage = oldActiveMessageId === uuid && oldPlaybackState === "paused";
    
    // 如果是不同消息，先处理旧消息
    if (oldActiveMessageId && oldActiveMessageId !== uuid) {
      // 记录被打断消息的进度
      const progress = getAudioCurrentTime();
      if (!isNaN(progress) && progress > 0) {
        setTtsProgress(oldActiveMessageId, progress);
        console.log(`[MessageItem] 保存旧消息进度: ${oldActiveMessageId.slice(0, 8)}, ${progress.toFixed(2)}秒`);
      }
      // 添加到暂停列表
      if (oldPlaybackState === "playing" || oldPlaybackState === "paused") {
        addTtsPausedMessageId(oldActiveMessageId);
        console.log(`[MessageItem] 旧消息添加到暂停列表: ${oldActiveMessageId.slice(0, 8)}`);
      }
      // 停止旧音频
      stopCurrentAudio();
    }
    
    // 然后设置新状态
    setTtsPlaybackState("playing");
    setTtsActiveMessageId(uuid);
    removeTtsPausedMessageId(uuid);
    
    // 获取保存的播放进度
    const startOffsetSeconds = ttsProgress[uuid] ?? 0;
    console.log(`[MessageItem] 恢复播放消息: ${uuid.slice(0, 8)}, 进度: ${startOffsetSeconds.toFixed(2)}秒`);
    
    // 如果是同一个消息的恢复，且音频已暂停，尝试直接恢复
    const canResume = isSameMessage && isAudioPaused();
    let playSuccess = false;
    
    if (canResume) {
      try {
        await resumeCurrentAudio();
        playSuccess = true;
        console.log(`[MessageItem] 直接恢复播放成功: ${uuid.slice(0, 8)}`);
        
        // 轮询检测播放是否完成
        const checkInterval = setInterval(() => {
          if (!isAudioPlaying() && playingRef.current) {
            clearInterval(checkInterval);
            playingRef.current = false;
            pausingRef.current = false;
            
            // 检查是否在暂停列表中
            const currentState = useStates.getState();
            if (!currentState.ttsPausedMessageIds.includes(uuid)) {
              console.log(`[MessageItem] 播放结束: ${uuid.slice(0, 8)}`);
              setTtsPlaybackState("idle");
              setTtsActiveMessageId(null);
              clearTtsProgress(uuid);
            }
          }
        }, 100);
        
        // 30秒后自动清理（防止内存泄漏）
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 30000);
      } catch (err) {
        console.error(`[MessageItem] 直接恢复失败: ${uuid.slice(0, 8)}`, err);
        playingRef.current = false;
      }
    }
    
    // 如果恢复失败或无法恢复，重新生成播放
    if (!playSuccess) {
      console.log(`[MessageItem] 重新生成播放: ${uuid.slice(0, 8)}`);
      setTtsLoadingMessageId(uuid);
      try {
        await generateAndPlayTTS(content, timestamp, {
          onGeneratingChange: setIsGenerating,
          onPlayingChange: (playing) => {
            if (playing) {
              playingRef.current = true;
              setTtsLoadingMessageId((current) =>
                current === uuid ? null : current
              );
            } else {
              // 播放结束：先检查是否是暂停操作触发的
              if (pausingRef.current) {
                return;
              }
              
              if (!playingRef.current) {
                return;
              }
              
              playingRef.current = false;
              pausingRef.current = false;
              
              // 从 store 获取最新状态（避免闭包问题）
              const currentState = useStates.getState();
              const currentActiveId = currentState.ttsActiveMessageId;
              const currentPausedIds = currentState.ttsPausedMessageIds;
              
              // 优先检查是否在暂停列表中
              if (currentPausedIds.includes(uuid)) {
                return;
              }
              
              // 如果当前全局状态是 paused，且活跃消息是当前消息，说明是主动暂停操作
              const currentPlaybackState = currentState.ttsPlaybackState;
              if (currentPlaybackState === "paused" && currentActiveId === uuid) {
                return;
              }
              
              if (currentActiveId !== uuid) {
                return;
              }
              
              if (isAudioPlaying()) {
                return;
              }
              
              console.log(`[MessageItem] 播放结束: ${uuid.slice(0, 8)}`);
              setTtsPlaybackState("idle");
              setTtsActiveMessageId(null);
              clearTtsProgress(uuid);
            }
          },
          startOffsetSeconds,
        });
      } catch (error) {
        console.error("重新播放失败:", error);
        playingRef.current = false;
        throw error;
      } finally {
        setTtsLoadingMessageId((current) => (current === uuid ? null : current));
      }
    }
  };

  const handleStop = () => {
    // 只有当前消息是活跃消息时才能停止
    if (!isActiveMessage) {
      console.log(`[MessageItem] 无法停止: 不是活跃消息 ${uuid.slice(0, 8)}`);
      return;
    }
    
    console.log(`[MessageItem] 停止播放: ${uuid.slice(0, 8)}`);
    playingRef.current = false;
    pausingRef.current = false;
    
    // 停止音频
    stopCurrentAudio();
    
    // 清除所有状态
    setTtsPlaybackState("idle");
    setTtsActiveMessageId(null);
    removeTtsPausedMessageId(uuid);
    clearTtsProgress(uuid);
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
          {isAssistant && (() => {
            const shouldShowPauseButtons = isPausedMessage || 
                                           (isActiveMessage && ttsPlaybackState === "paused") ||
                                           (ttsPlaybackState === "paused" && isActiveMessage);
            const shouldShowPlayingButtons = isActiveMessage && ttsPlaybackState === "playing";
            
            return <div className="flex items-center gap-1">
              {/* 加载按钮 */}
              {isLoading ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-300/40 dark:border-gray-600/40 bg-gray-200/60 dark:bg-gray-600/40 text-gray-500 dark:text-gray-400 cursor-wait"
                  title="语音生成中..."
                >
                  <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                </button>
              ) : shouldShowPauseButtons ? (
                // 暂停中：显示继续和停止按钮
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
              ) : shouldShowPlayingButtons ? (
                // 播放中：显示暂停和停止按钮
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
              ) : (
                // 空闲状态：显示播放按钮
                <button
                  onClick={handleSpeakClick}
                  className={`
                   flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 backdrop-blur-sm
                   ${
                     isGloballyPlaying
                       ? "bg-orange-500/15 dark:bg-orange-400/15 text-orange-600 dark:text-orange-400 hover:bg-red-500/20 dark:hover:bg-red-400/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer hover:scale-105 border border-orange-400/30 hover:border-red-400/30"
                       : !speak || currentSpeakApi === "关闭"
                       ? "bg-gray-200/60 dark:bg-gray-600/40 hover:bg-yellow-500/15 dark:hover:bg-yellow-400/15 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:scale-105 cursor-pointer border border-gray-300/40 dark:border-gray-600/40"
                       : "bg-gray-200/50 dark:bg-gray-600/30 hover:bg-blue-500/15 dark:hover:bg-blue-400/15 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 cursor-pointer border border-gray-300/30 dark:border-gray-600/30 hover:border-blue-400/30"
                   }
                 `}
                  title="播放语音"
                >
                  {!speak || currentSpeakApi === "关闭" ? (
                    <VolumeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </button>
              )}
            </div>;
          })()}
        </div>
      </div>
    </div>
  );
}
