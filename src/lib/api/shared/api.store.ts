import * as webDb from "idb-keyval";

// 统一的存储接口
export async function get(key: string): Promise<unknown> {
  return await webDb.get(key);
}

export async function set(key: string, value: unknown): Promise<void> {
  await webDb.set(key, value);
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
