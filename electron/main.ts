/**
 * Electron 主进程
 */
import { app, BrowserWindow, session } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { initSherpaONNX, initRecognizer } from "./sherpa-asr.js";
import { initSherpaTTS } from "./sherpa-tts.js";
import { registerIPCHandlers } from "./ipc-handlers.js";
import { createMainWindow } from "./window.js";
import { getASRModelsDir, ensureDir } from "./paths.js";
import { initAutoUpdater } from "./auto-updater.js";

// ES 模块路径处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 配置 Electron
app.commandLine.appendSwitch("--enable-speech-input");
app.commandLine.appendSwitch("--enable-speech-recognition");
app.commandLine.appendSwitch("--enable-experimental-web-platform-features");
app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");

if (isDev) {
  app.commandLine.appendSwitch("--disable-web-security");
  app.commandLine.appendSwitch("--ignore-certificate-errors");
}

// 主窗口实例
let mainWindow: BrowserWindow | null = null;

// 应用准备就绪
app.whenReady().then(async () => {
  // 配置会话
  session.defaultSession.setProxy({ mode: "direct" });
  session.defaultSession.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  // 注册 file:// 协议
  session.defaultSession.protocol.registerFileProtocol(
    "file",
    (request, callback) => {
      const pathname = decodeURI(request.url.replace("file:///", ""));
      callback(pathname);
    }
  );

  // 设置权限处理器
  const allowedPermissions = [
    "media",
    "microphone",
    "audioCapture",
    "videoCapture",
  ];

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(allowedPermissions.includes(permission));
    }
  );

  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      return allowedPermissions.includes(permission);
    }
  );

  // 初始化 Sherpa-ONNX TTS（独立初始化）
  console.log("[Electron] 初始化 Sherpa-ONNX TTS...");
  const ttsLoaded = await initSherpaTTS();

  if (ttsLoaded) {
    console.log("[Electron] ✅ TTS 模块初始化成功");
  } else {
    console.error("[Electron] ❌ TTS 模块初始化失败");
  }

  // 初始化 ASR（实时流式识别）
  // 注意：不在启动时初始化，因为需要等待用户配置加载
  // ASR 会在用户第一次使用或保存配置时初始化
  console.log("[Electron] ASR 模块已就绪，等待用户配置");
  const asrLoaded = await initSherpaONNX();
  if (asrLoaded) {
    console.log(
      "[Electron] ✅ Sherpa-ONNX 模块加载成功（ASR 将在首次使用时初始化）"
    );
  } else {
    console.log("[Electron] ⚠️  Sherpa-ONNX 模块加载失败");
  }

  // 注册 IPC 处理器
  registerIPCHandlers();

  // 创建窗口
  mainWindow = createMainWindow(path.join(__dirname, "preload.js"), isDev);

  // 初始化自动更新
  console.log("[Electron] 初始化自动更新模块...");
  initAutoUpdater(mainWindow, isDev);

  // macOS 激活时重建窗口
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(path.join(__dirname, "preload.js"), isDev);
    }
  });
});

// 所有窗口关闭
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 应用退出
app.on("before-quit", () => {
  console.log("[Electron] 应用退出");
});
