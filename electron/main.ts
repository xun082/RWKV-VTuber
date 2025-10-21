import { app, BrowserWindow, ipcMain, shell, session } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// ES 模块中获取 __dirname 和 __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检测是否在开发模式
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Sherpa-ONNX 动态库加载 - 特殊处理 macOS SIP 问题
// macOS SIP 会清除 DYLD_LIBRARY_PATH，所以我们需要使用其他方法
const setupSherpaOnnxPaths = () => {
  const platform = process.platform;
  const arch = process.arch;

  let platformPackage = "";
  if (platform === "darwin") {
    platformPackage =
      arch === "arm64" ? "sherpa-onnx-darwin-arm64" : "sherpa-onnx-darwin-x64";
  } else if (platform === "linux") {
    platformPackage =
      arch === "arm64" ? "sherpa-onnx-linux-arm64" : "sherpa-onnx-linux-x64";
  } else if (platform === "win32") {
    platformPackage =
      arch === "x64" ? "sherpa-onnx-win-x64" : "sherpa-onnx-win-ia32";
  }

  if (!platformPackage) {
    console.error(`[Electron] ❌ 不支持的平台: ${platform}-${arch}`);
    return null;
  }

  // 尝试多个可能的路径
  const possibleRoots = [
    process.cwd(),
    path.join(__dirname, ".."),
    path.join(__dirname, "..", ".."),
    app.getAppPath(),
  ];

  for (const root of possibleRoots) {
    const tryPath = path.join(
      root,
      "node_modules",
      ".pnpm",
      `${platformPackage}@1.12.14`,
      "node_modules",
      platformPackage
    );

    if (fsSync.existsSync(tryPath)) {
      console.log(`[Electron] ✅ 找到 Sherpa-ONNX 库: ${tryPath}`);

      // Windows: 直接设置 PATH
      if (platform === "win32") {
        process.env.PATH = `${tryPath};${process.env.PATH || ""}`;
        return tryPath;
      }

      // Linux: 设置 LD_LIBRARY_PATH
      if (platform === "linux") {
        process.env.LD_LIBRARY_PATH = `${tryPath}:${
          process.env.LD_LIBRARY_PATH || ""
        }`;
        return tryPath;
      }

      // macOS: 直接返回路径，稍后手动加载
      return tryPath;
    }
  }

  console.error(`[Electron] ❌ 找不到 Sherpa-ONNX 库`);
  return null;
};

const sherpaLibPath = setupSherpaOnnxPaths();
console.log(`[Electron] 平台: ${process.platform}, 架构: ${process.arch}`);

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

// Sherpa-ONNX Paraformer 语音识别
interface SherpaTranscribeArgs {
  audioData: number[]; // 音频数据（Uint8Array 转为数组，16kHz 16-bit PCM）
  language?: string;
}

// 加载 Sherpa-ONNX 原生模块
const require = createRequire(import.meta.url);
let sherpa_onnx: any = null;
let recognizer: any = null;

// macOS 特殊处理：手动预加载动态库
if (process.platform === "darwin" && sherpaLibPath) {
  try {
    console.log("[Electron] macOS 检测到，尝试预加载动态库...");

    // 使用 process.dlopen 手动加载 dylib
    const dylibs = [
      "libsherpa-onnx-core.dylib",
      "libonnxruntime.1.17.1.dylib",
      "libsherpa-onnx-c-api.dylib",
    ];

    for (const lib of dylibs) {
      const libPath = path.join(sherpaLibPath, "lib", lib);
      if (fsSync.existsSync(libPath)) {
        try {
          // 使用 ffi-napi 或直接 dlopen
          const module = { exports: {} };
          process.dlopen(module, libPath);
          console.log(`[Electron] ✅ 预加载: ${lib}`);
        } catch (e: any) {
          console.log(`[Electron] ⚠️  跳过: ${lib} (${e.message})`);
        }
      }
    }
  } catch (e: any) {
    console.log(`[Electron] ⚠️  预加载失败: ${e.message}`);
  }
}

