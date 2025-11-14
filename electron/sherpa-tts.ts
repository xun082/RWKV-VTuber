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
    result = sherpa_onnx.createOfflineTts(offlineTtsConfig);
  } catch (e: any) {
    console.error("[Sherpa-TTS] createOfflineTts 异常:", e.message);
    throw e;
  }

  // 检查返回值是否是数字（错误码）
  if (typeof result === "number") {
    throw new Error(`createOfflineTts failed with error code: ${result}`);
  }

  // 检查返回值是否有效
  if (!result || typeof result !== "object") {
    throw new Error(`Invalid TTS instance, got type: ${typeof result}`);
  }

  // 检查是否有 generate 方法
  if (typeof result.generate !== "function") {
    throw new Error("TTS instance missing generate method");
  }

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

  // 解析所有路径（使用跨平台路径管理）
  const acousticModelPath = resolveModelPath(args.acousticModel);
  const vocoderPath = resolveModelPath(args.vocoder);
  const lexiconPath = resolveModelPath(args.lexicon);
  const tokensPath = resolveModelPath(args.tokens);

  // 验证文件存在
  const filesToCheck = [
    { path: acousticModelPath, name: "声学模型" },
    { path: vocoderPath, name: "Vocoder" },
    { path: lexiconPath, name: "词典" },
    { path: tokensPath, name: "Tokens" },
  ];

  for (const file of filesToCheck) {
    if (!fsSync.existsSync(file.path)) {
      throw new Error(`${file.name}文件不存在: ${file.path}`);
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

  try {
    const tts = getTtsInstance(offlineTtsConfig);

    if (!tts || typeof tts !== "object") {
      throw new Error(`TTS 实例无效: createOfflineTts 返回了 ${typeof tts}`);
    }

    if (typeof tts.generate !== "function") {
      throw new Error("TTS 实例缺少 generate 方法");
    }

    const audio = tts.generate({
      text: args.text,
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
