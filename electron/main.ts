import { app, BrowserWindow, ipcMain, shell, session } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// ES 模块中获取 __dirname 和 __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检测是否在开发模式
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 在应用启动前设置动态库路径（必须在 app.whenReady 之前）
if (!isDev && process.platform === "darwin") {
  const dylibPath = path.join(process.resourcesPath, "native", "whisper");
  process.env.DYLD_LIBRARY_PATH =
    dylibPath +
    (process.env.DYLD_LIBRARY_PATH ? `:${process.env.DYLD_LIBRARY_PATH}` : "");
  console.log(`[Electron] 预设置动态库路径: ${dylibPath}`);
}

// 设置命令行参数以优化语音识别和性能
// 关键：确保 Web Speech API 能正常工作
app.commandLine.appendSwitch("--enable-speech-input");
app.commandLine.appendSwitch("--enable-speech-recognition");
app.commandLine.appendSwitch(
  "--enable-features",
  "NetworkService,NetworkServiceInProcess"
);
app.commandLine.appendSwitch("--enable-experimental-web-platform-features");
app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("--disable-background-timer-throttling");
app.commandLine.appendSwitch("--disable-renderer-backgrounding");
app.commandLine.appendSwitch("--disable-backgrounding-occluded-windows");

// 仅在开发环境禁用安全限制
if (isDev) {
  app.commandLine.appendSwitch("--disable-web-security");
  app.commandLine.appendSwitch("--ignore-certificate-errors");
  app.commandLine.appendSwitch("--allow-insecure-localhost");
}

