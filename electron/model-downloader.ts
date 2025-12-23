/**
 * 模型下载模块
 */
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { createWriteStream } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type ModelType = "matcha" | "vocoder" | "asr-streaming";

export interface DownloadProgress {
  modelType: ModelType;
  progress: number;
  speed?: number; // 下载速度 KB/s
  downloadedSize?: number; // 已下载大小 MB
  totalSize?: number; // 总大小 MB
}

/**
 * GitHub 镜像站列表（用于解决国内访问 GitHub Releases 慢的问题）
 * 使用测试成功的高速镜像源
 */
const GITHUB_MIRRORS = [
  "https://gh-proxy.com/", // 国内高速镜像（已测试，速度 2-6 MB/s）
  "", // 官方源（备用）
];

/**
 * 为 GitHub URL 添加镜像前缀
 */
function applyMirror(url: string, mirrorIndex: number): string {
  const mirror = GITHUB_MIRRORS[mirrorIndex];
  if (!mirror || !url.startsWith("https://github.com/")) {
    return url;
  }
  return `${mirror}${url}`;
}

/**
 * 检查文件是否支持断点续传
 */
function getPartialFileSize(destPath: string): number {
  try {
    if (fsSync.existsSync(destPath)) {
      const stats = fsSync.statSync(destPath);
      return stats.size;
    }
  } catch {}
  return 0;
}

/**
 * 下载文件（增强版：支持断点续传、超时、重试和智能镜像切换）
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void,
  retries = 2, // 减少到2次，加快切换速度
  timeout = 3600000 // 1小时总超时
): Promise<void> {
  let lastSuccessfulMirror = 0; // 记录上次成功的镜像，避免频繁切换

  for (
    let mirrorIndex = 0;
    mirrorIndex < GITHUB_MIRRORS.length;
    mirrorIndex++
  ) {
    // 从上次成功的镜像开始尝试
    const currentMirrorIndex =
      (lastSuccessfulMirror + mirrorIndex) % GITHUB_MIRRORS.length;
    const mirroredUrl = applyMirror(url, currentMirrorIndex);
    const mirrorName = GITHUB_MIRRORS[currentMirrorIndex]
      ? `镜像站 ${currentMirrorIndex + 1}`
      : "官方源";

    // 对每个镜像源重试指定次数
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {

        await downloadFileAttempt(
          mirroredUrl,
          destPath,
          onProgress,
          timeout,
          true // 启用断点续传
        );

        lastSuccessfulMirror = currentMirrorIndex; // 记录成功的镜像
        return; // 成功就返回
      } catch (error: any) {
        console.error(
          `[Model] ❌ ${mirrorName} 第 ${attempt} 次尝试失败:`,
          error.message
        );

        // 如果不是最后一次重试，等待后继续
        if (attempt < retries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // 当前镜像所有重试都失败，尝试下一个镜像
  }

  // 所有镜像都失败了
  throw new Error(
    `下载失败：已尝试所有 ${GITHUB_MIRRORS.length} 个镜像源，每个源重试 ${retries} 次`
  );
}

/**
 * 单次下载尝试（支持断点续传）
 */
