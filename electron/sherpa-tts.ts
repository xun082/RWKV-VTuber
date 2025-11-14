/**
 * Sherpa-ONNX TTS 语音合成模块
 */
import * as path from "path";
import * as fsSync from "fs";
import * as os from "os";
import { resolveModelPath, getAppDataDir } from "./paths.js";
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

// 错误日志文件路径
let errorLogPath: string = "";

/**
 * 初始化错误日志系统
 */
function initErrorLog(): void {
  try {
    const logsDir = path.join(getAppDataDir(), "logs");
    if (!fsSync.existsSync(logsDir)) {
      fsSync.mkdirSync(logsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    errorLogPath = path.join(logsDir, `sherpa-tts-error-${timestamp}.log`);

    // 写入系统信息头部
    const systemInfo = [
      "=".repeat(80),
      "Sherpa-ONNX TTS 错误日志",
      "=".repeat(80),
      `时间: ${new Date().toLocaleString("zh-CN")}`,
      `平台: ${process.platform}`,
      `架构: ${process.arch}`,
      `Node 版本: ${process.version}`,
      `总内存: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      `可用内存: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      `CPU: ${os.cpus()[0]?.model || "未知"}`,
      `CPU 核心数: ${os.cpus().length}`,
      "=".repeat(80),
      "",
    ].join("\n");

    fsSync.writeFileSync(errorLogPath, systemInfo, "utf-8");
    console.log(`[Sherpa-TTS] 错误日志文件: ${errorLogPath}`);
  } catch (error) {
    console.error("[Sherpa-TTS] 无法创建错误日志文件:", error);
  }
}

/**
 * 写入错误日志
 */
function writeErrorLog(message: string): void {
  if (!errorLogPath) return;

  try {
    const timestamp = new Date().toLocaleString("zh-CN");
    const logEntry = `[${timestamp}] ${message}\n`;
    fsSync.appendFileSync(errorLogPath, logEntry, "utf-8");
  } catch (error) {
    console.error("[Sherpa-TTS] 无法写入错误日志:", error);
  }
}

/**
 * 检查系统资源是否充足
 */
function checkSystemResources(): {
  sufficient: boolean;
  warnings: string[];
  details: any;
} {
  const warnings: string[] = [];
  const freeMemoryGB = os.freemem() / 1024 / 1024 / 1024;
  const totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;
  const memoryUsagePercent =
    ((totalMemoryGB - freeMemoryGB) / totalMemoryGB) * 100;

  // 获取进程内存使用情况
  const processMemory = process.memoryUsage();
  const heapUsedMB = processMemory.heapUsed / 1024 / 1024;
  const heapTotalMB = processMemory.heapTotal / 1024 / 1024;
  const rssMB = processMemory.rss / 1024 / 1024;

  const details = {
    platform: process.platform,
    arch: process.arch,
    totalMemoryGB: totalMemoryGB.toFixed(2),
    freeMemoryGB: freeMemoryGB.toFixed(2),
    memoryUsagePercent: memoryUsagePercent.toFixed(2),
    processHeapUsedMB: heapUsedMB.toFixed(2),
    processHeapTotalMB: heapTotalMB.toFixed(2),
    processRssMB: rssMB.toFixed(2),
    cpuCount: os.cpus().length,
  };

  // 检查可用内存（TTS 模型通常需要至少 500MB 可用内存）
  if (freeMemoryGB < 0.5) {
    warnings.push(
      `⚠️ 可用内存不足: ${freeMemoryGB.toFixed(2)} GB (建议至少 0.5 GB)`
    );
  } else if (freeMemoryGB < 1.0) {
    warnings.push(
      `⚠️ 可用内存偏低: ${freeMemoryGB.toFixed(
        2
      )} GB (建议至少 1 GB 以确保稳定运行)`
    );
  }

  // 检查内存使用率
  if (memoryUsagePercent > 90) {
    warnings.push(
      `⚠️ 系统内存使用率过高: ${memoryUsagePercent.toFixed(2)}% (建议低于 80%)`
    );
  }

  // Windows 平台特殊检查
  if (process.platform === "win32") {
    warnings.push(
      "ℹ️ Windows 平台提示: 如遇到问题，请确保模型路径不含中文、空格或特殊字符"
    );

    // Windows 32 位检查
    if (process.arch === "ia32") {
      warnings.push(
        "⚠️ 检测到 32 位 Windows 系统，可能存在内存限制，建议使用 64 位系统"
      );
    }
  }

  const sufficient = freeMemoryGB >= 0.5 && memoryUsagePercent < 95;

  return { sufficient, warnings, details };
}

/**
 * 初始化 Sherpa-ONNX TTS（使用共享模块）
 */
export async function initSherpaTTS(): Promise<boolean> {
  // 初始化错误日志系统
  if (!errorLogPath) {
    initErrorLog();
  }

  // 检查系统资源
  const resourceCheck = checkSystemResources();
  const resourceInfo = [
    "\n" + "=".repeat(80),
    "系统资源检查",
    "=".repeat(80),
    `平台: ${resourceCheck.details.platform}`,
    `架构: ${resourceCheck.details.arch}`,
    `总内存: ${resourceCheck.details.totalMemoryGB} GB`,
    `可用内存: ${resourceCheck.details.freeMemoryGB} GB`,
    `内存使用率: ${resourceCheck.details.memoryUsagePercent}%`,
    `进程堆内存使用: ${resourceCheck.details.processHeapUsedMB} MB / ${resourceCheck.details.processHeapTotalMB} MB`,
    `进程 RSS 内存: ${resourceCheck.details.processRssMB} MB`,
    `CPU 核心数: ${resourceCheck.details.cpuCount}`,
    "",
  ];

  if (resourceCheck.warnings.length > 0) {
    resourceInfo.push("警告和提示:");
    resourceCheck.warnings.forEach((warning) => {
      resourceInfo.push(`  ${warning}`);
      console.warn(`[Sherpa-TTS] ${warning}`);
    });
  }

  resourceInfo.push("=".repeat(80) + "\n");
  writeErrorLog(resourceInfo.join("\n"));

  if (!resourceCheck.sufficient) {
    const errorMsg = "❌ 系统资源不足，可能无法正常运行 Sherpa-ONNX TTS";
    console.error(`[Sherpa-TTS] ${errorMsg}`);
    writeErrorLog(errorMsg);
    // 即使资源不足也继续尝试，但已记录警告
  }

  if (sherpa_onnx) {
    console.log("[Sherpa-TTS] 模块已加载");
    writeErrorLog("模块已加载，跳过重复初始化");
    return true;
  }

  try {
    writeErrorLog("开始加载 sherpa-onnx 模块...");

    // 使用共享的 sherpa-onnx 实例
    sherpa_onnx = await getSharedSherpaONNX();

    if (typeof sherpa_onnx?.createOfflineTts === "function") {
      const successMsg = "✅ TTS 模块初始化成功";
      console.log(`[Sherpa-TTS] ${successMsg}`);
      writeErrorLog(successMsg);
      return true;
    }

    const errorMsg = "❌ createOfflineTts 方法不可用";
    console.error(`[Sherpa-TTS] ${errorMsg}`);
    writeErrorLog(errorMsg);
    writeErrorLog(`模块类型: ${typeof sherpa_onnx}`);
    writeErrorLog(`可用方法: ${Object.keys(sherpa_onnx || {}).join(", ")}`);
    return false;
  } catch (error: any) {
    const errorMsg = `❌ 模块加载失败: ${error.message}`;
    console.error(`[Sherpa-TTS] ${errorMsg}`);
    writeErrorLog(errorMsg);
    writeErrorLog(`错误堆栈:\n${error.stack}`);
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
    writeErrorLog("使用现有 TTS 实例（配置未变化）");
    return ttsInstance;
  }

  // 配置变化了，需要释放旧实例
  if (ttsInstance) {
    console.log("[Sherpa-TTS] 配置已变化，释放旧实例");
    writeErrorLog("配置已变化，释放旧实例");
    try {
      ttsInstance.free();
      writeErrorLog("旧实例释放成功");
    } catch (e: any) {
      const warnMsg = `释放旧实例失败: ${e.message}`;
      console.warn(`[Sherpa-TTS] ${warnMsg}`);
      writeErrorLog(`⚠️ ${warnMsg}`);
    }
    ttsInstance = null;
  }

  // 创建新实例
  console.log("[Sherpa-TTS] 创建新的 TTS 实例");
  writeErrorLog("\n" + "-".repeat(80));
  writeErrorLog("创建新的 TTS 实例");
  writeErrorLog("-".repeat(80));

  writeErrorLog(`sherpa_onnx 模块类型: ${typeof sherpa_onnx}`);
  writeErrorLog(
    `createOfflineTts 方法类型: ${typeof sherpa_onnx?.createOfflineTts}`
  );
  writeErrorLog(`配置信息:\n${JSON.stringify(offlineTtsConfig, null, 2)}`);

  console.log("[Sherpa-TTS] 调用前 - sherpa_onnx 类型:", typeof sherpa_onnx);
  console.log(
    "[Sherpa-TTS] 调用前 - createOfflineTts 类型:",
    typeof sherpa_onnx?.createOfflineTts
  );

  let result;
  try {
    writeErrorLog("调用 createOfflineTts...");
    result = sherpa_onnx.createOfflineTts(offlineTtsConfig);
    writeErrorLog("createOfflineTts 调用完成");
  } catch (e: any) {
    // 记录详细错误信息到日志文件
    const errorDetails = [
      "\n" + "!".repeat(80),
      "❌ createOfflineTts 抛出异常",
      "!".repeat(80),
      `错误类型: ${typeof e}`,
      `错误消息: ${e.message}`,
      `错误代码: ${e.code || "无"}`,
      `错误名称: ${e.name || "无"}`,
      `错误堆栈:\n${e.stack || "无堆栈信息"}`,
      "!".repeat(80) + "\n",
    ].join("\n");

    writeErrorLog(errorDetails);

    console.error("[Sherpa-TTS] createOfflineTts 抛出异常:");
    console.error("  错误:", e);
    console.error("  错误消息:", e.message);
    console.error("  错误类型:", typeof e);
    console.error("  错误堆栈:", e.stack);

    // 直接抛出原始错误
    throw e;
  }

  writeErrorLog(`createOfflineTts 返回值类型: ${typeof result}`);
  console.log("[Sherpa-TTS] createOfflineTts 返回值类型:", typeof result);
  console.log("[Sherpa-TTS] createOfflineTts 返回值:", result);

  // 检查返回值是否是数字（错误码/内存地址）
  if (typeof result === "number") {
    // 记录详细的错误码信息
    const errorCodeDetails = [
      "\n" + "!".repeat(80),
      "❌ createOfflineTts 返回错误码/内存地址",
      "!".repeat(80),
      `错误码 (十进制): ${result}`,
      `错误码 (十六进制): 0x${result.toString(16)}`,
      `错误码 (二进制): ${result.toString(2)}`,
      "",
      "可能的原因:",
      "1. Windows 平台: 模型文件路径包含中文、空格或特殊字符",
      "2. 模型文件损坏或不完整",
      "3. 内存不足，无法加载模型",
      "4. 模型文件路径错误或文件不存在",
      "5. Native 模块版本不兼容",
      "",
      "建议的解决方案:",
      "1. 将模型文件移动到纯英文路径（无空格、无特殊字符）",
      "2. 重新下载模型文件",
      "3. 关闭其他应用程序释放内存",
      "4. 检查模型文件是否存在且完整",
      "5. 尝试使用其他 TTS 服务（如 MiniMax）",
      "!".repeat(80) + "\n",
    ].join("\n");

    writeErrorLog(errorCodeDetails);

    console.error("[Sherpa-TTS] createOfflineTts 返回错误码/内存地址:");
    console.error("  错误码 (十进制):", result);
    console.error("  错误码 (十六进制):", `0x${result.toString(16)}`);
    console.error("  错误码 (二进制):", result.toString(2));
    console.error("");
    console.error("  ⚠️ 提示: 如果您在 Windows 平台遇到此问题，");
    console.error("  可能是模型文件路径格式问题。请确保:");
    console.error("  1. 模型文件路径不包含中文或特殊字符");
    console.error("  2. 模型文件路径不包含空格");
    console.error("  3. 所有模型文件都存在且可访问");
    console.error(`  4. 详细日志已保存至: ${errorLogPath}`);

    // 抛出包含原始错误码的错误
    throw new Error(
      `createOfflineTts failed with error code: ${result} (日志文件: ${errorLogPath})`
    );
  }

  // 检查返回值是否有效
  if (!result || typeof result !== "object") {
    const errorMsg = `返回值无效，类型: ${typeof result}`;
    console.error(`[Sherpa-TTS] ${errorMsg}`);
    writeErrorLog(`❌ ${errorMsg}`);
    throw new Error(`Invalid TTS instance, got type: ${typeof result}`);
  }

  // 检查是否有 generate 方法
  if (typeof result.generate !== "function") {
    const availableMethods = Object.keys(result || {});
    const errorMsg = `TTS 实例缺少 generate 方法。可用方法: ${availableMethods.join(
      ", "
    )}`;
    console.error(`[Sherpa-TTS] ${errorMsg}`);
    writeErrorLog(`❌ ${errorMsg}`);
    throw new Error(
      `TTS instance missing generate method. Available methods: ${availableMethods.join(
        ", "
      )}`
    );
  }

  ttsInstance = result;
  currentConfig = configKey;

  console.log("[Sherpa-TTS] TTS 实例创建成功");
  writeErrorLog("✅ TTS 实例创建成功");

  return ttsInstance;
}

// 路径解析已移至 paths.ts 模块

/**
 * 验证路径是否包含可能导致问题的字符
 * Windows 平台的 native 模块对某些字符敏感
 */
function validatePathForWindows(filePath: string, name: string): void {
  if (process.platform !== "win32") {
    return; // 非 Windows 平台无需检查
  }

  // 检查是否包含中文字符
  if (/[\u4e00-\u9fa5]/.test(filePath)) {
    console.warn(`[Sherpa-TTS] ⚠️ ${name} 路径包含中文字符: ${filePath}`);
    console.warn("[Sherpa-TTS]    建议将模型文件移动到不含中文的路径下");
  }

  // 检查是否包含空格（虽然 Unix 风格路径应该能处理，但还是警告一下）
  if (filePath.includes(" ")) {
    console.warn(`[Sherpa-TTS] ⚠️ ${name} 路径包含空格: ${filePath}`);
    console.warn(
      "[Sherpa-TTS]    如果遇到问题，建议将模型文件移动到不含空格的路径下"
    );
  }
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
  // 确保错误日志已初始化
  if (!errorLogPath) {
    initErrorLog();
  }

  writeErrorLog("\n" + "=".repeat(80));
  writeErrorLog("开始生成语音");
  writeErrorLog("=".repeat(80));
  writeErrorLog(
    `文本: ${args.text.substring(0, 100)}${args.text.length > 100 ? "..." : ""}`
  );
  writeErrorLog(`文本长度: ${args.text.length} 字符`);
  writeErrorLog(`速度: ${args.speed}`);

  // 检查系统资源
  const resourceCheck = checkSystemResources();
  writeErrorLog(`当前可用内存: ${resourceCheck.details.freeMemoryGB} GB`);
  writeErrorLog(`进程内存使用: ${resourceCheck.details.processRssMB} MB`);

  if (!resourceCheck.sufficient) {
    writeErrorLog("⚠️ 警告: 系统资源可能不足");
    resourceCheck.warnings.forEach((warning) => {
      writeErrorLog(`  ${warning}`);
    });
  }

  if (!sherpa_onnx) {
    const errorMsg = "Sherpa-ONNX TTS 模块未初始化";
    writeErrorLog(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const startTime = Date.now();
  writeErrorLog(`开始时间: ${new Date(startTime).toLocaleString("zh-CN")}`);

  // 解析所有路径（使用跨平台路径管理）
  const acousticModelPath = resolveModelPath(args.acousticModel);
  const vocoderPath = resolveModelPath(args.vocoder);
  const lexiconPath = resolveModelPath(args.lexicon);
  const tokensPath = resolveModelPath(args.tokens);

  // 验证文件存在
  writeErrorLog("\n模型文件验证:");
  const filesToCheck = [
    { path: acousticModelPath, name: "声学模型" },
    { path: vocoderPath, name: "Vocoder" },
    { path: lexiconPath, name: "词典" },
    { path: tokensPath, name: "Tokens" },
  ];

  for (const file of filesToCheck) {
    if (!fsSync.existsSync(file.path)) {
      const errorMsg = `${file.name}文件不存在: ${file.path}`;
      writeErrorLog(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // 记录文件信息
    const stats = fsSync.statSync(file.path);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    writeErrorLog(`✅ ${file.name}: ${file.path} (${fileSizeMB} MB)`);

    // Windows 平台路径验证
    validatePathForWindows(file.path, file.name);
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
  // 这样可以避免路径解析错误导致的内存地址返回问题
  const toUnixPath = (p: string) => p.replace(/\\/g, "/");
  const normalizedAcousticModel = toUnixPath(acousticModelPath);
  const normalizedVocoder = toUnixPath(vocoderPath);
  const normalizedLexicon = toUnixPath(lexiconPath);
  const normalizedTokens = toUnixPath(tokensPath);
  const normalizedRuleFsts = ruleFsts ? toUnixPath(ruleFsts) : "";

  // 构建配置（完全匹配用户的 demo 代码结构）
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

  // 打印配置以便调试
  console.log("[Sherpa-TTS] 配置:", JSON.stringify(offlineTtsConfig, null, 2));
  console.log("[Sherpa-TTS] sherpa_onnx 类型:", typeof sherpa_onnx);
  console.log(
    "[Sherpa-TTS] createOfflineTts 类型:",
    typeof sherpa_onnx?.createOfflineTts
  );

  // 获取或创建 TTS 实例（使用单例模式）
  try {
    writeErrorLog("\n获取/创建 TTS 实例:");

    console.log("[Sherpa-TTS] 获取 TTS 实例...");
    console.log("[Sherpa-TTS] 模型路径（原始）:");
    console.log(`  - 声学模型: ${acousticModelPath}`);
    console.log(`  - Vocoder: ${vocoderPath}`);
    console.log(`  - 词典: ${lexiconPath}`);
    console.log(`  - Tokens: ${tokensPath}`);
    console.log(`  - Rule FSTs: ${ruleFsts || "(无)"}`);
    console.log("[Sherpa-TTS] 模型路径（归一化为 Unix 风格）:");
    console.log(`  - 声学模型: ${normalizedAcousticModel}`);
    console.log(`  - Vocoder: ${normalizedVocoder}`);
    console.log(`  - 词典: ${normalizedLexicon}`);
    console.log(`  - Tokens: ${normalizedTokens}`);
    console.log(`  - Rule FSTs: ${normalizedRuleFsts || "(无)"}`);

    const tts = getTtsInstance(offlineTtsConfig);

    console.log("[Sherpa-TTS] TTS 实例类型:", typeof tts);

    if (!tts || typeof tts !== "object") {
      throw new Error(`TTS 实例无效: createOfflineTts 返回了 ${typeof tts}`);
    }

    if (typeof tts.generate !== "function") {
      console.log("[Sherpa-TTS] TTS 实例的属性:", Object.keys(tts || {}));
      throw new Error("TTS 实例缺少 generate 方法");
    }

    writeErrorLog("\n开始生成语音:");
    writeErrorLog(`文本: "${args.text}"`);
    writeErrorLog(`SID: 0`);
    writeErrorLog(`速度: ${args.speed}`);

    console.log("[Sherpa-TTS] 开始生成语音...");
    console.log(`[Sherpa-TTS] 文本长度: ${args.text.length} 字符`);
    console.log(`[Sherpa-TTS] 速度: ${args.speed}`);

    const generateStartTime = Date.now();
    const audio = tts.generate({
      text: args.text,
      sid: 0,
      speed: args.speed,
    });
    const generateElapsed = Date.now() - generateStartTime;

    writeErrorLog(`生成耗时: ${(generateElapsed / 1000).toFixed(2)}s`);

    if (!audio?.samples || !audio?.sampleRate) {
      const errorMsg = "语音生成失败：未返回音频数据";
      writeErrorLog(`❌ ${errorMsg}`);
      writeErrorLog(`返回值: ${JSON.stringify(audio)}`);
      throw new Error(errorMsg);
    }

    writeErrorLog(
      `✅ 音频生成成功: ${audio.samples.length} samples, ${audio.sampleRate}Hz`
    );

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
    const wavSizeKB = (wavBuffer.length / 1024).toFixed(2);

    writeErrorLog("\n音频转换完成:");
    writeErrorLog(`WAV 文件大小: ${wavSizeKB} KB`);
    writeErrorLog(`总耗时: ${(elapsed / 1000).toFixed(2)}s`);
    writeErrorLog(`样本数: ${audio.samples.length}`);
    writeErrorLog(`采样率: ${audio.sampleRate}Hz`);

    // 记录最终系统资源状态
    const finalResourceCheck = checkSystemResources();
    writeErrorLog("\n最终系统资源状态:");
    writeErrorLog(`可用内存: ${finalResourceCheck.details.freeMemoryGB} GB`);
    writeErrorLog(
      `进程内存使用: ${finalResourceCheck.details.processRssMB} MB`
    );

    writeErrorLog("\n✅ 语音合成成功完成");
    writeErrorLog("=".repeat(80) + "\n");

    console.log(
      `[Sherpa-TTS] 合成完成 (${(elapsed / 1000).toFixed(2)}s, ${
        audio.samples.length
      } samples)`
    );

    return { audio: Array.from(wavBuffer) };
  } catch (error: any) {
    // 记录详细错误信息到日志文件
    const errorDetails = [
      "\n" + "!".repeat(80),
      "❌ 语音生成失败",
      "!".repeat(80),
      `时间: ${new Date().toLocaleString("zh-CN")}`,
      `错误类型: ${typeof error}`,
      `错误名称: ${error.name || "未知"}`,
      `错误消息: ${error.message}`,
      `错误代码: ${error.code || "无"}`,
      "",
      "输入参数:",
      `  文本 (前100字符): ${args.text.substring(0, 100)}${
        args.text.length > 100 ? "..." : ""
      }`,
      `  文本长度: ${args.text.length}`,
      `  速度: ${args.speed}`,
      `  线程数: ${args.numThreads}`,
      `  噪声系数: ${args.noiseScale}`,
      `  长度系数: ${args.lengthScale}`,
      "",
      "系统信息:",
      `  平台: ${process.platform}`,
      `  架构: ${process.arch}`,
      `  可用内存: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      `  进程内存: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      "",
      "错误堆栈:",
      error.stack || "无堆栈信息",
      "",
      "故障排查建议:",
      "1. 检查日志文件开头的系统资源信息",
      "2. 确认模型文件路径正确且文件完整",
      "3. 如果是 Windows 平台，确保路径不含中文/空格",
      "4. 尝试关闭其他应用程序释放内存",
      "5. 考虑使用其他 TTS 服务（如 MiniMax）",
      `6. 完整日志文件位置: ${errorLogPath}`,
      "!".repeat(80) + "\n",
    ].join("\n");

    writeErrorLog(errorDetails);

    // 控制台也输出错误信息
    console.error("[Sherpa-TTS] 生成语音失败:");
    console.error("  错误:", error);
    console.error("  错误消息:", error.message);
    console.error("  错误类型:", typeof error);
    console.error("  错误堆栈:", error.stack);
    console.error("  文本 (前50字符):", args.text.substring(0, 50) + "...");
    console.error("  文本长度:", args.text.length);
    console.error("  速度参数:", args.speed);
    console.error(`  详细日志: ${errorLogPath}`);

    // 直接抛出原始错误，不修改
    throw error;
  }
  // 注意：不要在这里释放实例！实例会被复用
}
