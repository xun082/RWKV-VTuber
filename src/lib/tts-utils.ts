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
  private isPlaying: boolean = false;

  // 停止当前播放的音频
  stopCurrent(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        URL.revokeObjectURL(this.currentAudio.src);
        console.log("🛑 停止之前的 HTML Audio 播放");
      } catch (error) {
        // 音频已经结束或已停止，忽略错误
      }
      this.currentAudio = null;
    }

    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
        console.log("🛑 停止之前的 AudioContext 播放");
      } catch (error) {
        // 音频已经结束或已停止，忽略错误
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
  }

  // 播放新的音频
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    // 先停止当前播放的音频
    this.stopCurrent();

    // Electron 和浏览器统一策略：优先 AudioContext，失败则用 HTML Audio
    try {
      return await this.playAudioWithContext(audioBuffer);
    } catch (error) {
      console.warn(
        "AudioContext 播放失败，尝试使用 HTML Audio (Blob URL):",
        error
      );
      return this.playAudioWithHtmlElement(audioBuffer);
    }
  }

  // 使用 HTML Audio Element 播放（兼容性更好）
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
            audio = new Audio(); // 修复: 使用 new Audio() 而不是 new HTMLAudioElement()

            this.currentAudio = audio;
            this.isPlaying = true;

            audio.onended = () => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.currentAudio = null;
              console.log(`✅ HTML Audio 播放完成 (格式: ${format})`);
              resolve();
            };

            audio.onerror = (e) => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.currentAudio = null;
              console.warn(`❌ 格式 ${format} 播放失败:`, e);

              // 尝试下一个格式
              setTimeout(tryNextFormat, 10);
            };

            // 设置音频源并尝试播放
            audio.src = audioUrl;
            audio.play().catch((playError) => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              this.isPlaying = false;
              this.currentAudio = null;
              console.warn(`❌ 格式 ${format} 播放失败:`, playError.message);

              // 尝试下一个格式
              setTimeout(tryNextFormat, 10);
            });

            console.log(
              `🎵 尝试使用 HTML Audio Element 播放音频 (格式: ${format})`
            );
          } catch (error) {
            console.warn(`❌ 格式 ${format} 创建失败:`, error);
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

  // 使用 AudioContext 播放（更高级但兼容性问题）
  private async playAudioWithContext(audioBuffer: ArrayBuffer): Promise<void> {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    try {
      // 打印音频数据前16字节用于调试
      const debugView = new Uint8Array(
        audioBuffer.slice(0, Math.min(16, audioBuffer.byteLength))
      );
      console.log(
        "🔍 音频数据前16字节:",
        Array.from(debugView)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")
      );
      console.log("🔍 音频数据总大小:", audioBuffer.byteLength, "bytes");

      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(audioContext.destination);

      this.currentSource = source;
      this.isPlaying = true;

      // 设置结束回调
      return new Promise<void>((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          console.log("✅ AudioContext 播放完成");
          resolve();
        };
        source.start();
        console.log("🎵 使用 AudioContext 播放音频");
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
    console.warn("TTS 服务未启用，请在设置中启用 Sherpa-ONNX TTS");
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
    console.log("🔍 检查音频缓存...");
    const cachedAudio = await db.getAudioCache(timestamp);

    if (cachedAudio && cachedAudio.audio) {
      console.log("✅ 找到缓存音频，直接播放");
      await playAudioFromBuffer(cachedAudio.audio);
      console.log("✅ 缓存音频播放完成");
      return;
    }

    // 2. 没有缓存，生成新的音频
    console.log("🔊 缓存中无音频，开始生成...");
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

      console.log("✅ 音频已生成并缓存，开始播放");
      await playAudioFromBuffer(audioBuffer);
      console.log("✅ 新生成音频播放完成");
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
 */
export async function playAudioFromBuffer(
  audioBuffer: ArrayBuffer
): Promise<void> {
  return audioManager.playAudio(audioBuffer);
}

/**
 * 停止当前播放的音频
 */
export function stopCurrentAudio(): void {
  audioManager.stopCurrent();
}

/**
 * 检查是否有音频正在播放
 */
export function isAudioPlaying(): boolean {
  return audioManager.getIsPlaying();
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