// 主窗口
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "RWKV-VTuber",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 禁用 web 安全限制以允许本地文件访问
      // 允许音频自动播放
      autoplayPolicy: "no-user-gesture-required",
      // 网络相关设置
      experimentalFeatures: true,
      // 允许不安全内容（需要加载本地资源）
      allowRunningInsecureContent: true,
      // 启用媒体功能
      enableWebSQL: false,
      // 允许跨域
      webgl: true,
    },
    icon: path.join(__dirname, "../src-tauri/icons/icon.png"),
  });

  // 在页面加载前设置用户代理
  mainWindow.webContents.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  // 设置安全响应头和 CSP（允许本地资源和外部 API）
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      const responseHeaders: Record<string, string[]> = {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
      };

      // 在生产环境添加适当的 CSP，允许本地文件和必要的外部资源
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
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL("http://localhost:5173");
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    // 生产环境也打开开发者工具以便调试
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭事件
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 监听所有控制台消息（生产环境调试）
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const logPrefix =
        level === 1 ? "⚠️ [WARN]" : level === 2 ? "❌ [ERROR]" : "ℹ️ [INFO]";
      console.log(`${logPrefix} [Renderer] ${message}`);
      if (line && sourceId) {
        console.log(`  └─ ${sourceId}:${line}`);
      }
    }
  );

  // 监听渲染进程崩溃
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("❌ [Electron] 渲染进程崩溃:", details);
  });

  // 监听页面未响应
  mainWindow.on("unresponsive", () => {
    console.error("❌ [Electron] 页面未响应");
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  // 配置网络代理和连接设置
  console.log("[Electron] 配置网络设置...");

  // 禁用网络代理（避免代理干扰）
  session.defaultSession.setProxy({
    mode: "direct",
  });

  // 设置 User-Agent 为标准 Chrome（确保 Google 服务兼容）
  const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`;
  session.defaultSession.setUserAgent(userAgent);
  console.log("[Electron] User-Agent 已设置");

  // 注册 file:// 协议处理器，允许访问本地文件
  session.defaultSession.protocol.registerFileProtocol(
    "file",
    (request, callback) => {
      const pathname = decodeURI(request.url.replace("file:///", ""));
      callback(pathname);
    }
  );

  // 只记录语音识别相关的网络请求
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["*://speech.google.com/*", "*://*.google.com/speech-api/*"] },
    (details, callback) => {
      console.log(`[Electron] 语音识别请求: ${details.method} ${details.url}`);
      callback({});
    }
  );

  session.defaultSession.webRequest.onErrorOccurred(
    { urls: ["*://speech.google.com/*", "*://*.google.com/speech-api/*"] },
    (details) => {
      console.error(
        `[Electron] 语音识别错误: ${details.error} - ${details.url}`
      );
    }
  );

  // 设置权限处理器 - 自动授予麦克风和媒体权限
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      console.log(`[Electron] 权限请求: ${permission}`);

      // 允许麦克风、摄像头和媒体设备访问
      const allowedPermissions = [
        "media",
        "microphone",
        "audioCapture",
        "videoCapture",
        "geolocation",
        "background-sync",
      ];

      if (allowedPermissions.includes(permission)) {
        console.log(`[Electron] ✅ 授予权限: ${permission}`);
        callback(true);
      } else {
        console.log(`[Electron] ❌ 拒绝权限: ${permission}`);
        callback(false);
      }
    }
  );

  // 处理权限检查请求
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      console.log(`[Electron] 权限检查: ${permission}`);

      const allowedPermissions = [
        "media",
        "microphone",
        "audioCapture",
        "videoCapture",
        "geolocation",
        "background-sync",
      ];

      return allowedPermissions.includes(permission);
    }
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC 处理器

interface SaveMemoryArgs {
  path: string;
  data: string;
}

// 保存内存（兼容 Tauri 的接口）
ipcMain.handle("save_memory", async (_event, args: SaveMemoryArgs) => {
  try {
    await fs.writeFile(args.path, args.data, "utf-8");
    return { success: true, path: args.path };
  } catch (error) {
    console.error("保存文件失败:", error);
    throw error;
  }
});

interface SaveTempAudioArgs {
  audioData: number[];
}

// 返回音频数据（前端用 Blob URL 播放）
ipcMain.handle("save_temp_audio", async (_event, args: SaveTempAudioArgs) => {
  try {
    console.log(
      `[Electron] 返回音频数据，大小: ${args.audioData.length} bytes`
    );

    // 直接返回数组，前端转换为 Blob URL
    return args.audioData;
  } catch (error) {
    console.error("[Electron] 音频处理失败:", error);
    throw error;
  }
});

interface MinimaxTTSArgs {
  apiKey: string;
  groupId: string;
  model: string;
  text: string;
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  sampleRate: number;
  audioFormat: string;
}

interface MinimaxTTSResponse {
  data?: {
    audio?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

// MiniMax TTS
ipcMain.handle("minimax_tts", async (_event, params: MinimaxTTSArgs) => {
  try {
    const {
      apiKey,
      groupId,
      model,
      text,
      voiceId,
      speed,
      volume,
      pitch,
      sampleRate,
      audioFormat,
    } = params;

    console.log(`[Electron] 调用 MiniMax TTS API，文本长度: ${text.length}`);

    const response = await fetch("https://api.minimaxi.com/v1/t2a_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        GroupId: groupId,
      },
      body: JSON.stringify({
        model,
        text,
        voice_setting: {
          voice_id: voiceId,
          speed,
          vol: volume,
          pitch,
        },
        audio_setting: {
          sample_rate: sampleRate,
          bitrate: 128000,
          format: audioFormat || "wav",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API 错误 ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as MinimaxTTSResponse;

    // 解码 base64 音频数据
    const audioBase64 = data.data?.audio;
    if (!audioBase64) {
      throw new Error("响应中未找到音频数据");
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const audioArray = Array.from(audioBuffer);

    console.log(
      `[Electron] TTS 合成成功，音频大小: ${audioArray.length} bytes`
    );

    return { audio: audioArray };
  } catch (error) {
    console.error("[Electron] TTS 合成失败:", error);
    throw error;
  }
});

// Whisper 语音识别 - 使用原生模块
interface WhisperTranscribeArgs {
  audioData: number[]; // 音频数据（Uint8Array 转为数组）
  language?: string;
}

// 加载 Whisper 原生模块（使用 createRequire 支持 ES 模块）
const require = createRequire(import.meta.url);
let whisperModule: any = null;

// 获取正确的资源路径（开发环境 vs 生产环境）
const resourcesPath = isDev
  ? path.join(__dirname, "..")
  : process.resourcesPath;

try {
  // 尝试多个可能的路径
  const possiblePaths = isDev
    ? [path.join(__dirname, "native", "whisper", "addon.node")]
    : [
        // 标准 extraResources 路径（最优先）
        path.join(process.resourcesPath, "native", "whisper", "addon.node"),
        // 打包后从 asar.unpacked 中加载
        path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "dist-electron",
          "native",
          "whisper",
          "addon.node"
        ),
        // 备用路径
        path.join(resourcesPath, "native", "whisper", "addon.node"),
      ];

  console.log(`[Electron] 尝试加载 Whisper 原生模块...`);
  console.log(`[Electron] 开发模式: ${isDev}`);
  console.log(`[Electron] 资源路径: ${resourcesPath}`);
  console.log(`[Electron] process.resourcesPath: ${process.resourcesPath}`);
  console.log(`[Electron] __dirname: ${__dirname}`);

  let addonPath: string | null = null;
  for (const testPath of possiblePaths) {
    console.log(`[Electron] 尝试路径: ${testPath}`);
    if (require("fs").existsSync(testPath)) {
      addonPath = testPath;
      console.log(`[Electron] ✅ 找到文件: ${testPath}`);
      break;
    } else {
      console.log(`[Electron] ❌ 文件不存在: ${testPath}`);
    }
  }

  if (!addonPath) {
    throw new Error("找不到 Whisper 原生模块文件");
  }

  // 设置动态库搜索路径（macOS）
  const dylibPath = path.dirname(addonPath);
  console.log(`[Electron] 设置动态库路径: ${dylibPath}`);

  // 设置环境变量，让 dyld 能找到 .dylib 文件
  if (process.platform === "darwin") {
    process.env.DYLD_LIBRARY_PATH =
      dylibPath +
      (process.env.DYLD_LIBRARY_PATH
        ? `:${process.env.DYLD_LIBRARY_PATH}`
        : "");
    console.log(
      `[Electron] DYLD_LIBRARY_PATH: ${process.env.DYLD_LIBRARY_PATH}`
    );
  }

  // 在 require 前再次确认环境变量和路径
  console.log(`[Electron] 即将加载: ${addonPath}`);
  console.log(
    `[Electron] 当前 DYLD_LIBRARY_PATH: ${process.env.DYLD_LIBRARY_PATH}`
  );

  // 确保所有 dylib 文件都存在
  const dylibFiles = require("fs").readdirSync(path.dirname(addonPath));
  console.log(`[Electron] 同目录文件列表: ${dylibFiles.join(", ")}`);

  // 检查 rpath 设置（调试用）
  try {
    const { execSync } = require("child_process");
    const rpathOutput = execSync(
      `otool -l "${addonPath}" | grep -A 3 "LC_RPATH"`,
      { encoding: "utf-8" }
    );
    console.log(`[Electron] addon.node的rpath:\n${rpathOutput}`);
  } catch (e) {
    console.log(`[Electron] 无法检查rpath: ${e}`);
  }

  whisperModule = require(addonPath);
  console.log("[Electron] ✅ Whisper 原生模块加载成功");
  console.log("[Electron] 可用方法:", Object.keys(whisperModule));
} catch (error) {
  console.error("[Electron] ❌ 无法加载 Whisper 原生模块:", error);
  console.log(
    "[Electron] 💡 提示: 请确保 addon.node 和相关 .dylib 文件已正确打包"
  );
}

ipcMain.handle(
  "whisper_transcribe",
  async (_event, args: WhisperTranscribeArgs) => {
    try {
      if (!whisperModule || !whisperModule.whisper) {
        console.error("[Electron] ❌ Whisper 模块未加载");
        console.log("[Electron] 💡 语音识别功能不可用，请使用其他输入方式");
        throw new Error(
          "Whisper 语音识别模块未加载。该功能当前不可用，请使用文字输入。"
        );
      }

      // 将音频数据写入临时文件
      const tmpDir = app.getPath("temp");
      const audioPath = path.join(tmpDir, `whisper-${Date.now()}.wav`);
      await fs.writeFile(audioPath, Buffer.from(args.audioData));

      // 模型文件路径（中文多语言模型）
      const modelPossiblePaths = isDev
        ? [path.join(__dirname, "models", "ggml-small.bin")]
        : [
            // 标准 extraResources 路径（最优先）
            path.join(process.resourcesPath, "models", "ggml-small.bin"),
            // 打包后从 asar.unpacked 中加载
            path.join(
              process.resourcesPath,
              "app.asar.unpacked",
              "dist-electron",
              "models",
              "ggml-small.bin"
            ),
            // 备用路径
            path.join(resourcesPath, "models", "ggml-small.bin"),
          ];

      let modelPath: string | null = null;
      for (const testPath of modelPossiblePaths) {
        if (require("fs").existsSync(testPath)) {
          modelPath = testPath;
          console.log(`[Electron] ✅ 找到模型文件: ${testPath}`);
          break;
        }
      }

      if (!modelPath) {
        throw new Error("找不到 Whisper 模型文件 (ggml-small.bin)");
      }

      // 使用原生模块进行转录
      const { promisify } = await import("util");
      const whisperAsync = promisify(whisperModule.whisper);

      const result = await whisperAsync({
        language: args.language || "zh",
        model: modelPath,
        fname_inp: audioPath,
        use_gpu: false,
      });

      // 清理临时文件
      try {
        await fs.unlink(audioPath);
      } catch (cleanupError) {
        // 忽略清理错误
      }

      // 提取转录文本
      let transcript = "";

      if (typeof result === "string") {
        transcript = result;
      } else if (result?.text) {
        transcript = result.text;
      } else if (result?.transcription && Array.isArray(result.transcription)) {
        transcript = result.transcription
          .map((item: any) => (Array.isArray(item) ? item[2] || "" : ""))
          .join(" ")
          .trim();
      }

      return { transcript: transcript.trim() };
    } catch (error: any) {
      throw new Error(error.message || "Whisper 转录失败");
    }
  }
);

// 优雅退出
app.on("before-quit", () => {
  console.log("[Electron] 应用即将退出");
});
