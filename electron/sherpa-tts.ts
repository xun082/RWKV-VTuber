/**
 * Sherpa-ONNX TTS 语音合成模块
 */
import * as path from "path";
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
    console.log("[Sherpa-TTS] 模块已加载");
    return true;
  }

  try {
    // 使用共享的 sherpa-onnx 实例
    sherpa_onnx = await getSharedSherpaONNX();

    if (typeof sherpa_onnx?.createOfflineTts === "function") {
      console.log("[Sherpa-TTS] ✅ TTS 模块初始化成功");
      return true;
    }

    console.error("[Sherpa-TTS] ❌ createOfflineTts 方法不可用");
    return false;
  } catch (error: any) {
    console.error("[Sherpa-TTS] ❌ 模块加载失败:", error.message);
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
    console.log("[Sherpa-TTS] 使用现有 TTS 实例");
    return ttsInstance;
  }

  // 配置变化了，需要释放旧实例
  if (ttsInstance) {
    console.log("[Sherpa-TTS] 配置已变化，释放旧实例");
    try {
      ttsInstance.free();
    } catch (e) {
      console.warn("[Sherpa-TTS] 释放旧实例失败:", e);
    }
    ttsInstance = null;
  }

  // 创建新实例
  console.log("[Sherpa-TTS] 创建新的 TTS 实例");
  console.log("[Sherpa-TTS] 调用前 - sherpa_onnx 类型:", typeof sherpa_onnx);
  console.log(
    "[Sherpa-TTS] 调用前 - createOfflineTts 类型:",
    typeof sherpa_onnx?.createOfflineTts
  );

  let result;
  try {
    result = sherpa_onnx.createOfflineTts(offlineTtsConfig);
  } catch (e: any) {
    // 只记录错误信息，直接抛出原始错误
    console.error("[Sherpa-TTS] createOfflineTts 抛出异常:");
    console.error("  错误:", e);
    console.error("  错误消息:", e.message);
    console.error("  错误类型:", typeof e);
    console.error("  错误堆栈:", e.stack);
    // 直接抛出原始错误
    throw e;
  }

  console.log("[Sherpa-TTS] createOfflineTts 返回值类型:", typeof result);
  console.log("[Sherpa-TTS] createOfflineTts 返回值:", result);

  // 检查返回值是否是数字（错误码）
  if (typeof result === "number") {
    // 记录详细的错误码信息
    console.error("[Sherpa-TTS] createOfflineTts 返回错误码:");
    console.error("  错误码 (十进制):", result);
    console.error("  错误码 (十六进制):", `0x${result.toString(16)}`);
    console.error("  错误码 (二进制):", result.toString(2));

    // 抛出包含原始错误码的错误
    throw new Error(`createOfflineTts failed with error code: ${result}`);
  }

  // 检查返回值是否有效
  if (!result || typeof result !== "object") {
    console.error("[Sherpa-TTS] 返回值无效，类型:", typeof result);
    throw new Error(`Invalid TTS instance, got type: ${typeof result}`);
  }

  // 检查是否有 generate 方法
  if (typeof result.generate !== "function") {
    const availableMethods = Object.keys(result || {});
    console.error("[Sherpa-TTS] TTS 实例缺少 generate 方法");
    console.error("  可用方法:", availableMethods);
    throw new Error(
      `TTS instance missing generate method. Available methods: ${availableMethods.join(
        ", "
      )}`
    );
  }

  ttsInstance = result;
  currentConfig = configKey;

  console.log("[Sherpa-TTS] TTS 实例创建成功");

  return ttsInstance;
}

// 路径解析已移至 paths.ts 模块

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

  const startTime = Date.now();

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

  // 构建配置（完全匹配用户的 demo 代码结构）
  const offlineTtsMatchaModelConfig = {
    acousticModel: acousticModelPath,
    vocoder: vocoderPath,
    lexicon: lexiconPath,
    tokens: tokensPath,
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
    ruleFsts: ruleFsts,
  };

  // 打印配置以便调试
  console.log("[Sherpa-TTS] 配置:", JSON.stringify(offlineTtsConfig, null, 2));
  console.log("[Sherpa-TTS] sherpa_onnx 类型:", typeof sherpa_onnx);
  console.log(
    "[Sherpa-TTS] createOfflineTts 类型:",
    typeof sherpa_onnx?.createOfflineTts
  );

  // 获取或创建 TTS 实例（使用单例模式）
  try {
    console.log("[Sherpa-TTS] 获取 TTS 实例...");
    console.log("[Sherpa-TTS] 模型路径:");
    console.log(`  - 声学模型: ${acousticModelPath}`);
    console.log(`  - Vocoder: ${vocoderPath}`);
    console.log(`  - 词典: ${lexiconPath}`);
    console.log(`  - Tokens: ${tokensPath}`);
    console.log(`  - Rule FSTs: ${ruleFsts || "(无)"}`);

    const tts = getTtsInstance(offlineTtsConfig);

    console.log("[Sherpa-TTS] TTS 实例类型:", typeof tts);

    if (!tts || typeof tts !== "object") {
      throw new Error(`TTS 实例无效: createOfflineTts 返回了 ${typeof tts}`);
    }

    if (typeof tts.generate !== "function") {
      console.log("[Sherpa-TTS] TTS 实例的属性:", Object.keys(tts || {}));
      throw new Error("TTS 实例缺少 generate 方法");
    }

    console.log("[Sherpa-TTS] 开始生成语音...");
    console.log(`[Sherpa-TTS] 文本长度: ${args.text.length} 字符`);
    console.log(`[Sherpa-TTS] 速度: ${args.speed}`);

    const audio = tts.generate({
      text: args.text,
      sid: 0,
      speed: args.speed,
    });

    if (!audio?.samples || !audio?.sampleRate) {
      throw new Error("语音生成失败：未返回音频数据");
    }

    console.log(
      `[Sherpa-TTS] 音频生成成功: ${audio.samples.length} samples, ${audio.sampleRate}Hz`
    );

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

    const elapsed = Date.now() - startTime;
    console.log(
      `[Sherpa-TTS] 合成完成 (${(elapsed / 1000).toFixed(2)}s, ${
        audio.samples.length
      } samples)`
    );

    return { audio: Array.from(wavBuffer) };
  } catch (error: any) {
    // 只记录错误信息到控制台，方便排查
    console.error("[Sherpa-TTS] 生成语音失败:");
    console.error("  错误:", error);
    console.error("  错误消息:", error.message);
    console.error("  错误类型:", typeof error);
    console.error("  错误堆栈:", error.stack);
    console.error("  文本 (前50字符):", args.text.substring(0, 50) + "...");
    console.error("  文本长度:", args.text.length);
    console.error("  速度参数:", args.speed);

    // 直接抛出原始错误，不修改
    throw error;
  }
  // 注意：不要在这里释放实例！实例会被复用
}
