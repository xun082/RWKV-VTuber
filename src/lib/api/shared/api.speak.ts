import type { SpeakApiList } from "../../stores/useSpeakApi";
import { speak_minimax, test_minimax } from "./api.minimax-tts";

// 检查是否在 Tauri 环境中
const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

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

export const speakApiList: SpeakApiList = [
  {
    name: "MiniMax TTS",
    api: () => ({
      api: async (text: string) => {
        const tauri = await loadTauriMinimax();
        if (isTauri && tauri) {
          console.log("🦀 Using Tauri MiniMax TTS");
          return tauri.speak_minimax_tauri(text);
        } else {
          console.log("🌐 Using Web MiniMax TTS");
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
