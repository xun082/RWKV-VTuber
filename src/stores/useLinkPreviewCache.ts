import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  timestamp: number; // 缓存时间戳
  failed?: boolean; // 是否获取失败
  error?: string; // 失败原因
  failCount?: number; // 失败次数
}

interface LinkPreviewCacheState {
  cache: Record<string, LinkPreviewData>;

  // 获取缓存的链接预览数据（只返回成功的）
  get: (url: string) => LinkPreviewData | null;

  // 设置链接预览数据到缓存
  set: (data: LinkPreviewData) => void;

  // 标记链接为失败
  setFailed: (url: string, error?: string) => void;

  // 检查链接是否已失败（且在冷却期内）
  isFailed: (url: string) => boolean;

  // 获取失败信息（用于调试）
  getFailedInfo: (url: string) => { error?: string; failCount?: number; cooldownEnd?: number } | null;

  // 清除单个链接的缓存（包括失败记录）
  remove: (url: string) => void;

  // 清除所有失败记录
  clearFailed: () => void;

  // 清除过期缓存（永久缓存下此方法保留但不生效）
  clearExpired: (maxAge?: number) => void;

  // 清空所有缓存
  clear: () => void;

  // 获取统计信息
  getStats: () => {
    total: number;
    success: number;
    failed: number;
    expired: number;
  };
}

const FAILED_COOLDOWN = 24 * 60 * 60 * 1000; // 失败后24小时内不重试

export const useLinkPreviewCache = create<LinkPreviewCacheState>()(
  persist(
    (set, get) => ({
      cache: {},

      get: (url: string) => {
        const cached = get().cache[url];
        if (!cached) return null;

        // 如果是失败记录，不返回
        if (cached.failed) return null;

        // 缓存永久有效，不过期
        return cached;
      },

      set: (data: LinkPreviewData) => {
        set((state) => ({
          cache: {
            ...state.cache,
            [data.url]: {
              ...data,
              timestamp: Date.now(),
              failed: false, // 成功获取，清除失败标记
              failCount: 0, // 重置失败计数
            },
          },
        }));
      },

      setFailed: (url: string, error?: string) => {
        set((state) => {
          const existing = state.cache[url];
          const failCount = (existing?.failCount || 0) + 1;

          return {
            cache: {
              ...state.cache,
              [url]: {
                url,
                timestamp: Date.now(),
                failed: true,
                error,
                failCount,
              },
            },
          };
        });
      },

      isFailed: (url: string) => {
        const cached = get().cache[url];
        if (!cached || !cached.failed) return false;

        const now = Date.now();
        const timeSinceFail = now - cached.timestamp;

        // 根据失败次数动态调整冷却时间
        let cooldownTime = FAILED_COOLDOWN;
        if (cached.failCount && cached.failCount >= 3) {
          // 失败3次以上，冷却时间延长到7天
          cooldownTime = 7 * 24 * 60 * 60 * 1000;
        }

        // 如果还在冷却期内
        if (timeSinceFail < cooldownTime) {
          return true;
        }

        // 冷却期结束，删除失败记录，允许重试
        set((state) => {
          const newCache = { ...state.cache };
          delete newCache[url];
          return { cache: newCache };
        });
        return false;
      },

      getFailedInfo: (url: string) => {
        const cached = get().cache[url];
        if (!cached || !cached.failed) return null;
        
        let cooldownTime = FAILED_COOLDOWN;
        if (cached.failCount && cached.failCount >= 3) {
          cooldownTime = 7 * 24 * 60 * 60 * 1000;
        }

        return {
          error: cached.error,
          failCount: cached.failCount,
          cooldownEnd: cached.timestamp + cooldownTime,
        };
      },

      remove: (url: string) => {
        set((state) => {
          const newCache = { ...state.cache };
          delete newCache[url];
          return { cache: newCache };
        });
      },

      clearFailed: () => {
        set((state) => {
          const newCache: Record<string, LinkPreviewData> = {};

          for (const [url, data] of Object.entries(state.cache)) {
            if (!data.failed) {
              newCache[url] = data;
            }
          }

          return { cache: newCache };
        });
      },

      clearExpired: () => {
        // 缓存永久有效，无需清理
      },

      clear: () => {
        set({ cache: {} });
      },

      getStats: () => {
        const state = get();
        let success = 0;
        let failed = 0;

        for (const data of Object.values(state.cache)) {
          if (data.failed) {
            failed++;
          } else {
            success++;
          }
        }

        return {
          total: Object.keys(state.cache).length,
          success,
          failed,
          expired: 0, // 永久缓存，无过期
        };
      },
    }),
    {
      name: "link-preview-cache", // localStorage key
    },
  ),
);
