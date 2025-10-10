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
// 设置命令行参数以优化语音识别和性能
// 关键：确保 Web Speech API 能正常工作
app.commandLine.appendSwitch("--enable-speech-input");
app.commandLine.appendSwitch("--enable-speech-recognition");
app.commandLine.appendSwitch("--enable-features", "NetworkService,NetworkServiceInProcess");
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
let mainWindow = null;
function createWindow() {
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
            webSecurity: !isDev, // 开发环境禁用，生产环境启用
            // 允许音频自动播放
            autoplayPolicy: "no-user-gesture-required",
            // 网络相关设置
            experimentalFeatures: true,
            // 允许不安全内容（用于开发环境）
            allowRunningInsecureContent: isDev,
            // 启用媒体功能
            enableWebSQL: false,
            // 允许跨域
            webgl: true,
        },
        icon: path.join(__dirname, "../src-tauri/icons/icon.png"),
    });
    // 在页面加载前设置用户代理
    mainWindow.webContents.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    // 允许 Google 服务的请求
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Access-Control-Allow-Origin": ["*"],
            },
        });
    });
    // 加载应用
    if (isDev) {
        // 开发模式：加载 Vite 开发服务器
        mainWindow.loadURL("http://localhost:5173");
        // 打开开发者工具
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产模式：加载打包后的文件
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
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
    // 监听语音识别相关的控制台消息
    mainWindow.webContents.on("console-message", (event, level, message) => {
        if (message.includes("语音识别") || message.includes("speech")) {
            console.log(`[WebContents] ${message}`);
        }
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
    // 只记录语音识别相关的网络请求
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["*://speech.google.com/*", "*://*.google.com/speech-api/*"] }, (details, callback) => {
        console.log(`[Electron] 语音识别请求: ${details.method} ${details.url}`);
        callback({});
    });
    session.defaultSession.webRequest.onErrorOccurred({ urls: ["*://speech.google.com/*", "*://*.google.com/speech-api/*"] }, (details) => {
        console.error(`[Electron] 语音识别错误: ${details.error} - ${details.url}`);
    });
    // 设置权限处理器 - 自动授予麦克风和媒体权限
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
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
        }
        else {
            console.log(`[Electron] ❌ 拒绝权限: ${permission}`);
            callback(false);
        }
    });
    // 处理权限检查请求
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
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
    });
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
// 保存内存（兼容 Tauri 的接口）
ipcMain.handle("save_memory", async (_event, args) => {
    try {
        await fs.writeFile(args.path, args.data, "utf-8");
        return { success: true, path: args.path };
    }
    catch (error) {
        console.error("保存文件失败:", error);
        throw error;
    }
});
// 返回音频数据（前端用 Blob URL 播放）
ipcMain.handle("save_temp_audio", async (_event, args) => {
    try {
        console.log(`[Electron] 返回音频数据，大小: ${args.audioData.length} bytes`);
        // 直接返回数组，前端转换为 Blob URL
        return args.audioData;
    }
    catch (error) {
        console.error("[Electron] 音频处理失败:", error);
        throw error;
    }
});
// MiniMax TTS
ipcMain.handle("minimax_tts", async (_event, params) => {
    try {
        const { apiKey, groupId, model, text, voiceId, speed, volume, pitch, sampleRate, audioFormat, } = params;
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
        const data = (await response.json());
        // 解码 base64 音频数据
        const audioBase64 = data.data?.audio;
        if (!audioBase64) {
            throw new Error("响应中未找到音频数据");
        }
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const audioArray = Array.from(audioBuffer);
        console.log(`[Electron] TTS 合成成功，音频大小: ${audioArray.length} bytes`);
        return { audio: audioArray };
    }
    catch (error) {
        console.error("[Electron] TTS 合成失败:", error);
        throw error;
    }
});
// 加载 Whisper 原生模块（使用 createRequire 支持 ES 模块）
const require = createRequire(import.meta.url);
let whisperModule = null;
// 获取正确的资源路径（开发环境 vs 生产环境）
const resourcesPath = isDev
    ? path.join(__dirname, "..")
    : process.resourcesPath;
try {
    const addonPath = isDev
        ? path.join(__dirname, "native", "whisper", "addon.node")
        : path.join(resourcesPath, "native", "whisper", "addon.node");
    console.log(`[Electron] 加载 Whisper 原生模块: ${addonPath}`);
    whisperModule = require(addonPath);
    console.log("[Electron] ✅ Whisper 原生模块加载成功");
    console.log("[Electron] 可用方法:", Object.keys(whisperModule));
}
catch (error) {
    console.error("[Electron] ❌ 无法加载 Whisper 原生模块:", error);
}
ipcMain.handle("whisper_transcribe", async (_event, args) => {
    try {
        if (!whisperModule || !whisperModule.whisper) {
            throw new Error("Whisper 原生模块未加载。请确保 addon.node 文件存在于 electron/native/ 目录");
        }
        // 将音频数据写入临时文件
        const tmpDir = app.getPath("temp");
        const audioPath = path.join(tmpDir, `whisper-${Date.now()}.wav`);
        await fs.writeFile(audioPath, Buffer.from(args.audioData));
        // 模型文件路径（中文多语言模型）
        const modelPath = isDev
            ? path.join(__dirname, "models", "ggml-small.bin")
            : path.join(resourcesPath, "models", "ggml-small.bin");
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
        }
        catch (cleanupError) {
            // 忽略清理错误
        }
        // 提取转录文本
        let transcript = "";
        if (typeof result === "string") {
            transcript = result;
        }
        else if (result?.text) {
            transcript = result.text;
        }
        else if (result?.transcription && Array.isArray(result.transcription)) {
            transcript = result.transcription
                .map((item) => (Array.isArray(item) ? item[2] || "" : ""))
                .join(" ")
                .trim();
        }
        return { transcript: transcript.trim() };
    }
    catch (error) {
        throw new Error(error.message || "Whisper 转录失败");
    }
});
// 优雅退出
app.on("before-quit", () => {
    console.log("[Electron] 应用即将退出");
});