try {
  console.log(`[Electron] 尝试加载 Sherpa-ONNX 语音识别模块...`);
  console.log(`[Electron] 开发模式: ${isDev}`);
  console.log(`[Electron] 当前工作目录: ${process.cwd()}`);

  if (sherpaLibPath) {
    console.log(`[Electron] Sherpa 库路径: ${sherpaLibPath}`);
  }

  // 尝试加载模块
  try {
    sherpa_onnx = require("sherpa-onnx-node");
    console.log("[Electron] ✅ Sherpa-ONNX 模块加载成功");
    console.log(
      `[Electron] Sherpa-ONNX 版本: ${sherpa_onnx.version || "未知"}`
    );
  } catch (requireError: any) {
    console.error("[Electron] ❌ require 失败:", requireError.message);

    // macOS 特殊处理：尝试直接加载 .node 文件
    if (process.platform === "darwin" && sherpaLibPath) {
      try {
        console.log("[Electron] 尝试直接加载 .node 文件...");
        const nodeFile = path.join(sherpaLibPath, "sherpa-onnx.node");

        if (fsSync.existsSync(nodeFile)) {
          sherpa_onnx = require(nodeFile);
          console.log("[Electron] ✅ 直接加载成功");
        } else {
          console.error(`[Electron] ❌ .node 文件不存在: ${nodeFile}`);
          sherpa_onnx = null;
        }
      } catch (directError: any) {
        console.error("[Electron] ❌ 直接加载失败:", directError.message);
        sherpa_onnx = null;
      }
    } else {
      sherpa_onnx = null;
    }
  }

  // 确定模型路径（开发环境 vs 生产环境）
  const getModelPath = () => {
    if (isDev) {
      // 开发环境：使用项目根目录的 sherpa 文件夹
      return {
        modelFile: path.join(process.cwd(), "sherpa", "model.int8.onnx"),
        tokensFile: path.join(process.cwd(), "sherpa", "tokens.txt"),
      };
    } else {
      // 生产环境：使用 resources 目录
      const resourcesPath = process.resourcesPath;
      return {
        modelFile: path.join(resourcesPath, "sherpa", "model.int8.onnx"),
        tokensFile: path.join(resourcesPath, "sherpa", "tokens.txt"),
      };
    }
  };

  const { modelFile: defaultModelFile, tokensFile: defaultTokensFile } = getModelPath();

  console.log(`[Electron] 默认模型文件路径: ${defaultModelFile}`);
  console.log(`[Electron] 默认词表文件路径: ${defaultTokensFile}`);

  // 检查默认模型文件是否存在
  if (
    fsSync.existsSync(defaultModelFile) &&
    fsSync.existsSync(defaultTokensFile)
  ) {
    console.log("[Electron] ✅ 找到默认模型文件");

    // 配置 Paraformer 离线识别器
    const config = {
      featConfig: {
        sampleRate: 16000,
        featureDim: 80,
      },
      modelConfig: {
        paraformer: {
          model: defaultModelFile,
        },
        tokens: defaultTokensFile,
        numThreads: 2,
        provider: "cpu",
        debug: 0,
        modelType: "paraformer",
      },
    };

    console.log("[Electron] 正在初始化识别器...");
    recognizer = new sherpa_onnx.OfflineRecognizer(config);
    console.log("[Electron] ✅ Sherpa-ONNX 识别器初始化成功");
    console.log(`[Electron] 平台: ${process.platform}`);
    console.log(`[Electron] 架构: ${process.arch}`);
  } else {
    console.log("[Electron] ⚠️  默认模型文件不存在，将在收到配置后初始化");
    recognizer = null;
  }

  // 最终检查
  if (!sherpa_onnx) {
    console.error("[Electron] ❌ Sherpa-ONNX 模块加载失败");

    if (process.platform === "darwin") {
      console.log(
        "\n[Electron] 💡 macOS 解决方案：\n" +
          "   1. 使用启动脚本: ./scripts/start-electron.sh\n" +
          "   2. 或手动设置环境变量后启动:\n" +
          '      export DYLD_LIBRARY_PATH="$(pwd)/node_modules/.pnpm/sherpa-onnx-darwin-arm64@1.12.14/node_modules/sherpa-onnx-darwin-arm64:$DYLD_LIBRARY_PATH"\n' +
          "      npm run electron:dev\n" +
          "   3. 或切换到浏览器语音识别\n"
      );
    } else if (process.platform === "win32") {
      console.log(
        "\n[Electron] 💡 Windows 解决方案：\n" +
          "   1. 确保已安装依赖: pnpm install\n" +
          "   2. Windows 通常可以自动加载 DLL，如果失败请检查 PATH\n"
      );
    } else {
      console.log(
        "\n[Electron] 💡 Linux 解决方案：\n" +
          "   1. 确保已安装依赖: pnpm install\n" +
          "   2. 设置 LD_LIBRARY_PATH 后启动\n"
      );
    }
  } else {
    console.log("[Electron] ✅ Sherpa-ONNX 完全就绪");
  }
} catch (error: any) {
  console.error("[Electron] ❌ 加载 Sherpa-ONNX 时发生意外错误");
  console.error(`[Electron] 错误类型: ${error.name}`);
  console.error(`[Electron] 错误消息: ${error.message}`);
  if (error.stack) {
    console.error(`[Electron] 错误堆栈:\n${error.stack}`);
  }

  // 重置为 null，防止后续使用
  sherpa_onnx = null;
  recognizer = null;
}

