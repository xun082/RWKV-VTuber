import { get } from "../shared/api.store";
import type { SherpaTTSConfig } from "../../../stores/useSherpaTtsConfig";
import { errorLogger } from "../../error-logger";

/**
 * 验证 Sherpa TTS 配置
 */
const validateSherpaTTSConfig = (config: SherpaTTSConfig): string[] => {
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

/**
 * Sherpa-ONNX TTS 语音合成
 */
const speak_sherpa_tts = async (
  text: string
): Promise<{ audio: Uint8Array }> => {
  try {
    if (text.trim().length === 0) {
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

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error("Electron API 不可用");
    }

    console.log("[Sherpa-TTS] 开始合成语音...");
    console.log(
      `[Sherpa-TTS] 文本: ${text.substring(0, 50)}${
        text.length > 50 ? "..." : ""
      }`
    );

    const result = await electronAPI.invoke("sherpa_tts_generate", {
      text: text,
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
      `[Sherpa-TTS] 合成成功，音频大小: ${result.audio.length} bytes`
    );

    return { audio: new Uint8Array(result.audio) };
  } catch (e) {
    console.error("[Sherpa-TTS] 合成失败:", e);

    // 提取错误信息
    const errorMsg = e instanceof Error ? e.message : String(e);

    // 检查是否是错误码类型的错误
    const errorCodeMatch = errorMsg.match(/错误码[：:]\s*(\d+)/);
    let detailedError = errorMsg;

    if (errorCodeMatch) {
      const errorCode = errorCodeMatch[1];
      detailedError =
        `语音合成失败（错误码: ${errorCode}）。\n\n` +
        `可能的原因：\n` +
        `1. 模型文件损坏或不完整 - 请尝试重新下载模型\n` +
        `2. 路径包含特殊字符或中文 - 建议使用纯英文路径\n` +
        `3. 文件编码或权限问题 - 检查模型文件是否可访问\n` +
        `4. 系统配置兼容性问题 - 可能需要更新系统或依赖\n\n` +
        `详细信息: ${errorMsg}`;
    }

    errorLogger.logCustomError("Sherpa-ONNX TTS 语音合成失败", {
      model: "sherpa-tts",
      operation: "tts_synthesis",
      text: text.substring(0, 100),
      error: errorMsg,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    });

    throw new Error(detailedError);
  }
};

export { speak_sherpa_tts };
