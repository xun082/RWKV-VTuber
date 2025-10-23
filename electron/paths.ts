/**
 * 跨平台路径管理模块
 */
import { app } from "electron";
import * as path from "path";
import * as fsSync from "fs";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

/**
 * 获取应用数据目录（跨平台）
 * - macOS: ~/Library/Application Support/RWKV-VTuber
 * - Windows: %APPDATA%/RWKV-VTuber
 * - Linux: ~/.config/RWKV-VTuber
 */
export function getAppDataDir(): string {
  if (isDev) {
    // 开发模式：使用项目根目录
    return process.cwd();
  }
  // 生产模式：使用系统应用数据目录
  return app.getPath("userData");
}

/**
 * 获取 TTS 模型目录
 */
export function getTTSModelsDir(): string {
  return path.join(getAppDataDir(), "tts-models");
}

/**
 * 获取 ASR 模型目录
 */
export function getASRModelsDir(): string {
  return path.join(getAppDataDir(), "asr-models");
}

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 解析模型路径（支持相对和绝对路径）
 */
export function resolveModelPath(
  relativePath: string,
  baseDir?: string
): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  const possiblePaths = [
    path.join(baseDir || process.cwd(), relativePath),
    path.join(getAppDataDir(), relativePath),
  ];

  for (const tryPath of possiblePaths) {
    if (fsSync.existsSync(tryPath)) {
      return tryPath;
    }
  }

  return path.join(baseDir || getAppDataDir(), relativePath);
}
