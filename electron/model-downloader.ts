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
}

/**
 * 下载文件（增强版：支持超时和重试）
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void,
  retries = 3,
  timeout = 3600000 // 1小时总超时
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await downloadFileAttempt(url, destPath, onProgress, timeout);
      return; // 成功就返回
    } catch (error: any) {
      console.error(
        `[Model] 下载尝试 ${attempt}/${retries} 失败:`,
        error.message
      );

      // 最后一次尝试失败就抛出错误
      if (attempt === retries) {
        throw new Error(`下载失败（已重试 ${retries} 次）: ${error.message}`);
      }

      // 等待后重试（指数退避）
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`[Model] ${waitTime}ms 后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // 删除部分下载的文件
      try {
        if (fsSync.existsSync(destPath)) {
          fsSync.unlinkSync(destPath);
        }
      } catch {}
    }
  }
}

/**
 * 单次下载尝试
 */
async function downloadFileAttempt(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void,
  timeout = 3600000 // 1小时总超时
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if ([301, 302, 307, 308].includes(response.statusCode || 0)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFileAttempt(redirectUrl, destPath, onProgress, timeout)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers["content-length"] || "0", 10);
      let downloadedSize = 0;
      let lastProgressTime = Date.now();
      let lastDownloadedSize = 0;

      const fileStream = createWriteStream(destPath);

      // 设置超时检测（放宽到60秒，适应慢速网络）
      const timeoutCheck = setInterval(() => {
        const now = Date.now();
        const timeSinceLastProgress = now - lastProgressTime;

        // 如果60秒内没有新数据，认为超时
        if (timeSinceLastProgress > 60000) {
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
        }

        // 每10秒记录下载速度
        if (timeSinceLastProgress > 0 && timeSinceLastProgress % 10000 < 1000) {
          const speed = (
            (downloadedSize - lastDownloadedSize) /
            1024 /
            10
          ).toFixed(2);
          const progressPercent =
            totalSize > 0
              ? ((downloadedSize / totalSize) * 100).toFixed(1)
              : "未知";
          console.log(
            `[Model] 下载进度: ${progressPercent}% (${(
              downloadedSize /
              1024 /
              1024
            ).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(
              2
            )} MB) - 速度: ${speed} KB/s`
          );
          lastDownloadedSize = downloadedSize;
        }
      }, 1000);

      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        lastProgressTime = Date.now();
        if (totalSize > 0 && onProgress) {
          onProgress((downloadedSize / totalSize) * 100);
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        clearInterval(timeoutCheck);
        fileStream.close();
        console.log(
          `[Model] 下载完成: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`
        );
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

    console.log("[Model] 下载 Matcha 模型...");

    await downloadFile(url, archivePath, (progress) => {
      onProgress?.({ modelType, progress: Math.round(progress) });
    });

    console.log("[Model] 解压 Matcha 模型...");
    await extractTarBz2(archivePath, modelsDir);
    await fs.unlink(archivePath);

    console.log("[Model] Matcha 模型安装完成");
    return path.join(modelsDir, "matcha-icefall-zh-baker");
  } else {
    const url =
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx";
    const destPath = path.join(modelsDir, "vocos-22khz-univ.onnx");

    console.log("[Model] 下载 Vocoder 模型...");

    await downloadFile(url, destPath, (progress) => {
      onProgress?.({ modelType, progress: Math.round(progress) });
    });

    console.log("[Model] Vocoder 模型安装完成");
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

  console.log("[Model] 下载 ASR 流式模型...");

  await downloadFile(url, archivePath, (progress) => {
    onProgress?.({
      modelType: "asr-streaming",
      progress: Math.round(progress),
    });
  });

  console.log("[Model] 解压 ASR 流式模型...");
  await extractTarBz2(archivePath, modelsDir);
  await fs.unlink(archivePath);

  // 删除 INT8 量化模型，只保留完整精度模型
  const modelBasePath = path.join(
    modelsDir,
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en"
  );

  console.log("[Model] 清理完整精度大模型（保留 INT8 量化版本）...");
  const fullPrecisionFiles = [
    path.join(modelBasePath, "encoder.onnx"),
    path.join(modelBasePath, "decoder.onnx"),
  ];

  for (const file of fullPrecisionFiles) {
    try {
      if (fsSync.existsSync(file)) {
        await fs.unlink(file);
        console.log(`[Model] 已删除: ${path.basename(file)}`);
      }
    } catch (error) {
      console.warn(`[Model] 删除文件失败: ${file}`, error);
    }
  }

  console.log("[Model] ASR 流式模型安装完成（INT8 量化版本）");
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
