import { save as _save } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";

// 检查是否在 Tauri 环境中
const isTauri = typeof window !== "undefined" && window.__TAURI__;

// 安全地初始化 store
let db: any = null;
if (isTauri) {
  try {
    db = await load("data.json");
  } catch (error) {
    console.warn("Failed to load Tauri store:", error);
    // 创建一个模拟的 store 对象
    db = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      save: () => Promise.resolve(),
    };
  }
} else {
  // 在非 Tauri 环境中创建模拟的 store 对象
  db = {
    get: () => Promise.resolve(undefined),
    set: () => Promise.resolve(),
    save: () => Promise.resolve(),
  };
}

export function get(
  key: "long_term_memory"
): Promise<LongTermMemory[] | undefined>;
export function get(
  key: "short_term_memory"
): Promise<ShortTermMemory[] | undefined>;
export function get(
  key: "archived_memory"
): Promise<ArchivedMemory[] | undefined>;
export function get(key: "last_used_token"): Promise<number | undefined>;
export function get(
  key: "audios_cache"
): Promise<{ timestamp: number; audio: Uint8Array }[] | undefined>;
export function get(key: StoreKeys): Promise<string | undefined>;
export function get(key: StoreKeys): Promise<unknown> {
  return db.get(key);
}

export function set(
  key: "long_term_memory",
  value: LongTermMemory[]
): Promise<void>;
export function set(
  key: "short_term_memory",
  value: ShortTermMemory[]
): Promise<void>;
export function set(
  key: "archived_memory",
  value: ArchivedMemory[]
): Promise<void>;
export function set(
  key: "last_used_token",
  value: number | undefined
): Promise<void>;
export function set(
  key: "audios_cache",
  value: { timestamp: number; audio: Uint8Array }[]
): Promise<void>;
export function set(key: StoreKeys, value: string | undefined): Promise<void>;
export async function set(key: StoreKeys, value: unknown): Promise<void> {
  await db.set(key, value);
  // await db.save()
  return;
}

export async function save(data: string): Promise<string> {
  if (!isTauri) {
    // 在非 Tauri 环境中，使用浏览器的下载功能
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "memory.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "memory.json";
  }

  try {
    const path = await _save({
      title: "保存记忆",
      defaultPath: "memory.json",
      filters: [
        { name: "JSON", extensions: ["json"] },
        { name: "TXT", extensions: ["txt"] },
      ],
    });
    if (!path) throw new Error("取消保存");

    // For now, return the path since invoke is not available
    // TODO: Implement file writing when Tauri API is properly configured
    return path;
  } catch (error) {
    console.warn("Failed to save file:", error);
    throw new Error("保存失败");
  }
}
