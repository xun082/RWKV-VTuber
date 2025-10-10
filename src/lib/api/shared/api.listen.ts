// ListenApiList 类型已在全局 types.d.ts 中定义

export type ListenApi = (callback?: (text: string) => void) => {
  result: Promise<string>;
  start: () => void;
  stop: () => void;
};
export type ListenApiTest = () => Promise<boolean>;

const SpeechRecognition =
  // @ts-expect-error TS 无法识别 Web Speech API
  window.SpeechRecognition || window.webkitSpeechRecognition;

const listen_browser: ListenApi = (callback) => {
  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true; // 启用临时结果，获得更好的连续性
  recognition.continuous = true; // 启用连续识别，避免自动停止
  recognition.maxAlternatives = 1;

  // 添加网络重试机制
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒

  // 添加音频检测
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let microphone: MediaStreamAudioSourceNode | null = null;
  let animationFrame: number | null = null;

  const { promise, resolve, reject } = Promise.withResolvers<string>();
  let finalTranscript = "";
  let recognizing = false;
  let silenceTimer: NodeJS.Timeout | null = null;
  let lastSpeechTime = Date.now();
  let noResultTimer: NodeJS.Timeout | null = null;
  let hasReceivedResult = false;

  // 检测静音的函数
  const checkSilence = () => {
    const now = Date.now();
    const silenceDuration = now - lastSpeechTime;

    // 如果静音超过2秒且有最终结果，则停止识别
    if (silenceDuration > 2000 && finalTranscript.trim()) {
      console.log("🔇 检测到静音，停止识别");
      if (recognizing) {
        recognition.stop();
      }
    }
  };

  // 音频检测函数
  const startAudioDetection = async () => {
    try {
      console.log("🎵 启动音频检测...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectAudio = () => {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > 10) {
          // 检测到音频输入
          console.log(`🔊 检测到音频输入，音量: ${average.toFixed(2)}`);
          lastSpeechTime = Date.now();
        }

        if (recognizing) {
          animationFrame = requestAnimationFrame(detectAudio);
        }
      };

      detectAudio();
      console.log("✅ 音频检测启动成功");
    } catch (error) {
      console.error("❌ 音频检测启动失败:", error);
    }
  };

  const stopAudioDetection = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (microphone) {
      microphone.disconnect();
      microphone = null;
    }
    analyser = null;
    console.log("🛑 音频检测已停止");
  };

  recognition.onstart = () => {
    recognizing = true;
    lastSpeechTime = Date.now();
    hasReceivedResult = false;
    console.log("🎤 语音识别开始聆听...");
    console.log("🔍 语音识别配置:", {
      lang: recognition.lang,
      interimResults: recognition.interimResults,
      continuous: recognition.continuous,
      maxAlternatives: recognition.maxAlternatives,
    });

    // 启动音频检测
    startAudioDetection();

    // 启动无结果超时检测（10秒）
    noResultTimer = setTimeout(() => {
      if (!hasReceivedResult && recognizing) {
        console.error(
          "⚠️ 警告：已检测到音频输入，但语音识别服务未返回任何结果"
        );
        console.error("💡 可能原因：");
        console.error(
          "   1. 无法连接到 Google 语音识别服务（可能被防火墙阻止）"
        );
        console.error("   2. 需要使用 VPN 或代理访问 Google 服务");
        console.error("   3. 网络不稳定或延迟过高");
        console.error("💡 建议：");
        console.error("   - 检查网络连接");
        console.error("   - 尝试使用 VPN");
        console.error("   - 或使用国内语音识别服务");

        // 继续等待，不终止识别
      }
    }, 10000);
  };

  recognition.onend = () => {
    recognizing = false;
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
    if (noResultTimer) {
      clearTimeout(noResultTimer);
      noResultTimer = null;
    }

    // 停止音频检测
    stopAudioDetection();

    console.log("✅ 语音识别完成，最终结果:", finalTranscript);

    if (!hasReceivedResult && !finalTranscript) {
      console.warn("⚠️ 语音识别未返回任何结果，可能是网络连接问题");
    }

    resolve(finalTranscript || "未识别到语音内容");
  };

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onerror = (event) => {
    recognizing = false;
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
    if (noResultTimer) {
      clearTimeout(noResultTimer);
      noResultTimer = null;
    }

    const errorType = event.error;
    console.error("⚠️ 语音识别错误:", errorType);

    // 如果是因为没有语音输入而停止，返回已有结果
    if (errorType === "no-speech" && finalTranscript.trim()) {
      resolve(finalTranscript);
      return;
    }

    // 网络错误重试机制
    if (errorType === "network" && retryCount < maxRetries) {
      retryCount++;
      console.log(`🔄 网络错误，正在重试 (${retryCount}/${maxRetries})...`);

      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.error("重试启动失败:", error);
          reject(new Error(`语音识别重试失败: ${error}`));
        }
      }, retryDelay * retryCount);
      return;
    }

    // 根据错误类型提供详细的错误信息
    let errorMessage = "";
    switch (errorType) {
      case "network":
        errorMessage = `网络连接错误 (已重试 ${retryCount} 次)。请检查：\n1. 麦克风权限是否已授予\n2. 是否可以访问 Google 语音识别服务\n3. 网络连接是否正常\n4. 防火墙是否阻止了连接`;
        break;
      case "not-allowed":
      case "permission-denied":
        errorMessage = "麦克风权限被拒绝。请在浏览器设置中允许麦克风访问";
        break;
      case "no-speech":
        errorMessage = "未检测到语音输入";
        break;
      case "audio-capture":
        errorMessage = "无法捕获音频。请检查麦克风是否正常工作";
        break;
      case "aborted":
        errorMessage = "语音识别被中止";
        break;
      default:
        errorMessage = `语音识别错误: ${errorType}`;
    }

    reject(new Error(errorMessage));
  };

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onresult = (event) => {
    hasReceivedResult = true; // 标记已收到结果
    console.log("🎯 收到语音识别结果:", event);
    let interimTranscript = "";
    let newFinalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      console.log(
        `📊 结果 ${i}: "${transcript}" (最终: ${event.results[i].isFinal})`
      );

      if (event.results[i].isFinal) {
        newFinalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // 更新最后说话时间
    if (newFinalTranscript || interimTranscript) {
      lastSpeechTime = Date.now();
    }

    // 更新最终结果
    if (newFinalTranscript) {
      finalTranscript += newFinalTranscript;
      console.log("📝 最终识别结果:", newFinalTranscript);
    }

    // 实时回调（包含临时结果）
    const currentResult = finalTranscript + interimTranscript;
    console.log("🔄 当前完整结果:", currentResult);

    if (typeof callback === "function" && currentResult.trim()) {
      console.log("📤 调用回调函数:", currentResult);
      callback(currentResult);
    }

    // 启动静音检测
    if (!silenceTimer && recognizing) {
      silenceTimer = setInterval(checkSilence, 500);
    }
  };

  return {
    result: promise,
    start: () => {
      if (!recognizing) {
        console.log("🚀 启动语音识别...");
        lastSpeechTime = Date.now();
        try {
          recognition.start();
          console.log("✅ 语音识别启动成功");
        } catch (error) {
          console.error("❌ 语音识别启动失败:", error);
          reject(new Error(`语音识别启动失败: ${error}`));
        }
      } else {
        console.log("⚠️ 语音识别已在运行中");
      }
    },
    stop: () => {
      if (recognizing) {
        recognition.stop();
      }
      if (silenceTimer) {
        clearInterval(silenceTimer);
        silenceTimer = null;
      }

      // 停止音频检测
      stopAudioDetection();
    },
  };
};

