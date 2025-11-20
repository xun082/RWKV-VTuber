import * as fsSync from "fs";
import { resolveModelPath } from "./paths.js";
import { getSharedSherpaONNX } from "./sherpa-shared.js";

// TTS 配置接口
export interface SherpaTTSGenerateArgs {
  text: string;
  acousticModel: string;
  vocoder: string;
  lexicon: string;
  tokens: string;
  noiseScale: number;
  lengthScale: number;
  numThreads: number;
  speed: number;
  ruleFsts: string;
}

/**
 * 移除文本中的 emoji 表情符号
 */
function removeEmojis(text: string): string {
  // 使用 Unicode 范围移除 emoji
  return text.replace(
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    ""
  );
}

/**
 * 验证路径是否包含可能导致问题的字符（Windows 特定）
 */
function validatePath(path: string): { valid: boolean; warning?: string } {
  if (process.platform !== "win32") {
    return { valid: true };
  }

  // Windows 不允许的字符（除了路径分隔符）
  const invalidChars = /[<>"|?*]/;
  if (invalidChars.test(path)) {
    return {
      valid: false,
      warning: `路径包含非法字符: ${path}`,
    };
  }

  // 检查是否包含非 ASCII 字符（可能导致编码问题）
  const hasNonAscii = /[^\x00-\x7F]/.test(path);
  if (hasNonAscii) {
    return {
      valid: true,
      warning: `路径包含非 ASCII 字符（如中文），可能在某些系统配置下导致问题: ${path}`,
    };
  }

  return { valid: true };
}

// TTS 模块引用（从共享模块获取）
let sherpa_onnx: any = null;
// TTS 实例单例（关键：不要每次都创建和释放）
let ttsInstance: any = null;
let currentConfig: string = ""; // 用于检测配置是否变化

/**
 * 初始化 Sherpa-ONNX TTS（使用共享模块）
 */
export async function initSherpaTTS(): Promise<boolean> {
  if (sherpa_onnx) {
    return true;
  }

  try {
    sherpa_onnx = await getSharedSherpaONNX();
    if (typeof sherpa_onnx?.createOfflineTts === "function") {
      return true;
    }
    console.error("[Sherpa-TTS] createOfflineTts 方法不可用");
    return false;
  } catch (error: any) {
    console.error("[Sherpa-TTS] 模块加载失败:", error.message);
    return false;
  }
}

/**
 * 创建或获取 TTS 实例（单例模式）
 */
function getTtsInstance(offlineTtsConfig: any): any {
  const configKey = JSON.stringify(offlineTtsConfig);

  // 如果配置没变且实例存在，直接返回
  if (ttsInstance && currentConfig === configKey) {
    return ttsInstance;
  }

  // 配置变化了，需要释放旧实例
  if (ttsInstance) {
    try {
      ttsInstance.free();
    } catch (e) {
      console.warn("[Sherpa-TTS] 释放旧实例失败:", e);
    }
    ttsInstance = null;
  }

  // 创建新实例
  let result;
  try {
    console.log("[Sherpa-TTS] 正在创建 TTS 实例...");
    result = sherpa_onnx.createOfflineTts(offlineTtsConfig);
    console.log("[Sherpa-TTS] createOfflineTts 返回类型:", typeof result);
  } catch (e: any) {
    console.error("[Sherpa-TTS] createOfflineTts 异常:", e.message);
    console.error(
      "[Sherpa-TTS] 配置:",
      JSON.stringify(offlineTtsConfig, null, 2)
    );
    throw new Error(`创建 TTS 实例异常: ${e.message}`);
  }

  // 检查返回值是否是数字（错误码）
  if (typeof result === "number") {
    // 将错误码转换为十六进制，可能更容易诊断
    const hexCode = result.toString(16);
    console.error(
      "[Sherpa-TTS] createOfflineTts 返回错误码:",
      result,
      `(0x${hexCode})`
    );
    console.error("[Sherpa-TTS] 配置信息:");
    console.error(
      "  - acousticModel:",
      offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig
        .acousticModel
    );
    console.error(
      "  - vocoder:",
      offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig.vocoder
    );
    console.error(
      "  - lexicon:",
      offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig.lexicon
    );
    console.error(
      "  - tokens:",
      offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig.tokens
    );

    throw new Error(
      `创建 TTS 实例失败，错误码: ${result} (0x${hexCode})。` +
        `可能原因：1) 模型文件损坏或不兼容 2) 路径包含特殊字符 3) 文件编码问题 4) 权限不足。` +
        `请检查模型文件完整性和路径配置。`
    );
  }

  // 检查返回值是否有效
  if (!result || typeof result !== "object") {
    throw new Error(`Invalid TTS instance, got type: ${typeof result}`);
  }

  // 检查是否有 generate 方法
  if (typeof result.generate !== "function") {
    throw new Error("TTS instance missing generate method");
  }

  console.log("[Sherpa-TTS] ✓ TTS 实例创建成功");

  ttsInstance = result;
  currentConfig = configKey;

  return ttsInstance;
}

/**
 * 创建 WAV 文件头
 */
function createWavHeader(
  dataLength: number,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
}

/**
 * 生成语音
 */
export async function generateSpeech(
  args: SherpaTTSGenerateArgs,
  resourcesPath?: string
): Promise<{ audio: number[] }> {
  if (!sherpa_onnx) {
    throw new Error("Sherpa-ONNX TTS 模块未初始化");
  }

  // 移除 emoji 表情符号
  const cleanText = removeEmojis(args.text);
  if (cleanText.trim().length === 0) {
    throw new Error("文本为空或仅包含表情符号");
  }

  // 解析所有路径（使用跨平台路径管理）
  const acousticModelPath = resolveModelPath(args.acousticModel);
  const vocoderPath = resolveModelPath(args.vocoder);
  const lexiconPath = resolveModelPath(args.lexicon);
  const tokensPath = resolveModelPath(args.tokens);

  // 验证文件存在和可读性
  const filesToCheck = [
    { path: acousticModelPath, name: "声学模型" },
    { path: vocoderPath, name: "Vocoder" },
    { path: lexiconPath, name: "词典" },
    { path: tokensPath, name: "Tokens" },
  ];

  for (const file of filesToCheck) {
    // 路径字符验证（Windows）
    const pathValidation = validatePath(file.path);
    if (!pathValidation.valid) {
      throw new Error(`${file.name}路径验证失败: ${pathValidation.warning}`);
    }
    if (pathValidation.warning) {
      console.warn(`[Sherpa-TTS] ⚠️ ${file.name}: ${pathValidation.warning}`);
    }

    if (!fsSync.existsSync(file.path)) {
      throw new Error(`${file.name}文件不存在: ${file.path}`);
    }

    // 检查文件是否可读
    try {
      fsSync.accessSync(file.path, fsSync.constants.R_OK);
    } catch (e) {
      throw new Error(`${file.name}文件无法读取（权限问题）: ${file.path}`);
    }

    // 检查文件大小
    const stats = fsSync.statSync(file.path);
    if (stats.size === 0) {
      throw new Error(`${file.name}文件为空: ${file.path}`);
    }

    console.log(
      `[Sherpa-TTS] ✓ ${file.name}验证通过: ${file.path} (${(
        stats.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    // Windows 路径长度检查
    if (process.platform === "win32" && file.path.length > 260) {
      console.warn(
        `[Sherpa-TTS] ⚠️ 路径可能过长 (${file.path.length} 字符): ${file.path}`
      );
    }
  }

  // 处理 ruleFsts（使用跨平台路径管理）
  let ruleFsts = "";
  if (args.ruleFsts?.trim()) {
    const existingFsts = args.ruleFsts
      .split(",")
      .map((fst) => resolveModelPath(fst.trim()))
      .filter((fst) => fsSync.existsSync(fst));

    ruleFsts = existingFsts.join(",");
  }

  // ⚠️ Windows 兼容性修复：将所有反斜杠转换为正斜杠
  // sherpa-onnx native 模块在 Windows 上也能识别 Unix 风格路径
  const toUnixPath = (p: string) => p.replace(/\\/g, "/");
  const normalizedAcousticModel = toUnixPath(acousticModelPath);
  const normalizedVocoder = toUnixPath(vocoderPath);
  const normalizedLexicon = toUnixPath(lexiconPath);
  const normalizedTokens = toUnixPath(tokensPath);
  const normalizedRuleFsts = ruleFsts ? toUnixPath(ruleFsts) : "";

  // 构建配置
  const offlineTtsMatchaModelConfig = {
    acousticModel: normalizedAcousticModel,
    vocoder: normalizedVocoder,
    lexicon: normalizedLexicon,
    tokens: normalizedTokens,
    noiseScale: args.noiseScale,
    lengthScale: args.lengthScale,
  };

  const offlineTtsModelConfig = {
    offlineTtsMatchaModelConfig,
    numThreads: args.numThreads,
    debug: 1,
    provider: "cpu",
  };

  const offlineTtsConfig = {
    offlineTtsModelConfig,
    maxNumSentences: 1,
    ruleFsts: normalizedRuleFsts,
  };

  // 输出详细的诊断信息（特别是 Windows）
  if (process.platform === "win32") {
    console.log("[Sherpa-TTS] Windows 诊断信息:");
    console.log(
      "  - 声学模型:",
      normalizedAcousticModel,
      `(长度: ${normalizedAcousticModel.length})`
    );
    console.log(
      "  - Vocoder:",
      normalizedVocoder,
      `(长度: ${normalizedVocoder.length})`
    );
    console.log(
      "  - 词典:",
      normalizedLexicon,
      `(长度: ${normalizedLexicon.length})`
    );
    console.log(
      "  - Tokens:",
      normalizedTokens,
      `(长度: ${normalizedTokens.length})`
    );
    console.log("  - RuleFsts:", normalizedRuleFsts || "(无)");
    console.log("  - 文本:", cleanText.substring(0, 100));
  }

  try {
    const tts = getTtsInstance(offlineTtsConfig);

    if (!tts || typeof tts !== "object") {
      throw new Error(`TTS 实例无效: createOfflineTts 返回了 ${typeof tts}`);
    }

    if (typeof tts.generate !== "function") {
      throw new Error("TTS 实例缺少 generate 方法");
    }

    const audio = tts.generate({
      text: cleanText,
      sid: 0,
      speed: args.speed,
    });

    if (!audio?.samples || !audio?.sampleRate) {
      throw new Error("语音生成失败：未返回音频数据");
    }

    // 转换为 WAV 格式
    const pcm16 = new Int16Array(audio.samples.length);
    for (let i = 0; i < audio.samples.length; i++) {
      const s = Math.max(-1, Math.min(1, audio.samples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const wavHeader = createWavHeader(
      pcm16.length * 2,
      audio.sampleRate,
      1,
      16
    );
    const wavBuffer = new Uint8Array(wavHeader.length + pcm16.length * 2);
    wavBuffer.set(wavHeader, 0);
    wavBuffer.set(new Uint8Array(pcm16.buffer), wavHeader.length);

    return { audio: Array.from(wavBuffer) };
  } catch (error: any) {
    console.error("[Sherpa-TTS] 生成语音失败:", error.message);
    throw error;
  }
}
