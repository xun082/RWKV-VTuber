import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

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

export const DEFAULT_SHERPA_TTS_CONFIG: SherpaTTSConfig = {
  enabled: false,
  acousticModel: "matcha-icefall-zh-baker/model-steps-3.onnx",
  vocoder: "vocos-22khz-univ.onnx",
  lexicon: "matcha-icefall-zh-baker/lexicon.txt",
  tokens: "matcha-icefall-zh-baker/tokens.txt",
  noiseScale: 0.667,
  lengthScale: 1.0,
  numThreads: 1, // 固定为 1 线程，避免性能问题
  speed: 1.0,
  ruleFsts:
    "matcha-icefall-zh-baker/phone.fst,matcha-icefall-zh-baker/date.fst,matcha-icefall-zh-baker/number.fst",
};

type API = {
  config: SherpaTTSConfig;
  setConfig: (config: Partial<SherpaTTSConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
};

const localConfig =
  (await get("sherpa_tts_config")) ?? DEFAULT_SHERPA_TTS_CONFIG;

export const useSherpaTtsConfig = create<API>()((setState, getState) => ({
  config: localConfig,
  setConfig: async (config) => {
    const newConfig = { ...getState().config, ...config };
    setState({ config: newConfig });
    await set("sherpa_tts_config", newConfig);
  },
  resetConfig: async () => {
    setState({ config: DEFAULT_SHERPA_TTS_CONFIG });
    await set("sherpa_tts_config", DEFAULT_SHERPA_TTS_CONFIG);
  },
}));
