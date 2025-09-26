import { create } from "zustand";
import { get, set, speakApiList } from "../lib/utils.ts";
import type { MinimaxTTSConfig } from "../lib/api/shared/api.minimax-tts";
import { DEFAULT_MINIMAX_CONFIG } from "../lib/api/shared/api.minimax-tts";

type API = {
  speak: SpeakApi | null;
  testSpeak: SpeakApiTest | null;
  speakApiList: SpeakApiList;
  currentSpeakApi: string;
  setSpeakApi: (name: string) => Promise<void>;

  audiosCache: { timestamp: number; audio: Uint8Array }[];
  setAudiosCache: (
    value: { timestamp: number; audio: Uint8Array }[]
  ) => Promise<void>;
  addAudioCache: (value: {
    timestamp: number;
    audio: Uint8Array;
  }) => Promise<void>;

  minimaxConfig: MinimaxTTSConfig;
  setMinimaxConfig: (config: Partial<MinimaxTTSConfig>) => Promise<void>;
};

const localSpeakApi = await get("default_speak_api");
const localMinimaxConfig =
  (await get("minimax_tts_config")) ?? DEFAULT_MINIMAX_CONFIG;
const localAudiosCache = (await get("audios_cache")) ?? [];

const defaultLoad =
  speakApiList.find(({ name }) => name === localSpeakApi) ?? speakApiList[0];
const defaultApi = defaultLoad.api?.({});

export const useSpeakApi = create<API>()((setState, getState) => ({
  audiosCache: localAudiosCache,
  setAudiosCache: async (value) => {
    setState({ audiosCache: value });
    await set("audios_cache", value);
  },
  addAudioCache: async (value) => {
    const { audiosCache } = getState();
    const newCache = [value, ...audiosCache];
    setState({ audiosCache: newCache });
    await set("audios_cache", newCache);
  },
  speak: defaultApi?.api || null,
  testSpeak: defaultApi?.test || null,
  speakApiList: speakApiList,
  currentSpeakApi: defaultLoad.name,
  setSpeakApi: async (name) => {
    const item = speakApiList.find((api) => api.name === name);
    if (item) {
      const api = item.api?.({});
      setState({
        currentSpeakApi: name,
        speak: api?.api || null,
        testSpeak: api?.test || null,
      });
      await set("default_speak_api", name);
    }
    return;
  },
  minimaxConfig: localMinimaxConfig,
  setMinimaxConfig: async (config) => {
    const newConfig = { ...getState().minimaxConfig, ...config };
    const item = speakApiList.find(
      (api) => api.name === getState().currentSpeakApi
    );
    if (item) {
      const api = item.api?.({});
      setState({
        minimaxConfig: newConfig,
        speak: api?.api || null,
        testSpeak: api?.test || null,
      });
    }
    await set("minimax_tts_config", newConfig);
  },
}));
