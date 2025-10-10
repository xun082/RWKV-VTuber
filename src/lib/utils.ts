import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 检测是否在 Electron 环境中
// 通过 electronAPI 判断（在 preload.ts 中暴露）
const isElectron =
  typeof window !== "undefined" && !!(window as any).electronAPI;

console.log("🔍 环境检测:", {
  isElectron,
  hasElectronAPI: !!(window as any)?.electronAPI,
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
});

// Re-exports from other modules
export { speakApiList } from "./api/shared/api.speak.ts";
export { live2dList } from "./api/shared/api.live2d.ts";
export { set, get, save } from "./api/shared/api.store.ts";
export { openLink } from "./api/web/api.utils.ts";

// 根据环境动态导入 listenApiList
// 在 Electron 环境使用 Whisper，否则使用浏览器语音识别
import { listenApiList as electronListenApiList } from "./api/electron/api.listen.ts";
import { listenApiList as browserListenApiList } from "./api/shared/api.listen.ts";

export const listenApiList = isElectron
  ? (() => {
      console.log("🖥️ Electron 环境：使用 Whisper 语音识别");
      return electronListenApiList;
    })()
  : (() => {
      console.log("🌐 Web 环境：使用浏览器语音识别");
      return browserListenApiList;
    })();

// Utility functions
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

export function uuid(): string {
  return uuidv4();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
