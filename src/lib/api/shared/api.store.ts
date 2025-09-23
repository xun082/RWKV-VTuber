// 统一的存储适配器，支持 Tauri 和 Web 环境
import * as webDb from "idb-keyval";

// 检查是否在 Tauri 环境中
const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

// Tauri 存储接口
interface TauriStore {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  save: () => Promise<void>;
}

// 动态导入 Tauri 存储
let tauriStore: TauriStore | null = null;

if (isTauri) {
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    tauriStore = await load("data.json");
  } catch (error) {
    console.warn("Failed to load Tauri store:", error);
    // 创建模拟的 Tauri store
    tauriStore = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      save: () => Promise.resolve(),
    };
  }
}

// 统一的存储接口
export async function get(key: string): Promise<unknown> {
  if (isTauri && tauriStore) {
    return await tauriStore.get(key);
  } else {
    return await webDb.get(key);
  }
}

export async function set(key: string, value: unknown): Promise<void> {
  if (isTauri && tauriStore) {
    await tauriStore.set(key, value);
    // 在 Tauri 中自动保存
    try {
      await tauriStore.save();
    } catch (error) {
      console.warn("Failed to save Tauri store:", error);
    }
  } else {
    await webDb.set(key, value);
  }
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
    const { save: _save } = await import("@tauri-apps/plugin-dialog");
    const path = await _save({
      title: "保存记忆",
      defaultPath: "memory.json",
      filters: [
        { name: "JSON", extensions: ["json"] },
        { name: "TXT", extensions: ["txt"] },
      ],
    });
    if (!path) throw new Error("取消保存");
    return path;
  } catch (error) {
    console.warn("Failed to save file:", error);
    throw new Error("保存失败");
  }
}

// 数据迁移功能：从 Web 存储迁移到 Tauri 存储
export async function migrateFromWebToTauri(): Promise<void> {
  if (!isTauri || !tauriStore) return;

  try {
    // 获取所有 Web 存储的键
    const keys = await webDb.keys();

    for (const key of keys) {
      const value = await webDb.get(key);
      if (value !== undefined) {
        await tauriStore.set(String(key), value);
        console.log(`Migrated key: ${key}`);
      }
    }

    // 保存 Tauri 存储
    await tauriStore.save();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// 数据迁移功能：从 Tauri 存储迁移到 Web 存储
export async function migrateFromTauriToWeb(): Promise<void> {
  if (isTauri || !tauriStore) return;

  try {
    // 这里需要实现从 Tauri 存储读取数据的逻辑
    // 由于我们在 Web 环境中，无法直接访问 Tauri 存储
    // 这个功能主要用于开发调试
    console.log(
      "Migration from Tauri to Web is not supported in Web environment"
    );
  } catch (error) {
    console.error("Migration failed:", error);
  }
}
