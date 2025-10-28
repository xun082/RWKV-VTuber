/**
 * Electron API 封装
 * 提供统一的 Electron API 访问接口
 */

// 检查是否在 Electron 环境中
export const isElectron = (): boolean => {
  return typeof window !== "undefined" && !!window.electronAPI;
};

// 获取 Electron API
export const getElectronAPI = (): ElectronAPI | null => {
  if (isElectron()) {
    return window.electronAPI!;
  }
  return null;
};

// IPC 调用
export const invoke = async (cmd: string, args?: any): Promise<any> => {
  const api = getElectronAPI();
  if (!api) {
    throw new Error("Not in Electron environment");
  }
  return api.invoke(cmd, args);
};

// IPC 事件监听
export const on = (
  channel: string,
  callback: (...args: any[]) => void
): (() => void) | null => {
  const api = getElectronAPI();
  if (!api) {
    return null;
  }
  return api.on(channel, callback);
};

// 初始化 window.electron 便捷访问
if (isElectron()) {
  window.electron = {
    invoke,

    // 下载进度监听
    onDownloadProgress: (callback: (progress: any) => void) => {
      return on("download_progress", callback) || (() => {});
    },

    // 更新消息监听
    onUpdaterMessage: (callback: (message: any) => void) => {
      return on("updater-message", callback) || (() => {});
    },

    // 检查更新
    checkForUpdates: async () => {
      return invoke("check_for_updates");
    },

    // 下载更新
    downloadUpdate: async () => {
      return invoke("download_update");
    },

    // 退出并安装
    quitAndInstall: async () => {
      return invoke("quit_and_install");
    },
  };
}