async function downloadFileAttempt(
  url: string,
  destPath: string,
  onProgress?: (
    progress: number,
    speed?: number,
    downloadedMB?: number,
    totalMB?: number
  ) => void,
  timeout = 3600000, // 1小时总超时
  enableResume = true // 是否启用断点续传
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    // 检查是否有部分下载的文件（断点续传）
    const startByte = enableResume ? getPartialFileSize(destPath) : 0;
    const isResume = startByte > 0;

    if (isResume) {
    }

    const options = {
      headers: isResume ? { Range: `bytes=${startByte}-` } : {},
    };

    const request = protocol.get(url, options, (response) => {
      // 处理重定向
      if ([301, 302, 307, 308].includes(response.statusCode || 0)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFileAttempt(
            redirectUrl,
            destPath,
            onProgress,
            timeout,
            enableResume
          )
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      // 206 表示断点续传成功，200 表示全新下载
      // 416 表示请求的范围无效（文件可能已损坏），需要删除重新下载
      if (response.statusCode === 416) {
        try {
          if (fsSync.existsSync(destPath)) {
            fsSync.unlinkSync(destPath);
          }
        } catch {}
        // 不启用断点续传，从头开始下载
        downloadFileAttempt(url, destPath, onProgress, timeout, false)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200 && response.statusCode !== 206) {
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }

      // 处理断点续传的总大小计算
      const contentLength = parseInt(
        response.headers["content-length"] || "0",
        10
      );
      const totalSize =
        isResume && response.statusCode === 206
          ? startByte + contentLength
          : contentLength;
      let downloadedSize =
        isResume && response.statusCode === 206 ? startByte : 0;
      let lastProgressTime = Date.now();
      let lastDownloadedSize = downloadedSize;

      // 如果是断点续传，使用追加模式；否则覆盖模式
      const fileStream = createWriteStream(destPath, {
        flags: isResume && response.statusCode === 206 ? "a" : "w",
      });

      // 设置超时检测和速度计算（每秒更新）
      const timeoutCheck = setInterval(() => {
        const now = Date.now();
        const timeSinceLastProgress = now - lastProgressTime;

        // 如果30秒内没有新数据，认为超时（加快切换）
        if (timeSinceLastProgress > 30000) {
          clearInterval(timeoutCheck);
          request.destroy();
          fileStream.destroy();
          console.error(
            `[Model] 数据停滞 ${Math.floor(timeSinceLastProgress / 1000)} 秒`
          );
          reject(
            new Error(
              `下载停滞：${Math.floor(
                timeSinceLastProgress / 1000
              )} 秒内无新数据`
            )
          );
          return;
        }

        // 每秒计算并报告下载速度
        const timeDiff = now - lastProgressTime;
        if (timeDiff >= 1000) {
          const bytesDiff = downloadedSize - lastDownloadedSize;
          const currentSpeed = bytesDiff / (timeDiff / 1000) / 1024; // KB/s
          const progressPercent =
            totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
          const downloadedMB = downloadedSize / 1024 / 1024;
          const totalMB = totalSize / 1024 / 1024;

          // 报告进度和速度
          if (onProgress && totalSize > 0) {
            onProgress(progressPercent, currentSpeed, downloadedMB, totalMB);
          }

          // 控制台日志

          lastDownloadedSize = downloadedSize;
          lastProgressTime = now;
        }
      }, 1000);

      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        clearInterval(timeoutCheck);
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err) => {
        clearInterval(timeoutCheck);
        try {
          fsSync.unlinkSync(destPath);
        } catch {}
        reject(err);
      });

      response.on("error", (err) => {
        clearInterval(timeoutCheck);
        fileStream.destroy();
        try {
          fsSync.unlinkSync(destPath);
        } catch {}
        reject(err);
      });
    });

    // 设置总超时时间
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error(`下载总超时：超过 ${timeout / 1000 / 60} 分钟`));
    });

    request.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * 解压 tar.bz2 文件
 */
async function extractTarBz2(
  archivePath: string,
  extractDir: string
): Promise<void> {
  const platform = process.platform;

  if (platform === "win32") {
    try {
      await execAsync(`tar -xjf "${archivePath}" -C "${extractDir}"`);
    } catch (error) {
      const sevenZipPath = path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "7-Zip",
        "7z.exe"
      );

      if (fsSync.existsSync(sevenZipPath)) {
        const tarPath = archivePath.replace(".tar.bz2", ".tar");
        await execAsync(
          `"${sevenZipPath}" x "${archivePath}" -o"${extractDir}" -y`
        );
        await execAsync(
          `"${sevenZipPath}" x "${tarPath}" -o"${extractDir}" -y`
        );
        await fs.unlink(tarPath);
      } else {
        throw new Error("无法解压文件。请安装 7-Zip 或使用 Windows 10+");
      }
    }
  } else {
    await execAsync(`tar -xjf "${archivePath}" -C "${extractDir}"`);
  }
}

/**
 * 下载 TTS 模型
 */
export async function downloadTTSModel(
  modelType: ModelType,
  modelsDir: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  await fs.mkdir(modelsDir, { recursive: true });

  if (modelType === "matcha") {
    const url =
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2";
    const archivePath = path.join(modelsDir, "matcha-icefall-zh-baker.tar.bz2");


    await downloadFile(url, archivePath, (progress) => {
      onProgress?.({ modelType, progress: Math.round(progress) });
    });

    await extractTarBz2(archivePath, modelsDir);
    await fs.unlink(archivePath);

    return path.join(modelsDir, "matcha-icefall-zh-baker");
  } else {
    const url =
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx";
    const destPath = path.join(modelsDir, "vocos-22khz-univ.onnx");


    await downloadFile(url, destPath, (progress) => {
      onProgress?.({ modelType, progress: Math.round(progress) });
    });

    return destPath;
  }
}

