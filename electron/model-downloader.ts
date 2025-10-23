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
 * 下载文件
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
      // 处理重定向
      if ([301, 302, 307, 308].includes(response.statusCode || 0)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath, onProgress)
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

      const fileStream = createWriteStream(destPath);

      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          onProgress((downloadedSize / totalSize) * 100);
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err) => {
        fsSync.unlinkSync(destPath);
        reject(err);
      });
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
