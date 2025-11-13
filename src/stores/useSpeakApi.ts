import { create } from "zustand";
import { get, set, speakApiList } from "../lib/utils.ts";
import type { SherpaTTSConfig } from "./useSherpaTtsConfig";
import { DEFAULT_SHERPA_TTS_CONFIG } from "./useSherpaTtsConfig";

// ==================== 常量定义 ====================
const STORAGE_KEYS = {
  DEFAULT_SPEAK_API: "default_speak_api",
  SHERPA_TTS_CONFIG: "sherpa_tts_config",
  AUDIOS_CACHE: "audios_cache",
} as const;

// ==================== 类型定义 ====================
/**
 * 音频缓存项
 */
export interface AudioCacheItem {
  timestamp: number;
  audio: Uint8Array;
}

/**
 * 语音合成 API Store
 */
type SpeakApiStoreAPI = {
  // 语音 API 相关
  speak: SpeakApi | null;
  testSpeak: SpeakApiTest | null;
  speakApiList: SpeakApiList;
  currentSpeakApi: string;
  setSpeakApi: (name: string) => Promise<void>;

  // 音频缓存管理
  audiosCache: AudioCacheItem[];
  setAudiosCache: (value: AudioCacheItem[]) => Promise<void>;
  addAudioCache: (value: AudioCacheItem) => Promise<void>;

  // Sherpa TTS 配置
  sherpaTtsConfig: SherpaTTSConfig;
  setSherpaTtsConfig: (config: Partial<SherpaTTSConfig>) => Promise<void>;
};

// ==================== 工具函数 ====================
/**
 * 根据名称查找语音 API
 */
const findSpeakApiByName = (
  name: string | null
): (typeof speakApiList)[0] | undefined => {
  if (!name) return undefined;
  return speakApiList.find((item) => item.name === name);
};

/**
 * 加载 API 实例
 * 注意：某些 API（如 Sherpa-ONNX TTS）不需要参数，使用空对象作为默认参数
 */
const loadApiInstance = (
  apiItem: (typeof speakApiList)[0] | undefined
): { api: SpeakApi | null; test: SpeakApiTest | null } => {
  if (!apiItem?.api) {
    return { api: null, test: null };
  }
  // 使用 as any 来处理不同的 API 签名（有些需要参数，有些不需要）
  const instance = (apiItem.api as any)({});
  return {
    api: instance?.api || null,
    test: instance?.test || null,
  };
};

/**
 * 从存储中加载音频缓存
 */
const loadAudiosCacheFromStorage = async (): Promise<AudioCacheItem[]> => {
  const cached = await get(STORAGE_KEYS.AUDIOS_CACHE);
  return (cached as AudioCacheItem[]) ?? [];
};

/**
 * 从存储中加载 Sherpa TTS 配置
 */
const loadSherpaTtsConfigFromStorage = async (): Promise<SherpaTTSConfig> => {
  const config = await get(STORAGE_KEYS.SHERPA_TTS_CONFIG);
  return (config as SherpaTTSConfig) ?? DEFAULT_SHERPA_TTS_CONFIG;
};

// ==================== 初始化 ====================
/**
 * 初始化默认配置和 API
 */
const initializeDefaults = async () => {
  const localSpeakApiName = (await get(STORAGE_KEYS.DEFAULT_SPEAK_API)) as
    | string
    | null;
  const sherpaTtsConfig = await loadSherpaTtsConfigFromStorage();
  const audiosCache = await loadAudiosCacheFromStorage();

  // 查找并加载默认 API，如果找不到则使用列表第一个
  const foundApiItem = findSpeakApiByName(localSpeakApiName);
  const defaultApiItem = foundApiItem ?? speakApiList[0];

  if (!defaultApiItem) {
    throw new Error("No speak API available in speakApiList");
  }

  const defaultApi = loadApiInstance(defaultApiItem);

  return {
    defaultApiItem,
    defaultApi,
    sherpaTtsConfig,
    audiosCache,
  };
};

const defaults = await initializeDefaults();

// ==================== Store 定义 ====================
export const useSpeakApi = create<SpeakApiStoreAPI>()((setState, getState) => ({
  // ==================== 语音 API 管理 ====================
  speak: defaults.defaultApi.api,
  testSpeak: defaults.defaultApi.test,
  speakApiList,
  currentSpeakApi: defaults.defaultApiItem.name,

  /**
   * 切换语音 API
   */
  setSpeakApi: async (name) => {
    const apiItem = findSpeakApiByName(name);
    if (!apiItem) {
      console.error(`Speak API "${name}" not found`);
      return;
    }

    const apiInstance = loadApiInstance(apiItem);
    setState({
      currentSpeakApi: name,
      speak: apiInstance.api,
      testSpeak: apiInstance.test,
    });
    await set(STORAGE_KEYS.DEFAULT_SPEAK_API, name);
  },

  // ==================== 音频缓存管理 ====================
  audiosCache: defaults.audiosCache,

  /**
   * 设置音频缓存（替换）
   */
  setAudiosCache: async (value) => {
    setState({ audiosCache: value });
    await set(STORAGE_KEYS.AUDIOS_CACHE, value);
  },

  /**
   * 添加音频到缓存（前置插入）
   */
  addAudioCache: async (value) => {
    const { audiosCache } = getState();
    const newCache = [value, ...audiosCache];
    setState({ audiosCache: newCache });
    await set(STORAGE_KEYS.AUDIOS_CACHE, newCache);
  },

  // ==================== Sherpa TTS 配置管理 ====================
  sherpaTtsConfig: defaults.sherpaTtsConfig,

  /**
   * 更新 Sherpa TTS 配置
   * 注意：更新配置后需要重新加载当前 API 实例
   */
  setSherpaTtsConfig: async (config) => {
    const { currentSpeakApi } = getState();
    const newConfig = { ...getState().sherpaTtsConfig, ...config };

    // 重新加载当前 API（因为配置可能影响 API 初始化）
    const apiItem = findSpeakApiByName(currentSpeakApi);
    const apiInstance = loadApiInstance(apiItem);

    setState({
      sherpaTtsConfig: newConfig,
      speak: apiInstance.api,
      testSpeak: apiInstance.test,
    });

    await set(STORAGE_KEYS.SHERPA_TTS_CONFIG, newConfig);
  },
}));
