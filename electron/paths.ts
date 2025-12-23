/**
 * 跨平台路径管理模块
 */
import { app } from "electron";
import * as path from "path";
import * as fsSync from "fs";
import * as fs from "fs/promises";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 自定义路径配置文件
let customPathsConfig: {
  ttsModelsDir?: string;
  asrModelsDir?: string;
} = {};

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
 * 获取路径配置文件路径
 */
function getPathsConfigFile(): string {
  return path.join(getAppDataDir(), "model-paths-config.json");
}

/**
 * 加载自定义路径配置
 */
export async function loadCustomPaths(): Promise<void> {
  const configFile = getPathsConfigFile();
  try {
    if (fsSync.existsSync(configFile)) {
      const data = await fs.readFile(configFile, "utf-8");
      customPathsConfig = JSON.parse(data);
    }
  } catch (error) {
    console.warn("[Paths] 加载路径配置失败:", error);
    customPathsConfig = {};
  }
}

/**
 * 保存自定义路径配置
 */
export async function saveCustomPaths(config: {
  ttsModelsDir?: string;
  asrModelsDir?: string;
}): Promise<void> {
  const configFile = getPathsConfigFile();
  customPathsConfig = { ...customPathsConfig, ...config };
  await fs.writeFile(configFile, JSON.stringify(customPathsConfig, null, 2), "utf-8");
}

/**
 * 获取 TTS 模型目录
 */
export function getTTSModelsDir(): string {
  if (customPathsConfig.ttsModelsDir && fsSync.existsSync(customPathsConfig.ttsModelsDir)) {
    return customPathsConfig.ttsModelsDir;
  }
  return path.join(getAppDataDir(), "tts-models");
}

/**
 * 获取 ASR 模型目录
 */
export function getASRModelsDir(): string {
  if (customPathsConfig.asrModelsDir && fsSync.existsSync(customPathsConfig.asrModelsDir)) {
    return customPathsConfig.asrModelsDir;
  }
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
 * 优先在 TTS/ASR 模型目录中查找
 * 跨平台兼容：自动处理 Windows/Unix 路径分隔符
 */
export function resolveModelPath(
  relativePath: string,
  baseDir?: string
): string {
  // 规范化路径：将所有分隔符转换为平台特定的分隔符
  const normalizedPath = relativePath
    .split("/")
    .join(path.sep)
    .split("\\")
    .join(path.sep);

  // 如果是绝对路径，直接规范化并返回
  if (path.isAbsolute(normalizedPath)) {
    const absolutePath = path.resolve(normalizedPath);
    return absolutePath;
  }

  // 优先级：TTS模型目录 -> ASR模型目录 -> 指定的baseDir -> 应用数据目录 -> 当前目录
  const possiblePaths = [
    path.join(getTTSModelsDir(), normalizedPath),
    path.join(getASRModelsDir(), normalizedPath),
    baseDir ? path.join(baseDir, normalizedPath) : null,
    path.join(getAppDataDir(), normalizedPath),
    path.join(process.cwd(), normalizedPath),
  ].filter(Boolean) as string[];

  for (const tryPath of possiblePaths) {
    // 使用 path.resolve 确保路径完全规范化（Windows 上会使用反斜杠）
    const resolvedPath = path.resolve(tryPath);
    if (fsSync.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  // 如果都不存在，默认返回 TTS 模型目录下的路径
  const defaultPath = path.resolve(path.join(getTTSModelsDir(), normalizedPath));
  console.warn(`[Paths] ⚠️ 模型文件不存在，使用默认路径: ${defaultPath}`);
  return defaultPath;
}
