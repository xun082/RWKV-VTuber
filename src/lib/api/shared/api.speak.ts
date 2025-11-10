// 检查是否在 Electron 环境中
const isElectron =
  typeof window !== "undefined" && !!(window as any).electronAPI;

// 动态导入 Electron Sherpa TTS API（懒加载）
let electronSherpaTts: any = null;
let electronSherpaTtsLoadPromise: Promise<any> | null = null;

const loadElectronSherpaTts = async () => {
  if (electronSherpaTts) return electronSherpaTts;

  if (!electronSherpaTtsLoadPromise) {
    electronSherpaTtsLoadPromise = (async () => {
      if (isElectron) {
        try {
          electronSherpaTts = await import("../electron/api.sherpa-tts");
          return electronSherpaTts;
        } catch (error) {
          console.warn("Failed to load Electron Sherpa TTS API:", error);
          return null;
        }
      }
      return null;
    })();
  }

  return await electronSherpaTtsLoadPromise;
};

const speakApiListArray: SpeakApiList = [
  {
    name: "关闭",
    api: null,
  },
];

// 如果在 Electron 环境，添加 Sherpa-ONNX TTS
if (isElectron) {
  speakApiListArray.unshift({
    name: "Sherpa-ONNX TTS",
    api: () => ({
      api: async (text: string) => {
        console.log("🎙️ Using Electron Sherpa-ONNX TTS");
        const sherpa = await loadElectronSherpaTts();
        if (!sherpa) {
          throw new Error("Sherpa-ONNX TTS module not available");
        }
        return sherpa.speak_sherpa_tts(text);
      },
      test: async () => {
        console.log("🎙️ Testing Electron Sherpa-ONNX TTS");
        const sherpa = await loadElectronSherpaTts();
        if (!sherpa) {
          throw new Error("Sherpa-ONNX TTS module not available");
        }
        return sherpa.test_sherpa_tts();
      },
    }),
  });
}

export const speakApiList: SpeakApiList = speakApiListArray;
