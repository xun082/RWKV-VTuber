import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

export interface SherpaConfig {
  encoderPath: string; // Encoder 模型路径 (encoder.int8.onnx)
  decoderPath: string; // Decoder 模型路径 (decoder.int8.onnx)
  tokensPath: string; // tokens.txt 路径
}

export const DEFAULT_SHERPA_CONFIG: SherpaConfig = {
  encoderPath:
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en/encoder.int8.onnx",
  decoderPath:
    "sherpa-onnx-streaming-paraformer-bilingual-zh-en/decoder.int8.onnx",
  tokensPath: "sherpa-onnx-streaming-paraformer-bilingual-zh-en/tokens.txt",
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
