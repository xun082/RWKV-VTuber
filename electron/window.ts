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
    show: false, // 先不显示，等准备好后再显示
    width: 1400, // 固定窗口宽度
    height: 900, // 固定窗口高度
    minWidth: 1400, // 最小宽度
    minHeight: 900, // 最小高度
    // 移除 maxWidth 和 maxHeight，允许全屏
    resizable: true, // 允许调整大小（用于全屏功能）
    title: "RWKV-VTuber",
    center: true, // 窗口居中显示
    autoHideMenuBar: true, // 隐藏菜单栏
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

  // 保存固定窗口尺寸
  const fixedWidth = 1400;
  const fixedHeight = 900;

  // 监听窗口大小调整，在非全屏状态下保持固定大小
  mainWindow.on("will-resize", (event, newBounds) => {
    // 如果窗口不是全屏状态，阻止调整大小
    if (!mainWindow.isFullScreen()) {
      // 如果尝试改变大小，恢复到固定尺寸
      if (newBounds.width !== fixedWidth || newBounds.height !== fixedHeight) {
        event.preventDefault();
        mainWindow.setSize(fixedWidth, fixedHeight);
      }
    }
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
            "connect-src 'self' https: http: wss: ws:",
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
  }

  // 页面准备好后再显示窗口（避免闪烁）
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return mainWindow;
}
