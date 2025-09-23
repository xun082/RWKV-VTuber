import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-exports from other modules
export { speakApiList } from "./api/shared/api.speak.ts";
export { listenApiList } from "./api/shared/api.listen.ts";
export { live2dList } from "./api/shared/api.live2d.ts";
export {
  set,
  get,
  save,
  migrateFromWebToTauri,
  migrateFromTauriToWeb,
} from "./api/shared/api.store.ts";
export { openLink } from "./api/tauri/api.utils.ts";

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
