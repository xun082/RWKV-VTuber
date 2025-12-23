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

// 动态导入 Electron MiniMax TTS API（懒加载）
let electronMiniMaxTts: any = null;
let electronMiniMaxTtsLoadPromise: Promise<any> | null = null;

const loadElectronMiniMaxTts = async () => {
  if (electronMiniMaxTts) return electronMiniMaxTts;

  if (!electronMiniMaxTtsLoadPromise) {
    electronMiniMaxTtsLoadPromise = (async () => {
      if (isElectron) {
        try {
          electronMiniMaxTts = await import("../electron/api.minimax-tts");
          return electronMiniMaxTts;
        } catch (error) {
          console.warn("Failed to load Electron MiniMax TTS API:", error);
          return null;
        }
      }
      return null;
    })();
  }

  return await electronMiniMaxTtsLoadPromise;
};

const speakApiListArray: SpeakApiList = [];

// 如果在 Electron 环境，添加 TTS 选项
if (isElectron) {
  // 先添加 Sherpa-ONNX TTS（本地离线，备用）
  speakApiListArray.unshift({
    name: "Sherpa-ONNX TTS (离线)",
    api: () => ({
      api: async (text: string) => {
        const sherpa = await loadElectronSherpaTts();
        if (!sherpa) {
          throw new Error("Sherpa-ONNX TTS module not available");
        }
        return sherpa.speak_sherpa_tts(text);
      },
      test: async () => {
        const sherpa = await loadElectronSherpaTts();
        if (!sherpa) {
          throw new Error("Sherpa-ONNX TTS module not available");
        }
        return sherpa.test_sherpa_tts();
      },
    }),
  });

  // 最后添加 MiniMax TTS（在线服务，默认首选）- 会在最前面
  speakApiListArray.unshift({
    name: "MiniMax TTS",
    api: () => ({
      api: async (text: string) => {
        const minimax = await loadElectronMiniMaxTts();
        if (!minimax) {
          throw new Error("MiniMax TTS module not available");
        }
        return minimax.speak_minimax_tts(text);
      },
      test: async () => {
        const minimax = await loadElectronMiniMaxTts();
        if (!minimax) {
          throw new Error("MiniMax TTS module not available");
        }
        return minimax.test_minimax_tts();
      },
    }),
  });
}

export const speakApiList: SpeakApiList = speakApiListArray;
