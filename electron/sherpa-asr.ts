/**
 * Sherpa-ONNX ASR 实时流式语音识别模块
 */
import * as path from "path";
import * as fsSync from "fs";
import { resolveModelPath } from "./paths.js";
import { getSharedSherpaONNX } from "./sherpa-shared.js";

// ASR 模块状态（使用共享的 sherpa_onnx 实例）
let sherpa_onnx: any = null;
let recognizer: any = null;
let currentStream: any = null;
let isInitialized = false;

// 语音会话管理
class SpeechSession {
  sentences: Array<{ text: string; timestamp: string }> = [];
  currentText: string = "";
  lastUpdateTime: number = 0;

  addOrUpdateText(text: string): void {
    this.currentText = text;
    this.lastUpdateTime = Date.now();
  }

  finalizeSentenceIfNew(): boolean {
    const t = this.currentText.trim();
    if (!t) return false;

    const last = this.sentences[this.sentences.length - 1];
    if (!last || last.text !== t) {
      this.sentences.push({
        text: t,
        timestamp: new Date().toISOString(),
      });
    }
    this.currentText = "";
    return true;
  }

  shouldStartNewSession(now = Date.now()): boolean {
    return this.lastUpdateTime > 0 && now - this.lastUpdateTime > 10000;
  }
}

let currentSession = new SpeechSession();

/**
 * 初始化 Sherpa-ONNX 模块（使用共享实例）
 */
export async function initSherpaONNX(): Promise<boolean> {
  if (sherpa_onnx) {
    return true;
  }

  try {
    
    // 使用共享的 sherpa-onnx 实例
    sherpa_onnx = await getSharedSherpaONNX();

    if (!sherpa_onnx) {
      console.error("[Sherpa-ASR] ❌ 获取共享模块失败，返回值为空");
      return false;
    }


    // 检查必要的方法
    if (typeof sherpa_onnx.createOnlineRecognizer !== "function") {
      console.error("[Sherpa-ASR] ❌ createOnlineRecognizer 方法不可用");
      const availableMethods = Object.keys(sherpa_onnx)
        .filter((k) => typeof sherpa_onnx[k] === "function");
      console.error("[Sherpa-ASR] 可用方法:", availableMethods.join(", "));
      console.error("[Sherpa-ASR] 请检查 sherpa-onnx 模块是否正确安装");
      return false;
    }

    return true;
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || String(error);
    console.error("[Sherpa-ASR] ❌ 模块加载失败:", errorMsg);
    console.error("[Sherpa-ASR] 错误对象:", error);
    return false;
  }
}

/**
 * 初始化实时流式识别器（完全匹配参考代码 asr.js）
 */
