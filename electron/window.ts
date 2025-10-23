/**
 * 窗口管理模块
 */
import { BrowserWindow, shell, app } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 创建主窗口
 */
export function createMainWindow(
  preloadPath: string,
  isDev: boolean
): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "RWKV-VTuber",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      autoplayPolicy: "no-user-gesture-required",
      experimentalFeatures: true,
      allowRunningInsecureContent: true,
      enableWebSQL: false,
      webgl: true,
    },
  });

  // 设置用户代理
  mainWindow.webContents.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  // 设置响应头
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      const responseHeaders: Record<string, string[]> = {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
      };

      if (!isDev) {
        responseHeaders["Content-Security-Policy"] = [
          [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: file: https:",
            "font-src 'self' data: blob: file:",
            "connect-src 'self' https: wss: ws:",
            "media-src 'self' data: blob: file: https:",
            "worker-src 'self' blob:",
          ].join("; "),
        ];
      }

      callback({ responseHeaders });
    }
  );

  // 加载应用
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    mainWindow.webContents.openDevTools();
  }

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 监听控制台消息（错误日志）
  mainWindow.webContents.on("console-message", (event, level, message) => {
    if (level === 2) {
      // 只记录错误
      console.error(`[Renderer] ${message}`);
    }
  });

  return mainWindow;
}