/**
 * 检查模型是否已下载
 */
export function checkTTSModel(
  modelType: ModelType,
  modelsDir: string
): { downloaded: boolean; path: string | null } {
  if (modelType === "matcha") {
    const modelPath = path.join(
      modelsDir,
      "matcha-icefall-zh-baker",
      "model-steps-3.onnx"
    );
    return {
      downloaded: fsSync.existsSync(modelPath),
      path: fsSync.existsSync(modelPath)
        ? path.join(modelsDir, "matcha-icefall-zh-baker")
        : null,
    };
  } else {
    const modelPath = path.join(modelsDir, "vocos-22khz-univ.onnx");
    return {
      downloaded: fsSync.existsSync(modelPath),
      path: fsSync.existsSync(modelPath) ? modelPath : null,
    };
  }
}

/**
 * 下载 ASR 模型
 */
export async function downloadASRModel(
  modelsDir: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  await fs.mkdir(modelsDir, { recursive: true });

  const url =
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2";
  const archivePath = path.join(
    modelsDir,
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2"
  );


  await downloadFile(url, archivePath, (progress) => {
    onProgress?.({
      modelType: "asr-streaming",
      progress: Math.round(progress),
    });
  });

  await extractTarBz2(archivePath, modelsDir);
  await fs.unlink(archivePath);

  // 删除 INT8 量化模型，只保留完整精度模型
  const modelBasePath = path.join(
    modelsDir,
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en"
  );

  const fullPrecisionFiles = [
    path.join(modelBasePath, "encoder.onnx"),
    path.join(modelBasePath, "decoder.onnx"),
  ];

  for (const file of fullPrecisionFiles) {
    try {
      if (fsSync.existsSync(file)) {
        await fs.unlink(file);
      }
    } catch (error) {
      console.warn(`[Model] 删除文件失败: ${file}`, error);
    }
  }

  return modelBasePath;
}

/**
 * 检查 ASR 模型是否已下载
 */
export function checkASRModel(modelsDir: string): {
  downloaded: boolean;
  path: string | null;
  encoderPath: string | null;
  decoderPath: string | null;
  tokensPath: string | null;
} {
  const modelBasePath = path.join(
    modelsDir,
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en"
  );
  // 使用 INT8 量化模型
  const encoderPath = path.join(modelBasePath, "encoder.int8.onnx");
  const decoderPath = path.join(modelBasePath, "decoder.int8.onnx");
  const tokensPath = path.join(modelBasePath, "tokens.txt");

  const downloaded =
    fsSync.existsSync(encoderPath) &&
    fsSync.existsSync(decoderPath) &&
    fsSync.existsSync(tokensPath);

  return {
    downloaded,
    path: downloaded ? modelBasePath : null,
    encoderPath: downloaded ? encoderPath : null,
    decoderPath: downloaded ? decoderPath : null,
    tokensPath: downloaded ? tokensPath : null,
  };
}

/**
 * 递归删除目录
 */
async function removeDirectory(dirPath: string): Promise<void> {
  if (!fsSync.existsSync(dirPath)) {
    return;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await removeDirectory(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }

  await fs.rmdir(dirPath);
}

/**
 * 删除 TTS 模型
 */
export async function deleteTTSModel(
  modelType: "matcha" | "vocoder",
  modelsDir: string
): Promise<void> {

  if (modelType === "matcha") {
    const matchaDir = path.join(modelsDir, "matcha-icefall-zh-baker");
    if (fsSync.existsSync(matchaDir)) {
      await removeDirectory(matchaDir);
    } else {
      throw new Error("Matcha 模型目录不存在");
    }
  } else if (modelType === "vocoder") {
    const vocoderPath = path.join(modelsDir, "vocos-22khz-univ.onnx");
    if (fsSync.existsSync(vocoderPath)) {
      await fs.unlink(vocoderPath);
    } else {
      throw new Error("Vocoder 模型文件不存在");
    }
  }
}

/**
 * 删除 ASR 模型
 */
export async function deleteASRModel(modelsDir: string): Promise<void> {

  const asrDir = path.join(
    modelsDir,
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en"
  );

  if (fsSync.existsSync(asrDir)) {
    await removeDirectory(asrDir);
  } else {
    throw new Error("ASR 模型目录不存在");
  }
}
