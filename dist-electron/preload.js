"use strict";
// @ts-ignore - preload 必须使用 CommonJS
const { contextBridge, ipcRenderer } = require("electron");
// 暴露 Electron API 到渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
    // IPC 调用
    invoke: async (cmd, args) => {
        console.log(`[Electron] IPC invoke: ${cmd}`, args);
        return ipcRenderer.invoke(cmd, args);
    },
    // 平台信息
    platform: process.platform,
    versions: process.versions,
    // 是否为 Electron 环境
    isElectron: true,
});
console.log("[Electron] Preload script loaded");