const test_browser: ListenApiTest = async () => {
  try {
    console.log("🔍 开始语音识别测试...");

    // 检查浏览器支持
    if (!SpeechRecognition) {
      throw new Error("当前浏览器不支持语音识别，请使用 Chrome/Edge 桌面版");
    }
    console.log("✅ 浏览器支持语音识别 API");

    // 检查缓存的测试结果
    if (sessionStorage.getItem("microphone_tested") === "pass") {
      console.log("✅ 使用缓存的测试结果");
      return true;
    }

    // 检查 navigator.mediaDevices 是否可用
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "当前环境不支持访问媒体设备。请确保应用运行在安全上下文中（HTTPS 或 localhost）"
      );
    }

    console.log("🎤 请求麦克风权限...");

    // 测试麦克风访问
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    console.log("✅ 麦克风权限已授予");
    console.log(`📊 音频轨道数量: ${stream.getAudioTracks().length}`);

    // 输出音频设备信息
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      console.log(`🎵 音频设备: ${audioTracks[0].label}`);
      console.log(`⚙️ 音频设置:`, audioTracks[0].getSettings());
    }

    // 停止所有轨道
    for (const track of stream.getTracks()) {
      track.stop();
    }

    console.log("✅ 语音识别测试通过");
    sessionStorage.setItem("microphone_tested", "pass");
    return true;
  } catch (e) {
    console.error("❌ 语音识别测试失败:", e);

    // 提供更详细的错误信息
    let errorMessage = "语音识别测试失败: ";
    if (e instanceof Error) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        errorMessage += "麦克风权限被拒绝。请在浏览器设置中允许麦克风访问";
      } else if (
        e.name === "NotFoundError" ||
        e.name === "DevicesNotFoundError"
      ) {
        errorMessage += "未找到麦克风设备。请检查麦克风是否已连接";
      } else if (
        e.name === "NotReadableError" ||
        e.name === "TrackStartError"
      ) {
        errorMessage += "无法访问麦克风。设备可能被其他应用占用";
      } else if (e.name === "SecurityError") {
        errorMessage +=
          "安全错误。请确保应用运行在安全上下文中（HTTPS 或 localhost）";
      } else {
        errorMessage += e.message;
      }
    } else {
      errorMessage += String(e);
    }

    throw new Error(errorMessage);
  }
};

export const listenApiList: ListenApiList = [
  {
    name: "浏览器语音识别",
    api: (params: undefined) => ({
      api: (callback?: (text: string) => void) => listen_browser(callback),
      test: () => test_browser(),
    }),
  },
];
