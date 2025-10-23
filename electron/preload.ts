// @ts-ignore - preload 必须使用 CommonJS
const { contextBridge, ipcRenderer } = require("electron");

// 暴露 Electron API 到渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // IPC 调用
  invoke: async (cmd: string, args?: any) => {
    console.log(`[Electron] IPC invoke: ${cmd}`, args);
    return ipcRenderer.invoke(cmd, args);
  },

  // IPC 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的频道
    const validChannels = ["download_progress"];
    if (validChannels.includes(channel)) {
      // 包装回调以移除 event 参数
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);

      // 返回取消监听的函数
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },

  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 平台信息
  platform: process.platform,
  versions: process.versions,

  // 是否为 Electron 环境
  isElectron: true,
});

console.log("[Electron] Preload script loaded");