export function initRecognizer(
  encoderPath: string,
  decoderPath: string,
  tokensPath: string
): boolean {
  if (!sherpa_onnx) {
    console.error("[Sherpa-ASR] 模块未加载，无法初始化识别器");
    return false;
  }


  // 解析路径
  const encoder = resolveModelPath(encoderPath);
  const decoder = resolveModelPath(decoderPath);
  const tokens = resolveModelPath(tokensPath);


  // 检查文件是否存在
  if (!fsSync.existsSync(encoder)) {
    console.error(`[Sherpa-ASR] ❌ Encoder 文件不存在: ${encoder}`);
    return false;
  }
  if (!fsSync.existsSync(decoder)) {
    console.error(`[Sherpa-ASR] ❌ Decoder 文件不存在: ${decoder}`);
    return false;
  }
  if (!fsSync.existsSync(tokens)) {
    console.error(`[Sherpa-ASR] ❌ Tokens 文件不存在: ${tokens}`);
    return false;
  }


  try {
    // 配置在线识别器（完全匹配参考代码 asr.js，不添加任何额外字段）
    const onlineParaformerModelConfig = {
      encoder,
      decoder,
    };

    const onlineModelConfig = {
      paraformer: onlineParaformerModelConfig,
      tokens,
    };

    // 端点检测配置（与参考代码完全一致）
    const recognizerConfig = {
      modelConfig: onlineModelConfig,
      enableEndpoint: 1,
      rule1MinTrailingSilence: 2.4,
      rule2MinTrailingSilence: 1.8,
      rule3MinUtteranceLength: 20,
    };

    // 验证方法存在性
    if (typeof sherpa_onnx.createOnlineRecognizer !== "function") {
      console.error("[Sherpa-ASR] ❌ createOnlineRecognizer 方法不存在");
      const methods = Object.keys(sherpa_onnx).filter(k => typeof sherpa_onnx[k] === "function");
      console.error("[Sherpa-ASR] 可用方法:", methods.join(", "));
      return false;
    }

    
    recognizer = sherpa_onnx.createOnlineRecognizer(recognizerConfig);

    if (!recognizer) {
      console.error("[Sherpa-ASR] ❌ createOnlineRecognizer 返回空值");
      return false;
    }

    isInitialized = true;
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || String(error);
    console.error("[Sherpa-ASR] ❌ 识别器初始化失败:", errorMsg);
    console.error("[Sherpa-ASR] 错误对象:", error);
    if (error?.stack) {
      console.error("[Sherpa-ASR] 错误堆栈:", error.stack);
    }
    isInitialized = false;
    return false;
  }
}

/**
 * 补充静音以冲出尾部字符
 */
function flushTailSilence(
  stream: any,
  recognizer: any,
  ms: number = 240
): void {
  const sampleRate = 16000;
  const numSamples = Math.floor((sampleRate * ms) / 1000);
  const zeros = new Float32Array(numSamples);

  stream.acceptWaveform(sampleRate, zeros);

  // 多解几轮
  for (let i = 0; i < 6; i++) {
    while (recognizer.isReady(stream)) {
      recognizer.decode(stream);
    }
  }
}

/**
 * 创建新的流
 */
export function createStream(): any {
  if (!recognizer) {
    throw new Error("识别器未初始化");
  }

  if (currentStream) {
    try {
      currentStream.free();
    } catch (e) {
      // 忽略清理错误
    }
  }

  currentStream = recognizer.createStream();
  return currentStream;
}

/**
 * 实时流式语音识别（单次完整音频）
 */
export async function transcribe(audioData: number[]): Promise<string> {
  if (!sherpa_onnx || !recognizer || !isInitialized) {
    console.error("[Sherpa-ASR] 模块状态:", {
      sherpa_onnx: !!sherpa_onnx,
      recognizer: !!recognizer,
      isInitialized,
    });
    throw new Error(
      "Sherpa-ONNX ASR 模块未初始化。请检查模型文件是否存在，或在设置中下载 ASR 模型。"
    );
  }

  const startTime = Date.now();

  // 跳过 WAV 文件头（前 44 字节）
  let pcmData = audioData;
  if (audioData.length > 44) {
    // 检查是否是 WAV 文件（RIFF 标识）
    if (
      audioData[0] === 0x52 &&
      audioData[1] === 0x49 &&
      audioData[2] === 0x46 &&
      audioData[3] === 0x46
    ) {
      pcmData = audioData.slice(44);
    }
  }

  // 转换为 Float32Array（16-bit PCM little-endian）
  const samples = new Float32Array(pcmData.length / 2);
  for (let i = 0; i < samples.length; i++) {
    // Little-endian: 低字节在前
    const int16 = pcmData[i * 2] | (pcmData[i * 2 + 1] << 8);
    const signed = int16 > 32767 ? int16 - 65536 : int16;
    samples[i] = signed / 32768.0;
  }


  // 创建流并处理
  const stream = recognizer.createStream();

  try {
    // 分段处理音频（模拟实时流）
    const chunkSize = 1600; // 每次处理 100ms (16000 * 0.1)
    let allText = "";

    for (let i = 0; i < samples.length; i += chunkSize) {
      const chunk = samples.slice(i, Math.min(i + chunkSize, samples.length));
      stream.acceptWaveform(16000, chunk);

      // 解码
      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }

      // 获取当前结果
      const result = recognizer.getResult(stream);
      if (result.text) {
        allText = result.text;
      }

      // 检查是否到达端点
      if (recognizer.isEndpoint(stream)) {
        flushTailSilence(stream, recognizer, 240);
        const finalResult = recognizer.getResult(stream);
        if (finalResult.text) {
          allText = finalResult.text;
        }
        recognizer.reset(stream);
      }
    }

    // 最后再补一次静音确保所有内容都识别完
    flushTailSilence(stream, recognizer, 240);
    const finalResult = recognizer.getResult(stream);
    if (finalResult.text) {
      allText = finalResult.text;
    }

    const elapsed = Date.now() - startTime;
    const duration = samples.length / 16000;


    return allText.trim();
  } finally {
    if (stream?.free) {
      try {
        stream.free();
      } catch (e) {
        // 忽略清理错误
      }
    }
  }
}

