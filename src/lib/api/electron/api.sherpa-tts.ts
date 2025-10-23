import emojiRegex from "emoji-regex";
import { get } from "../shared/api.store";
import type { SherpaTTSConfig } from "../../../stores/useSherpaTtsConfig";
import { DEFAULT_SHERPA_TTS_CONFIG } from "../../../stores/useSherpaTtsConfig";

const emoji = emojiRegex();

export const validateSherpaTTSConfig = (config: SherpaTTSConfig): string[] => {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors;
  }

  if (!config.acousticModel?.trim()) {
    errors.push("声学模型路径不能为空");
  }

  if (!config.vocoder?.trim()) {
    errors.push("Vocoder模型路径不能为空");
  }

  if (!config.lexicon?.trim()) {
    errors.push("词典文件路径不能为空");
  }

  if (!config.tokens?.trim()) {
    errors.push("Tokens文件路径不能为空");
  }

  return errors;
};

// Sherpa-ONNX TTS 语音合成
const speak_sherpa_tts = async (
  text: string
): Promise<{ audio: Uint8Array }> => {
  try {
    const t = text.replace(new RegExp(emoji, "g"), "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }

    const config = (await get("sherpa_tts_config")) as SherpaTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("Sherpa-ONNX TTS 服务未启用");
    }

    const errors = validateSherpaTTSConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 调用 Electron IPC
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error("Electron API 不可用");
    }

    console.log("🎙️ [Sherpa-TTS] 开始合成语音...");
    console.log(
      `📝 [Sherpa-TTS] 文本: ${t.substring(0, 50)}${t.length > 50 ? "..." : ""}`
    );

    const result = await electronAPI.invoke("sherpa_tts_generate", {
      text: t,
      acousticModel: config.acousticModel,
      vocoder: config.vocoder,
      lexicon: config.lexicon,
      tokens: config.tokens,
      noiseScale: config.noiseScale,
      lengthScale: config.lengthScale,
      numThreads: config.numThreads,
      speed: config.speed,
      ruleFsts: config.ruleFsts,
    });

    if (!result || !result.audio) {
      throw new Error("语音合成失败：未返回音频数据");
    }

    console.log(
      `✅ [Sherpa-TTS] 合成成功，音频大小: ${result.audio.length} bytes`
    );

    return { audio: new Uint8Array(result.audio) };
  } catch (e) {
    console.error("❌ [Sherpa-TTS] 合成失败:", e);
    throw new Error(
      `Sherpa-ONNX TTS 错误: ${e instanceof Error ? e.message : e}`
    );
  }
};

// 测试 Sherpa-ONNX TTS 连接
const test_sherpa_tts = async (): Promise<boolean> => {
  try {
    const config = (await get("sherpa_tts_config")) as SherpaTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("Sherpa-ONNX TTS 服务未启用");
    }

    const errors = validateSherpaTTSConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 测试语音合成
    const testText = "这是一个测试。";
    await speak_sherpa_tts(testText);
    return true;
  } catch (e) {
    throw new Error(
      `Sherpa-ONNX TTS 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

export { speak_sherpa_tts, test_sherpa_tts };
