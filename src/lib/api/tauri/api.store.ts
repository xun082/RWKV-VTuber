// Electron/Web 环境使用 IndexedDB
import * as idbKeyval from "idb-keyval";

// 使用 idb-keyval 作为统一存储
const db = {
  get: (key: string) => idbKeyval.get(key),
  set: (key: string, value: unknown) => idbKeyval.set(key, value),
  save: () => Promise.resolve(), // IndexedDB 自动保存
};

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
  // 使用浏览器的下载功能
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
