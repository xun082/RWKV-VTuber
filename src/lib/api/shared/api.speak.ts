import { speak_minimax, test_minimax } from "./api.minimax-tts";

// 检查是否在 Tauri 环境中
const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

// 检查是否在 Electron 环境中
const isElectron =
  typeof window !== "undefined" && !!(window as any).electronAPI;

// 动态导入 Tauri API（懒加载）
let tauriMinimax: any = null;
let tauriLoadPromise: Promise<any> | null = null;

const loadTauriMinimax = async () => {
  if (tauriMinimax) return tauriMinimax;

  if (!tauriLoadPromise) {
    tauriLoadPromise = (async () => {
      if (isTauri) {
        try {
          tauriMinimax = await import("../tauri/api.minimax-tts");
          return tauriMinimax;
        } catch (error) {
          console.warn("Failed to load Tauri MiniMax API:", error);
          return null;
        }
      }
      return null;
    })();
  }

  return await tauriLoadPromise;
};

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
    name: "MiniMax TTS",
    api: () => ({
      api: async (text: string) => {
        console.log("🔍 Environment check:", {
          isTauri,
          hasTauriWindow:
            typeof window !== "undefined" && !!(window as any).__TAURI__,
          hasTauriInternals:
            typeof window !== "undefined" &&
            !!(window as any).__TAURI_INTERNALS__,
          windowKeys:
            typeof window !== "undefined"
              ? Object.keys(window).filter((k) => k.includes("TAURI"))
              : "no window",
        });

        const tauri = await loadTauriMinimax();
        console.log("📦 Tauri module loaded:", !!tauri);

        if (isTauri && tauri) {
          console.log("🦀 Using Tauri MiniMax TTS");
          return tauri.speak_minimax_tauri(text);
        } else {
          console.log("🌐 Using Web MiniMax TTS (fallback)");
          return speak_minimax(text);
        }
      },
      test: async () => {
        const tauri = await loadTauriMinimax();
        if (isTauri && tauri) {
          console.log("🦀 Testing Tauri MiniMax TTS");
          return tauri.test_minimax_tauri();
        } else {
          console.log("🌐 Testing Web MiniMax TTS");
          return test_minimax();
        }
      },
    }),
  },
  {
    name: "关闭",
    api: null,
  },
];

// 如果在 Electron 环境，添加 Sherpa-ONNX TTS
if (isElectron) {
  speakApiListArray.splice(1, 0, {
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
