import * as fsSync from "fs";
import * as path from "path";
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
 * 验证文件路径
 */
function validateFilePath(filePath: string): void {
  if (!fsSync.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stats = fsSync.statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`文件为空: ${filePath}`);
  }

  try {
    fsSync.accessSync(filePath, fsSync.constants.R_OK);
  } catch {
    throw new Error(`文件无法读取: ${filePath}`);
  }
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
    if (!sherpa_onnx?.createOfflineTts) {
      throw new Error("TTS 模块缺少必要方法");
    }
    console.log("[Sherpa-TTS] ✓ 初始化成功");
    return true;
  } catch (error: any) {
    console.error("[Sherpa-TTS] ✗ 初始化失败:", error?.message || error);
    return false;
  }
}

/**
 * 创建或获取 TTS 实例（单例模式）
 */
function getTtsInstance(offlineTtsConfig: any): any {
  const configKey = JSON.stringify(offlineTtsConfig);

  // 复用已有实例
  if (ttsInstance && currentConfig === configKey) {
    return ttsInstance;
  }

  // 释放旧实例
  if (ttsInstance) {
    try {
      ttsInstance.free?.();
    } catch {}
    ttsInstance = null;
  }

  console.log("[Sherpa-TTS] 创建 TTS 实例...");

  // 调用 native 方法创建实例
  const result = sherpa_onnx.createOfflineTts(offlineTtsConfig);

  // Windows 特定问题：检查是否返回了内存地址而不是对象
  if (typeof result === "number") {
    const hexCode = result.toString(16);
    console.error("[Sherpa-TTS] ✗ 返回了错误码/内存地址:", `0x${hexCode}`);
    console.error("[Sherpa-TTS] 配置:", {
      acousticModel:
        offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig
          .acousticModel,
      vocoder:
        offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig
          .vocoder,
      lexicon:
        offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig
          .lexicon,
      tokens:
        offlineTtsConfig.offlineTtsModelConfig.offlineTtsMatchaModelConfig
          .tokens,
    });

    throw new Error(
      `TTS 实例创建失败 (错误码: 0x${hexCode})。\n` +
        `这通常是由于：\n` +
        `1. 模型文件损坏或版本不兼容\n` +
        `2. sherpa-onnx 版本与模型不匹配\n` +
        `3. Windows 路径编码问题\n` +
        `建议：重新下载模型文件并使用纯英文路径`
    );
  }

  // 验证返回值
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.generate !== "function"
  ) {
    throw new Error(`TTS 实例无效 (类型: ${typeof result})`);
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
  // 检查模块状态
  if (!sherpa_onnx?.createOfflineTts) {
    throw new Error("TTS 模块未初始化");
  }

  // 移除 emoji 表情符号
  const cleanText = removeEmojis(args.text);
  if (cleanText.trim().length === 0) {
    throw new Error("文本为空或仅包含表情符号");
  }

  // 解析并验证所有路径
  const acousticModelPath = path.resolve(resolveModelPath(args.acousticModel));
  const vocoderPath = path.resolve(resolveModelPath(args.vocoder));
  const lexiconPath = path.resolve(resolveModelPath(args.lexicon));
  const tokensPath = path.resolve(resolveModelPath(args.tokens));

  // 批量验证文件
  try {
    validateFilePath(acousticModelPath);
    validateFilePath(vocoderPath);
    validateFilePath(lexiconPath);
    validateFilePath(tokensPath);
  } catch (error: any) {
    throw new Error(`模型文件验证失败: ${error.message}`);
  }

  // 处理 ruleFsts（可选）
  const ruleFsts = args.ruleFsts?.trim()
    ? args.ruleFsts
        .split(",")
        .map((fst) => path.resolve(resolveModelPath(fst.trim())))
        .filter((fst) => fsSync.existsSync(fst))
        .join(",")
    : "";

  // 构建配置对象
  const offlineTtsConfig = {
    offlineTtsModelConfig: {
      offlineTtsMatchaModelConfig: {
        acousticModel: acousticModelPath,
        vocoder: vocoderPath,
        lexicon: lexiconPath,
        tokens: tokensPath,
        noiseScale: args.noiseScale,
        lengthScale: args.lengthScale,
      },
      numThreads: args.numThreads,
      debug: 0, // 关闭 debug 日志
      provider: "cpu",
    },
    maxNumSentences: 1,
    ruleFsts,
  };

  // 生成语音
  const tts = getTtsInstance(offlineTtsConfig);
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

  const wavHeader = createWavHeader(pcm16.length * 2, audio.sampleRate, 1, 16);
  const wavBuffer = new Uint8Array(wavHeader.length + pcm16.length * 2);
  wavBuffer.set(wavHeader, 0);
  wavBuffer.set(new Uint8Array(pcm16.buffer), wavHeader.length);

  return { audio: Array.from(wavBuffer) };
}
