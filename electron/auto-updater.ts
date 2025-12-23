/**
 * Electron 自动更新模块
 * 使用 electron-updater 从 GitHub Release 自动更新应用
 */
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { BrowserWindow } from "electron";

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

let mainWindow: BrowserWindow | null = null;

/**
 * 初始化自动更新器
 * @param window 主窗口实例
 * @param isDev 是否为开发环境
 */
export function initAutoUpdater(window: BrowserWindow, isDev: boolean): void {
  mainWindow = window;

  // 开发环境不检查更新
  if (isDev) {
    return;
  }

  // 配置 autoUpdater
  autoUpdater.autoDownload = false; // 不自动下载，让用户选择
  autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

  // 设置更新服务器（直接在代码中配置，不依赖 package.json）
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "xun082",
    repo: "RWKV-VTuber",
  });

  setupUpdateListeners();

  // 应用启动时检查更新（延迟5秒，避免影响启动速度）
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // 每小时检查一次更新
  setInterval(() => {
    checkForUpdates();
  }, 60 * 60 * 1000);
}

/**
 * 设置更新事件监听器
 */
function setupUpdateListeners(): void {
  // 检查更新时
  autoUpdater.on("checking-for-update", () => {
    sendStatusToWindow("checking-for-update");
  });

  // 发现新版本
  autoUpdater.on("update-available", (info) => {
    sendStatusToWindow("update-available", info);
    // 由自定义 UI 组件处理，不使用系统对话框
  });

  // 没有新版本
  autoUpdater.on("update-not-available", (info) => {
    sendStatusToWindow("update-not-available", info);
  });

  // 下载进度
  autoUpdater.on("download-progress", (progressInfo) => {
    sendStatusToWindow("download-progress", {
      percent: progressInfo.percent,
      bytesPerSecond: progressInfo.bytesPerSecond,
      transferred: progressInfo.transferred,
      total: progressInfo.total,
    });
  });

  // 下载完成
  autoUpdater.on("update-downloaded", (info) => {
    sendStatusToWindow("update-downloaded", info);
    // 由自定义 UI 组件处理，不使用系统对话框
  });

  // 更新错误
  autoUpdater.on("error", (error) => {
    console.error("[AutoUpdater] 更新错误:", error);
    sendStatusToWindow("error", { message: error.message });
  });
}

/**
 * 检查更新
 */
export function checkForUpdates(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error("[AutoUpdater] 检查更新失败:", error);
    });
  }
}

/**
 * 手动下载更新
 */
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate();
}

/**
 * 退出并安装更新
 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true);
}

/**
 * 向渲染进程发送更新状态
 */
function sendStatusToWindow(status: string, data?: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater-message", {
      status,
      data,
    });
  }
}
