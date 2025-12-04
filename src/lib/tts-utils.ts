import emojiReg from "emoji-regex";
import { db } from "./db/index.ts";
import { useSpeakApi } from "../stores/useSpeakApi.ts";

/**
 * 清理Markdown格式，转换为适合TTS的纯文本
 * - 移除链接URL，只保留链接文本：[文本](URL) → 文本
 * - 移除图片：![alt](URL) → 空
 * - 移除粗体/斜体标记：**text** / *text* → text
 * - 移除代码标记：`code` → code
 * - 移除标题标记：# heading → heading
 * - 移除引用标记：> quote → quote
 * - 处理英文内容以适配中文TTS模型
 */
function cleanMarkdownForTTS(text: string): string {
  let cleaned = text;

  // 1. 移除图片 ![alt](url) → 空
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "");

  // 2. 转换链接 [文本](URL) → 文本
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 3. 移除粗体 **text** 或 __text__ → text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");

  // 4. 移除斜体 *text* 或 _text_ → text
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // 5. 移除行内代码 `code` → code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 6. 移除代码块标记 ```language\ncode\n``` → code
  cleaned = cleaned.replace(/```[\s\S]*?\n([\s\S]*?)```/g, "$1");

  // 7. 移除标题标记 # heading → heading
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 8. 移除引用标记 > quote → quote
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // 9. 移除水平线 --- 或 ***
  cleaned = cleaned.replace(/^[\-*]{3,}$/gm, "");

  // 10. 移除列表标记 - item 或 * item 或 1. item → item
  cleaned = cleaned.replace(/^[\s]*[\-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");

  // 11. 处理英文内容以适配中文TTS
  // 常见符号转换为中文
  cleaned = cleaned.replace(/&/g, "和");
  cleaned = cleaned.replace(/\+/g, "加");
  cleaned = cleaned.replace(/@/g, "在");

  // 英文字母到中文读音的映射
  const letterToPinyin: { [key: string]: string } = {
    A: "诶",
    B: "比",
    C: "西",
    D: "迪",
    E: "伊",
    F: "艾弗",
    G: "基",
    H: "艾奇",
    I: "艾",
    J: "杰",
    K: "开",
    L: "艾勒",
    M: "艾姆",
    N: "恩",
    O: "欧",
    P: "批",
    Q: "克优",
    R: "阿尔",
    S: "艾斯",
    T: "提",
    U: "优",
    V: "维",
    W: "达不溜",
    X: "艾克斯",
    Y: "歪",
    Z: "贼德",
  };

  // 将常见的英文缩写转换为中文读音
  // CEO -> 西伊欧, AI -> 诶艾, API -> 诶批艾
  cleaned = cleaned.replace(/\b([A-Z]{2,})\b/g, (match) => {
    return match
      .split("")
      .map((letter) => letterToPinyin[letter] || letter)
      .join("");
  });

  // 处理单个大写字母（如果周围是中文）
  cleaned = cleaned.replace(
    /([\u4e00-\u9fa5])\s*([A-Z])\s*([\u4e00-\u9fa5])/g,
    (_match, before, letter, after) => {
      return before + (letterToPinyin[letter] || letter) + after;
    }
  );

  // 12. 清理多余的空白
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // 多个换行变为两个
  cleaned = cleaned.replace(/[ \t]{2,}/g, " "); // 多个空格变为一个

  return cleaned.trim();
}

// 全局音频播放管理器
class AudioPlaybackManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioBuffer: AudioBuffer | null = null;
  private pausedAt: number = 0; // 暂停时的播放位置（秒）
  private startedAt: number = 0; // 开始播放的时间戳
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private useHtmlAudio: boolean = false; // 标记使用哪种播放方式
  private currentArrayBuffer: ArrayBuffer | null = null; // 保存当前音频数据

  // 停止当前播放的音频
  stopCurrent(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        URL.revokeObjectURL(this.currentAudio.src);
      } catch (error) {
        // 音频已经结束或已停止，忽略错误
      }
      this.currentAudio = null;
    }

    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // 音频已经结束或已停止，忽略错误
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.pausedAt = 0;
    this.startedAt = 0;
    this.currentArrayBuffer = null;
    this.currentAudioBuffer = null;
  }

  // 暂停当前播放
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    if (this.useHtmlAudio && this.currentAudio) {
      // HTML Audio 原生支持暂停
      this.currentAudio.pause();
      this.pausedAt = this.currentAudio.currentTime;
    } else if (this.currentSource && this.audioContext) {
      // AudioContext 需要停止并记录位置
      const elapsed = this.audioContext.currentTime - this.startedAt;
      this.pausedAt += elapsed;
      try {
        this.currentSource.stop();
      } catch (error) {
        // 忽略停止错误
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.isPaused = true;
  }

  // 继续播放
  async resume(): Promise<void> {
    if (!this.isPaused) {
      return;
    }

    if (this.useHtmlAudio && this.currentAudio) {
      // HTML Audio 原生支持继续播放
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
        this.isPaused = false;
      } catch (error) {
        console.error("❌ 继续播放失败:", error);
      }
    } else if (this.currentAudioBuffer && this.audioContext) {
      // AudioContext 需要从暂停位置重新创建 source
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.currentAudioBuffer;
        source.connect(this.audioContext.destination);
        
        this.currentSource = source;
        this.startedAt = this.audioContext.currentTime;
        
        // 从暂停位置开始播放
        source.start(0, this.pausedAt);
        this.isPlaying = true;
        this.isPaused = false;
        
        // 监听播放结束
        source.onended = () => {
          if (this.isPlaying) { // 只有正常结束才清理
            this.isPlaying = false;
            this.isPaused = false;
            this.pausedAt = 0;
            this.currentSource = null;
          }
        };
      } catch (error) {
        console.error("❌ 继续播放失败:", error);
      }
    }
  }

  // 播放新的音频
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    // 先停止当前播放的音频
    this.stopCurrent();

    // 保存音频数据以支持继续播放
    this.currentArrayBuffer = audioBuffer;

    // 优先使用 HTML Audio，因为它原生支持暂停/继续
    try {
      return await this.playAudioWithHtmlElement(audioBuffer);
    } catch (error) {
      return this.playAudioWithContext(audioBuffer);
    }
  }

  // 使用 HTML Audio Element 播放（兼容性更好，支持暂停/继续）
  private playAudioWithHtmlElement(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // 尝试多种音频格式，提高兼容性
        const audioFormats = [
          "audio/wav",
          "audio/mpeg",
          "audio/mp3",
          "audio/ogg",
          "audio/*",
        ];

        let audioUrl: string | null = null;
        let audio: HTMLAudioElement | null = null;
        let formatIndex = 0;

        const tryNextFormat = () => {
          if (formatIndex >= audioFormats.length) {
            reject(new Error("所有音频格式都不被支持"));
            return;
          }

          const format = audioFormats[formatIndex];
          formatIndex++;

          try {
            const blob = new Blob([audioBuffer], { type: format });
            audioUrl = URL.createObjectURL(blob);
            audio = new Audio();

            this.currentAudio = audio;
            this.isPlaying = true;
            this.useHtmlAudio = true;
            this.isPaused = false;
            this.pausedAt = 0;

            audio.onended = () => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.isPaused = false;
              this.currentAudio = null;
              resolve();
            };

            audio.onerror = () => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.currentAudio = null;

              // 尝试下一个格式
              setTimeout(tryNextFormat, 10);
            };

            // 设置音频源并尝试播放
            audio.src = audioUrl;
            audio.play().catch(() => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.currentAudio = null;

              // 尝试下一个格式
              setTimeout(tryNextFormat, 10);
            });
          } catch (error) {
            // 尝试下一个格式
            setTimeout(tryNextFormat, 10);
          }
        };

        // 开始尝试第一个格式
        tryNextFormat();
      } catch (error) {
        this.isPlaying = false;
        this.currentAudio = null;
        reject(error);
      }
    });
  }

  // 使用 AudioContext 播放（更高级但兼容性问题，暂停需要重新创建source）
  private async playAudioWithContext(audioBuffer: ArrayBuffer): Promise<void> {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    try {
      const decodedBuffer = await this.audioContext.decodeAudioData(audioBuffer);
      this.currentAudioBuffer = decodedBuffer;
      
      const source = this.audioContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.audioContext.destination);

      this.currentSource = source;
      this.isPlaying = true;
      this.useHtmlAudio = false;
      this.isPaused = false;
      this.pausedAt = 0;
      this.startedAt = this.audioContext.currentTime;

      // 设置结束回调
      return new Promise<void>((resolve) => {
        source.onended = () => {
          if (this.isPlaying) { // 只有正常结束才清理
            this.isPlaying = false;
            this.isPaused = false;
            this.currentSource = null;
            resolve();
          }
        };
        source.start();
      });
    } catch (error) {
      this.isPlaying = false;
      this.currentSource = null;
      throw new Error(
        `AudioContext 解码失败: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  // 检查是否正在播放
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // 检查是否已暂停
  getIsPaused(): boolean {
    return this.isPaused;
  }

  // 获取当前播放位置（秒）
  getCurrentTime(): number {
    if (this.useHtmlAudio && this.currentAudio) {
      return this.currentAudio.currentTime;
    } else if (this.audioContext && this.isPlaying) {
      return this.pausedAt + (this.audioContext.currentTime - this.startedAt);
    }
    return this.pausedAt;
  }

  // 获取音频总时长（秒）
  getDuration(): number {
    if (this.useHtmlAudio && this.currentAudio) {
      return this.currentAudio.duration || 0;
    } else if (this.currentAudioBuffer) {
      return this.currentAudioBuffer.duration;
    }
    return 0;
  }
}

// 创建全局实例
const audioManager = new AudioPlaybackManager();

/**
 * 共享的TTS工具函数
 * 用于生成和播放语音，同时处理缓存
 */
export async function generateAndPlayTTS(
  text: string,
  timestamp: number,
  options: {
    onGeneratingChange?: (generating: boolean) => void;
    onPlayingChange?: (playing: boolean) => void;
  } = {}
) {
  const { onGeneratingChange, onPlayingChange } = options;

  const speak = useSpeakApi.getState().speak;
  const currentSpeakApi = useSpeakApi.getState().currentSpeakApi;

  // 检查TTS服务是否可用
  if (!speak || currentSpeakApi === "关闭") {
    return;
  }

  // 清理文本：先清理markdown，再移除emoji
  const emoji = emojiReg();
  let cleanContent = cleanMarkdownForTTS(text); // 先清理markdown
  cleanContent = cleanContent.replace(emoji, "").trim(); // 再移除emoji

  if (!cleanContent) {
    return;
  }

  try {
    onPlayingChange?.(true);

    // 1. 先检查数据库缓存
    const cachedAudio = await db.getAudioCache(timestamp);

    if (cachedAudio && cachedAudio.audio) {
      await playAudioFromBuffer(cachedAudio.audio);
      return;
    }

    // 2. 没有缓存，生成新的音频
    onGeneratingChange?.(true);

    const result = await speak(cleanContent);

    if (result && result.audio) {
      // 保存到缓存
      let audioBuffer: ArrayBuffer;
      if (result.audio instanceof Uint8Array) {
        const typedArrayBuffer = result.audio.buffer;
        if (typedArrayBuffer instanceof ArrayBuffer) {
          audioBuffer = typedArrayBuffer.slice(
            result.audio.byteOffset,
            result.audio.byteOffset + result.audio.byteLength
          );
        } else {
          audioBuffer = new ArrayBuffer(result.audio.byteLength);
          new Uint8Array(audioBuffer).set(result.audio);
        }
      } else {
        audioBuffer = result.audio as ArrayBuffer;
      }

      // 保存到数据库缓存
      await db.addAudioCache({
        timestamp: timestamp,
        audio: audioBuffer,
      });

      await playAudioFromBuffer(audioBuffer);
    }
  } catch (error) {
    console.error("❌ 语音播放失败:", error);
  } finally {
    onPlayingChange?.(false);
    onGeneratingChange?.(false);
  }
}

/**
 * 播放音频缓冲区
 * @param audioBuffer - 音频数据
 */
export async function playAudioFromBuffer(
  audioBuffer: ArrayBuffer
): Promise<void> {
  await audioManager.playAudio(audioBuffer);
}

type AutoTtsTask = {
  text: string;
  timestamp: number;
  callbacks: {
    onGeneratingStart?: () => void;
    onGeneratingEnd?: () => void;
    onPlayingStart?: () => void;
    onPlayingEnd?: () => void;
  };
};

type TaskWithBuffer = AutoTtsTask & {
  audioBuffer?: ArrayBuffer | null;
  generationPromise?: Promise<ArrayBuffer | null>;
};

class AutoTtsQueue {
  private queue: TaskWithBuffer[] = [];
  private isPlayingQueue = false;

  enqueue(task: AutoTtsTask) {
    const taskWithBuffer: TaskWithBuffer = { ...task };
    this.queue.push(taskWithBuffer);
    
    // 立即开始生成（不等待播放）
    task.callbacks.onGeneratingStart?.();
    taskWithBuffer.generationPromise = generateTTSOnly(task.text, task.timestamp)
      .then((buffer) => {
        taskWithBuffer.audioBuffer = buffer;
        task.callbacks.onGeneratingEnd?.();
        return buffer;
      })
      .catch((error) => {
        console.error("❌ TTS生成失败:", error);
        taskWithBuffer.audioBuffer = null;
        task.callbacks.onGeneratingEnd?.();
        return null;
      });

    // 启动播放队列处理
    this.processPlayQueue();
  }

  private async processPlayQueue() {
    if (this.isPlayingQueue || this.queue.length === 0) {
      return;
    }

    this.isPlayingQueue = true;

    while (this.queue.length > 0) {
      const task = this.queue[0]; // 查看队首任务，但先不移除
      if (!task) break;

      try {
        // 等待生成完成
        if (task.generationPromise) {
          await task.generationPromise;
        }

        // 现在可以安全移除任务了
        this.queue.shift();

        // 播放阶段
        if (task.audioBuffer) {
          task.callbacks.onPlayingStart?.();
          try {
            await playAudioFromBuffer(task.audioBuffer);
          } finally {
            task.callbacks.onPlayingEnd?.();
          }
        } else {
          // 生成失败，也要调用回调清理状态
          task.callbacks.onPlayingEnd?.();
        }
      } catch (error) {
        console.error("❌ 自动TTS播放失败:", error);
        this.queue.shift(); // 出错也要移除任务
        task.callbacks.onPlayingEnd?.();
      }
    }

    this.isPlayingQueue = false;
  }

  clear() {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

const autoTtsQueue = new AutoTtsQueue();

export function enqueueAutoTtsTask(
  text: string,
  timestamp: number,
  callbacks: {
    onGeneratingStart?: () => void;
    onGeneratingEnd?: () => void;
    onPlayingStart?: () => void;
    onPlayingEnd?: () => void;
  } = {}
): void {
  autoTtsQueue.enqueue({ text, timestamp, callbacks });
}

export function clearAutoTtsQueue(): void {
  autoTtsQueue.clear();
}

export function getAutoTtsQueueLength(): number {
  return autoTtsQueue.getQueueLength();
}

/**
 * 停止当前播放的音频
 */
export function stopCurrentAudio(): void {
  audioManager.stopCurrent();
}

/**
 * 暂停当前播放的音频
 */
export function pauseCurrentAudio(): void {
  audioManager.pause();
}

/**
 * 继续播放暂停的音频
 */
export function resumeCurrentAudio(): Promise<void> {
  return audioManager.resume();
}

/**
 * 检查是否有音频正在播放
 */
export function isAudioPlaying(): boolean {
  return audioManager.getIsPlaying();
}

/**
 * 检查是否有音频已暂停
 */
export function isAudioPaused(): boolean {
  return audioManager.getIsPaused();
}

/**
 * 获取当前播放位置（秒）
 */
export function getAudioCurrentTime(): number {
  return audioManager.getCurrentTime();
}

/**
 * 获取音频总时长（秒）
 */
export function getAudioDuration(): number {
  return audioManager.getDuration();
}

/**
 * 仅生成TTS（不播放）
 * 用于自动TTS功能
 */
export async function generateTTSOnly(
  text: string,
  timestamp: number
): Promise<ArrayBuffer | null> {
  const speak = useSpeakApi.getState().speak;
  const currentSpeakApi = useSpeakApi.getState().currentSpeakApi;

  if (!speak || currentSpeakApi === "关闭") {
    return null;
  }

  // 清理文本：先清理markdown，再移除emoji
  const emoji = emojiReg();
  let cleanContent = cleanMarkdownForTTS(text); // 先清理markdown
  cleanContent = cleanContent.replace(emoji, "").trim(); // 再移除emoji

  if (!cleanContent) {
    return null;
  }

  try {
    // 1. 先检查数据库缓存
    const cachedAudio = await db.getAudioCache(timestamp);
    if (cachedAudio && cachedAudio.audio) {
      return cachedAudio.audio;
    }

    // 2. 生成新的音频
    const result = await speak(cleanContent);

    if (result && result.audio) {
      let audioBuffer: ArrayBuffer;
      if (result.audio instanceof Uint8Array) {
        const typedArrayBuffer = result.audio.buffer;
        if (typedArrayBuffer instanceof ArrayBuffer) {
          audioBuffer = typedArrayBuffer.slice(
            result.audio.byteOffset,
            result.audio.byteOffset + result.audio.byteLength
          );
        } else {
          audioBuffer = new ArrayBuffer(result.audio.byteLength);
          new Uint8Array(audioBuffer).set(result.audio);
        }
      } else {
        audioBuffer = result.audio as ArrayBuffer;
      }

      // 保存到数据库缓存
      await db.addAudioCache({
        timestamp: timestamp,
        audio: audioBuffer,
      });

      return audioBuffer;
    }
  } catch (error) {
    console.error("❌ TTS生成失败:", error);
  }

  return null;
}