/**
 * 处理实时音频流片段（用于连续语音识别）
 */
export function processAudioChunk(audioChunk: Float32Array): {
  text: string;
  isEndpoint: boolean;
  isFinal: boolean;
} {
  if (!recognizer || !currentStream) {
    throw new Error("识别器或流未初始化");
  }

  // 接受音频数据
  currentStream.acceptWaveform(16000, audioChunk);

  // 解码
  while (recognizer.isReady(currentStream)) {
    recognizer.decode(currentStream);
  }

  // 获取结果
  const result = recognizer.getResult(currentStream);
  const isEndpoint = recognizer.isEndpoint(currentStream);

  let text = result.text || "";
  let isFinal = false;

  // 检查是否需要开始新会话
  const needNewSession = currentSession.shouldStartNewSession();

  if (text && text.length > 0) {
    currentSession.addOrUpdateText(text);
  }

  // 处理端点
  if (isEndpoint && text && text.trim().length > 0) {
    flushTailSilence(currentStream, recognizer, 240);
    const flushedResult = recognizer.getResult(currentStream);
    text = flushedResult.text || text;
    currentSession.addOrUpdateText(text);
    isFinal = currentSession.finalizeSentenceIfNew();
    recognizer.reset(currentStream);
  } else if (needNewSession) {
    isFinal = currentSession.finalizeSentenceIfNew();
    if (isFinal || currentSession.sentences.length > 0) {
      currentSession = new SpeechSession();
    }
  }

  return { text, isEndpoint, isFinal };
}

/**
 * 获取当前会话的所有已识别句子
 */
export function getSessionSentences(): Array<{
  text: string;
  timestamp: string;
}> {
  return currentSession.sentences;
}

/**
 * 重置当前会话
 */
export function resetSession(): void {
  currentSession = new SpeechSession();
  if (currentStream && recognizer) {
    recognizer.reset(currentStream);
  }
}

/**
 * 重新加载配置
 */
export function reloadConfig(
  encoderPath: string,
  decoderPath: string,
  tokensPath: string
): void {
  if (!sherpa_onnx) {
    throw new Error("Sherpa-ONNX 模块未加载");
  }

  // 清理旧的流
  if (currentStream) {
    try {
      currentStream.free();
      currentStream = null;
    } catch (e) {
      // 忽略错误
    }
  }

  // 重新初始化识别器
  const success = initRecognizer(encoderPath, decoderPath, tokensPath);
  if (!success) {
    throw new Error("识别器重新加载失败");
  }

  // 重置会话
  currentSession = new SpeechSession();
}

/**
 * 获取 Sherpa-ONNX 模块实例（供 TTS 使用）
 */
export function getSherpaONNX(): any {
  return sherpa_onnx;
}
