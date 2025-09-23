import emojiRegex from "emoji-regex";
import { toBase64 } from "../../utils.ts";
const emoji = emojiRegex();

// Web Speech API TTS
const speak_webspeech = async (
  text: string,
  options?: {
    voice?: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }
): Promise<{ audio: Uint8Array }> => {
  return new Promise((resolve, reject) => {
    try {
      const t = text.replace(new RegExp(emoji, "g"), "");
      if (t.length === 0) {
        throw new Error("文本为空");
      }

      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        throw new Error("当前浏览器不支持 Web Speech API");
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(t);

      // Set voice if specified
      if (options?.voice) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find((v) => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Set language if specified
      if (options?.lang) {
        utterance.lang = options.lang;
      }

      // Set speech parameters
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;

      utterance.onstart = () => {
        console.log("Web Speech API: 开始播放");
      };

      utterance.onend = () => {
        console.log("Web Speech API: 播放完成");
        // For Web Speech API, we don't return actual audio data
        // Instead, we return empty audio data since the speech is played directly
        resolve({ audio: new Uint8Array(0) });
      };

      utterance.onerror = (event) => {
        console.error("Web Speech API 错误:", event.error);
        reject(new Error(`Web Speech API 错误: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      reject(
        new Error(`Web Speech API 错误: ${e instanceof Error ? e.message : e}`)
      );
    }
  });
};

const test_webspeech = async (): Promise<boolean> => {
  try {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      return false;
    }

    // Test by checking if voices are available
    const voices = window.speechSynthesis.getVoices();
    return voices.length > 0;
  } catch (e) {
    console.error("Web Speech API 测试失败:", e);
    return false;
  }
};

const speak_f5tts = async (
  text: string,
  endpoint: string
): Promise<{ audio: Uint8Array }> => {
  try {
    const t = text.replace(new RegExp(emoji, "g"), "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }
    const refText: string = await (await fetch("/tts/luoshaoye.txt")).text();
    const refAudio: Uint8Array = new Uint8Array(
      await (await fetch("/tts/luoshaoye.wav")).arrayBuffer()
    );
    const formData = new FormData();
    formData.append("ref_text", refText);
    formData.append("gen_text", t);
    formData.append("model", "f5-tts");
    formData.append("audio", new Blob([refAudio], { type: "audio/wav" }));
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const audio = new Uint8Array(await res.arrayBuffer());
    return { audio };
  } catch (e) {
    throw new Error(`F5 TTS API 错误: ${e instanceof Error ? e.message : e}`);
  }
};
const test_f5tts = async (endpoint: string): Promise<boolean> => {
  if (sessionStorage.getItem("f5_tts_test") === "ok") {
    return true;
  }
  try {
    const refText: string = await (await fetch("/tts/luoshaoye.txt")).text();
    const refAudio: Uint8Array = new Uint8Array(
      await (await fetch("/tts/luoshaoye.wav")).arrayBuffer()
    );
    const formData = new FormData();
    formData.append("ref_text", refText);
    formData.append("gen_text", "你好");
    formData.append("model", "f5-tts");
    formData.append("audio", new Blob([refAudio], { type: "audio/wav" }));
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
    if (res.status === 200) {
      sessionStorage.setItem("f5_tts_test", "ok");
      return true;
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  } catch (e) {
    throw new Error(
      `F5 TTS API 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

const speak_fish = async (
  text: string,
  endpoint: string
): Promise<{ audio: Uint8Array }> => {
  try {
    const t = text.replace(new RegExp(emoji, "g"), "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }
    const url = endpoint + "/v1/tts";
    const refText: string = await (await fetch("/tts/luoshaoye.txt")).text();
    const refAudio: string = toBase64(
      await (await fetch("/tts/luoshaoye.wav")).arrayBuffer()
    );
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        t,
        use_memory_cache: "on",
        references: [
          {
            audio: refAudio,
            text: refText,
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const audio = new Uint8Array(await res.arrayBuffer());
    return { audio };
  } catch (e) {
    throw new Error(
      `Fish Speech API 错误: ${e instanceof Error ? e.message : e}`
    );
  }
};
const test_fish = async (endpoint: string): Promise<boolean> => {
  if (sessionStorage.getItem("fish_speech_test") === "ok") {
    return true;
  }
  try {
    const url = endpoint + "/v1/tts";
    const refText: string = await (await fetch("/tts/luoshaoye.txt")).text();
    const refAudio: string = toBase64(
      await (await fetch("/tts/luoshaoye.wav")).arrayBuffer()
    );
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "你好",
        use_memory_cache: "on",
        references: [
          {
            audio: refAudio,
            text: refText,
          },
        ],
      }),
    });
    if (res.status === 200) {
      sessionStorage.setItem("fish_speech_test", "ok");
      return true;
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  } catch (e) {
    throw new Error(
      `Fish Speech API 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

export const speakApiList: SpeakApiList = [
  { name: "关闭", api: null },
  {
    name: "Web Speech API",
    api: ({ webSpeechConfig }) => ({
      api: (text: string) => speak_webspeech(text, webSpeechConfig),
      test: () => test_webspeech(),
    }),
  },
  {
    name: "F5 TTS API",
    api: ({ f5TtsEndpoint }) => ({
      api: (text: string) => speak_f5tts(text, f5TtsEndpoint),
      test: () => test_f5tts(f5TtsEndpoint),
    }),
  },
  {
    name: "Fish Speech API",
    api: ({ fishSpeechEndpoint }) => ({
      api: (text: string) => speak_fish(text, fishSpeechEndpoint),
      test: () => test_fish(fishSpeechEndpoint),
    }),
  },
];