// 重新加载 Sherpa-ONNX 配置
interface SherpaConfigArgs {
  modelPath: string;
  tokensPath: string;
  numThreads: number;
}

ipcMain.handle(
  "sherpa_reload_config",
  async (_event, args: SherpaConfigArgs) => {
    try {
      if (!sherpa_onnx) {
        throw new Error("Sherpa-ONNX 模块未加载");
      }

      // 处理路径：如果是相对路径，根据环境解析
      const resolveModelPath = (relativePath: string) => {
        if (path.isAbsolute(relativePath)) {
          return relativePath;
        }
        // 如果是相对路径，尝试多个位置
        const possiblePaths = [
          path.join(process.cwd(), relativePath),
          path.join(process.resourcesPath || process.cwd(), relativePath),
        ];
        for (const tryPath of possiblePaths) {
          if (fsSync.existsSync(tryPath)) {
            return tryPath;
          }
        }
        return path.join(process.cwd(), relativePath);
      };

      const modelFile = resolveModelPath(args.modelPath);
      const tokensFile = resolveModelPath(args.tokensPath);

      console.log(`[Electron] 重新加载配置...`);
      console.log(`[Electron] 模型: ${modelFile}`);
      console.log(`[Electron] 词表: ${tokensFile}`);
      console.log(`[Electron] 线程数: ${args.numThreads}`);

      // 验证文件存在
      if (!fsSync.existsSync(modelFile)) {
        throw new Error(`模型文件不存在: ${modelFile}`);
      }
      if (!fsSync.existsSync(tokensFile)) {
        throw new Error(`词表文件不存在: ${tokensFile}`);
      }

      // 重新创建识别器
      const config = {
        featConfig: {
          sampleRate: 16000,
          featureDim: 80,
        },
        modelConfig: {
          paraformer: {
            model: modelFile,
          },
          tokens: tokensFile,
          numThreads: args.numThreads,
          provider: "cpu",
          debug: 0,
          modelType: "paraformer",
        },
      };

      recognizer = new sherpa_onnx.OfflineRecognizer(config);
      console.log("[Electron] ✅ Sherpa-ONNX 配置重新加载成功");

      return { success: true };
    } catch (error: any) {
      console.error("[Electron] ❌ 重新加载配置失败:", error);
      throw new Error(error.message || "重新加载配置失败");
    }
  }
);

ipcMain.handle(
  "sherpa_transcribe",
  async (_event, args: SherpaTranscribeArgs) => {
    try {
      if (!sherpa_onnx || !recognizer) {
        console.error("[Electron] ❌ Sherpa-ONNX 模块未加载");
        throw new Error(
          "Sherpa-ONNX 语音识别模块未加载。请确保模型文件已正确配置。"
        );
      }

      console.log(
        `[Electron] 开始语音识别，音频数据长度: ${args.audioData.length}`
      );
      const startTime = Date.now();

      // 将音频数据转换为 Float32Array
      // 假设输入是 16-bit PCM，需要转换为 [-1, 1] 范围的浮点数
      const samples = new Float32Array(args.audioData.length / 2);
      for (let i = 0; i < samples.length; i++) {
        // 16-bit PCM: 每个样本占 2 字节
        const int16 = (args.audioData[i * 2 + 1] << 8) | args.audioData[i * 2];
        // 转换为有符号整数
        const signed = int16 > 32767 ? int16 - 65536 : int16;
        // 归一化到 [-1, 1]
        samples[i] = signed / 32768.0;
      }

      console.log(
        `[Electron] 音频样本数: ${samples.length}, 时长: ${(
          samples.length / 16000
        ).toFixed(2)}秒`
      );

      // 创建识别流
      const stream = recognizer.createStream();

      // 提交音频数据
      stream.acceptWaveform({
        sampleRate: 16000,
        samples: samples,
      });

      // 执行识别
      recognizer.decode(stream);
      const result = recognizer.getResult(stream);

      const elapsed = Date.now() - startTime;
      const duration = samples.length / 16000;
      const rtf = elapsed / 1000 / duration;

      console.log(`[Electron] ✅ 识别完成`);
      console.log(`[Electron]   - 识别结果: ${result.text}`);
      console.log(`[Electron]   - 音频时长: ${duration.toFixed(2)}秒`);
      console.log(`[Electron]   - 处理时间: ${(elapsed / 1000).toFixed(2)}秒`);
      console.log(`[Electron]   - 实时率(RTF): ${rtf.toFixed(3)}`);

      return { transcript: result.text.trim() };
    } catch (error: any) {
      console.error("[Electron] ❌ Sherpa-ONNX 识别失败:", error);
      throw new Error(error.message || "语音识别失败");
    }
  }
);

// 优雅退出
app.on("before-quit", () => {
  console.log("[Electron] 应用即将退出");
});
