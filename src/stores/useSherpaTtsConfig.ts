import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

// ==================== 常量定义 ====================
const STORAGE_KEYS = {
  SHERPA_TTS_CONFIG: "sherpa_tts_config",
} as const;

const MODEL_PATHS = {
  ACOUSTIC_MODEL: "matcha-icefall-zh-baker/model-steps-3.onnx",
  VOCODER: "vocos-22khz-univ.onnx",
  LEXICON: "matcha-icefall-zh-baker/lexicon.txt",
  TOKENS: "matcha-icefall-zh-baker/tokens.txt",
  PHONE_FST: "matcha-icefall-zh-baker/phone.fst",
  DATE_FST: "matcha-icefall-zh-baker/date.fst",
  NUMBER_FST: "matcha-icefall-zh-baker/number.fst",
} as const;

// ==================== 类型定义 ====================
/**
 * Sherpa-onnx TTS 配置接口
 */
export interface SherpaTTSConfig {
  enabled: boolean;
  acousticModel: string;
  vocoder: string;
  lexicon: string;
  tokens: string;
  noiseScale: number;
  lengthScale: number;
  numThreads: number;
  speed: number;
  ruleFsts: string;
}

/**
 * Sherpa TTS 配置 Store API
 */
type SherpaTtsConfigAPI = {
  config: SherpaTTSConfig;
  setConfig: (config: Partial<SherpaTTSConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
};

// ==================== 默认配置 ====================
/**
 * Sherpa TTS 默认配置
 * - enabled: 默认关闭
 * - numThreads: 固定为 1 线程，避免性能问题
 * - ruleFsts: 包含电话、日期、数字的 FST 规则
 */
export const DEFAULT_SHERPA_TTS_CONFIG: SherpaTTSConfig = {
  enabled: false,
  acousticModel: MODEL_PATHS.ACOUSTIC_MODEL,
  vocoder: MODEL_PATHS.VOCODER,
  lexicon: MODEL_PATHS.LEXICON,
  tokens: MODEL_PATHS.TOKENS,
  noiseScale: 0.667,
  lengthScale: 1.0,
  numThreads: 1,
  speed: 1.0,
  ruleFsts: `${MODEL_PATHS.PHONE_FST},${MODEL_PATHS.DATE_FST},${MODEL_PATHS.NUMBER_FST}`,
};

// ==================== 工具函数 ====================
/**
 * 从存储中加载配置
 */
const loadConfigFromStorage = async (): Promise<SherpaTTSConfig> => {
  const stored = await get(STORAGE_KEYS.SHERPA_TTS_CONFIG);
  return (stored as SherpaTTSConfig) ?? DEFAULT_SHERPA_TTS_CONFIG;
};

// ==================== 初始化 ====================
const initialConfig = await loadConfigFromStorage();

// ==================== Store 定义 ====================
export const useSherpaTtsConfig = create<SherpaTtsConfigAPI>()(
  (setState, getState) => ({
    config: initialConfig,

    /**
     * 更新配置（部分更新）
     */
    setConfig: async (config) => {
      const newConfig = { ...getState().config, ...config };
      setState({ config: newConfig });
      await set(STORAGE_KEYS.SHERPA_TTS_CONFIG, newConfig);
    },

    /**
     * 重置配置到默认值
     */
    resetConfig: async () => {
      setState({ config: DEFAULT_SHERPA_TTS_CONFIG });
      await set(STORAGE_KEYS.SHERPA_TTS_CONFIG, DEFAULT_SHERPA_TTS_CONFIG);
    },
  })
);
