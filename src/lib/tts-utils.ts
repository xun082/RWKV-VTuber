import emojiReg from "emoji-regex";
import { toast } from "sonner";
import { db } from "./db/index.ts";
import { useSpeakApi } from "../stores/useSpeakApi.ts";

// 全局音频播放管理器
class AudioPlaybackManager {
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;

  // 停止当前播放的音频
  stopCurrent(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
        console.log("🛑 停止之前的音频播放");
      } catch (error) {
        // 音频已经结束或已停止，忽略错误
      }
    }
    this.currentSource = null;
    this.isPlaying = false;
  }

  // 播放新的音频
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    // 先停止当前播放的音频
    this.stopCurrent();

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

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
        resolve();
      };
      source.start();
    });
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
    showToasts?: boolean;
    onGeneratingChange?: (generating: boolean) => void;
    onPlayingChange?: (playing: boolean) => void;
  } = {}
) {
  const { showToasts = true, onGeneratingChange, onPlayingChange } = options;

  const speak = useSpeakApi.getState().speak;
  const currentSpeakApi = useSpeakApi.getState().currentSpeakApi;
  const setSpeakApi = useSpeakApi.getState().setSpeakApi;

  // 检查TTS服务是否可用
  if (!speak || currentSpeakApi === "关闭") {
    // 尝试启用TTS服务
    try {
      await setSpeakApi("MiniMax TTS");
      if (showToasts) {
        toast.info("已启用 MiniMax TTS 服务，请重新点击播放");
      }
      return;
    } catch (error) {
      if (showToasts) {
        toast.error("启用TTS服务失败，请前往配置页面设置");
      }
      return;
    }
  }

  const emoji = emojiReg();
  const cleanContent = text.replace(emoji, "").trim();

  if (!cleanContent) {
    if (showToasts) {
      toast.warning("没有可播放的文本内容");
    }
    return;
  }

  try {
    onPlayingChange?.(true);

    // 1. 先检查数据库缓存
    console.log("🔍 检查音频缓存...");
    const cachedAudio = await db.getAudioCache(timestamp);

    if (cachedAudio && cachedAudio.audio) {
      console.log("✅ 找到缓存音频，直接播放");
      if (showToasts) {
        toast.info("正在播放缓存音频");
      }
      await playAudioFromBuffer(cachedAudio.audio);
      console.log("✅ 缓存音频播放完成");
      if (showToasts) {
        toast.success("语音播放完成");
      }
      return;
    }

    // 2. 没有缓存，生成新的音频
    console.log("🔊 缓存中无音频，开始生成...");
    onGeneratingChange?.(true);
    if (showToasts) {
      toast.info("正在生成语音...");
    }

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
      if (showToasts) {
        toast.success("语音生成完成，开始播放");
      }
      await playAudioFromBuffer(audioBuffer);
      console.log("✅ 新生成音频播放完成");
      if (showToasts) {
        toast.success("语音播放完成");
      }
    } else {
      if (showToasts) {
        toast.warning("语音合成返回了空数据");
      }
    }
  } catch (error) {
    console.error("❌ 语音播放失败:", error);
    if (showToasts) {
      toast.error(
        `语音播放失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
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

  const emoji = emojiReg();
  const cleanContent = text.replace(emoji, "").trim();

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
