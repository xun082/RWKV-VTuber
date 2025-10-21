import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

export interface SherpaConfig {
  modelPath: string; // 模型文件路径 (model.int8.onnx)
  tokensPath: string; // tokens.txt 路径
  numThreads: number; // 线程数
  useInt8Model: boolean; // 是否使用 INT8 量化模型
}

export const DEFAULT_SHERPA_CONFIG: SherpaConfig = {
  modelPath: "sherpa/model.int8.onnx",
  tokensPath: "sherpa/tokens.txt",
  numThreads: 2,
  useInt8Model: true,
};

interface SherpaConfigStore {
  config: SherpaConfig;
  setConfig: (config: Partial<SherpaConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
}

// 从本地存储加载配置
const loadConfig = async (): Promise<SherpaConfig> => {
  const saved = await get("sherpa_config");
  if (saved && typeof saved === "object") {
    return { ...DEFAULT_SHERPA_CONFIG, ...saved };
  }
  return DEFAULT_SHERPA_CONFIG;
};

const initialConfig = await loadConfig();

export const useSherpaConfig = create<SherpaConfigStore>()(
  (setState, getState) => ({
    config: initialConfig,

    setConfig: async (newConfig: Partial<SherpaConfig>) => {
      const updated = { ...getState().config, ...newConfig };
      setState({ config: updated });
      await set("sherpa_config", updated);
    },

    resetConfig: async () => {
      setState({ config: DEFAULT_SHERPA_CONFIG });
      await set("sherpa_config", DEFAULT_SHERPA_CONFIG);
    },
  })
);
