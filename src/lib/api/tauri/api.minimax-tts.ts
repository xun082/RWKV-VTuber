// 使用Tauri 2.x 的正确导入方式
declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
    };
  }
}

const invoke = async (cmd: string, args?: any): Promise<any> => {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    console.log("🦀 Calling Tauri command:", cmd, "with args:", args);
    return window.__TAURI_INTERNALS__.invoke(cmd, args);
  }
  throw new Error("Tauri internals not available");
};
import emojiReg from "emoji-regex";
import { get } from "../../utils.ts";
import {
  type MinimaxTTSConfig,
  validateMinimaxConfig,
} from "../shared/api.minimax-tts.ts";

export const speak_minimax_tauri = async (
  text: string
): Promise<{ audio: Uint8Array }> => {
  try {
    const emoji = emojiReg();
    const t = text.replace(emoji, "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }

    const config = (await get("minimax_tts_config")) as MinimaxTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("MiniMax TTS 服务未启用");
    }

    const errors = validateMinimaxConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 限制文本长度
    if (t.length > 10000) {
      throw new Error("文本长度不能超过10000字符");
    }

    console.log("🦀 使用 Tauri Rust 后端调用 MiniMax TTS...");

    // 调用 Tauri 命令
    const response = await invoke("minimax_tts", {
      apiKey: config.apiKey,
      groupId: config.groupId,
      model: config.model,
      text: t,
      voiceId: config.voiceId,
      speed: config.speed,
      volume: config.volume,
      pitch: config.pitch,
      sampleRate: config.sampleRate,
      audioFormat: config.audioFormat,
    });

    // 将 number[] 转换为 Uint8Array
    const audioArray = new Uint8Array((response as { audio: number[] }).audio);

    console.log(`✅ Tauri TTS 合成成功，音频大小: ${audioArray.length} bytes`);

    return { audio: audioArray };
  } catch (e) {
    console.error("❌ Tauri TTS 合成失败:", e);
    throw new Error(
      `Tauri TTS 合成失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

export const test_minimax_tauri = async (): Promise<boolean> => {
  try {
    const config = (await get("minimax_tts_config")) as MinimaxTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("MiniMax TTS 服务未启用");
    }

    const errors = validateMinimaxConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 测试用简短文本
    const testResult = await speak_minimax_tauri("测试");
    return testResult.audio.length > 0;
  } catch (e) {
    throw new Error(
      `Tauri TTS 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};
