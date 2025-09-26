import type { ListenApiList } from "../../stores/useListenApi";

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

  const { promise, resolve, reject } = Promise.withResolvers<string>();
  let finalTranscript = "";
  let recognizing = false;
  let silenceTimer: NodeJS.Timeout | null = null;
  let lastSpeechTime = Date.now();

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

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onstart = () => {
    recognizing = true;
    lastSpeechTime = Date.now();
    console.log("🎤 语音识别开始聆听...");
  };

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onend = () => {
    recognizing = false;
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
    console.log("✅ 语音识别完成，最终结果:", finalTranscript);
    resolve(finalTranscript || "未识别到语音内容");
  };

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onerror = (event) => {
    recognizing = false;
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
    console.error("⚠️ 语音识别错误:", event.error);

    // 如果是因为没有语音输入而停止，返回已有结果
    if (event.error === "no-speech" && finalTranscript.trim()) {
      resolve(finalTranscript);
    } else {
      reject(new Error(`语音识别错误: ${event.error}`));
    }
  };

  // @ts-expect-error TS 无法识别 Web Speech API
  recognition.onresult = (event) => {
    let interimTranscript = "";
    let newFinalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
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
    if (typeof callback === "function" && currentResult.trim()) {
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
        lastSpeechTime = Date.now();
        recognition.start();
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
    },
  };
};

const test_browser: ListenApiTest = async () => {
  try {
    if (!SpeechRecognition) {
      throw new Error("当前浏览器不支持语音识别，请使用 Chrome/Edge 桌面版");
    }
    if (sessionStorage.getItem("microphone_tested") === "pass") {
      return true;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    sessionStorage.setItem("microphone_tested", "pass");
    return true;
  } catch (e) {
    throw new Error(`语音识别测试失败: ${e instanceof Error ? e.message : e}`);
  }
};

export const listenApiList: ListenApiList = [
  {
    name: "浏览器语音识别",
    api: () => ({
      api: (callback: (text: string) => void) => listen_browser(callback),
      test: () => test_browser(),
    }),
  },
];
