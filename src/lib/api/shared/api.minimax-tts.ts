import emojiRegex from "emoji-regex";
import { get } from "./api.store";

const emoji = emojiRegex();

export interface MinimaxTTSConfig {
  enabled: boolean;
  apiKey: string;
  voiceId: string;
  groupId: string;
  model: string;
  speed: number;
  volume: number;
  pitch: number;
  audioFormat: string;
  sampleRate: number;
}

export const DEFAULT_MINIMAX_CONFIG: MinimaxTTSConfig = {
  enabled: true, // 默认启用TTS服务
  apiKey: "",
  voiceId: "female-tianmei",
  groupId: "",
  model: "speech-2.5-turbo-preview",
  speed: 1.0,
  volume: 1.0,
  pitch: 0,
  audioFormat: "wav",
  sampleRate: 32000,
};

export const MINIMAX_VOICE_OPTIONS = [
  { value: "male-qn-qingse", label: "青涩青年音色" },
  { value: "male-qn-jingying", label: "精英青年音色" },
  { value: "male-qn-badao", label: "霸道青年音色" },
  { value: "male-qn-daxuesheng", label: "青年大学生音色" },
  { value: "female-shaonv", label: "少女音色" },
  { value: "female-yujie", label: "御姐音色" },
  { value: "female-chengshu", label: "成熟女性音色" },
  { value: "female-tianmei", label: "甜美女性音色" },
  { value: "presenter_male", label: "男性主持人" },
  { value: "presenter_female", label: "女性主持人" },
  { value: "audiobook_male_1", label: "男性有声书1" },
  { value: "audiobook_male_2", label: "男性有声书2" },
  { value: "audiobook_female_1", label: "女性有声书1" },
  { value: "audiobook_female_2", label: "女性有声书2" },
  { value: "male-qn-qingse-jingpin", label: "青涩青年音色-beta" },
  { value: "male-qn-jingying-jingpin", label: "精英青年音色-beta" },
  { value: "male-qn-badao-jingpin", label: "霸道青年音色-beta" },
  { value: "male-qn-daxuesheng-jingpin", label: "青年大学生音色-beta" },
  { value: "female-shaonv-jingpin", label: "少女音色-beta" },
  { value: "female-yujie-jingpin", label: "御姐音色-beta" },
  { value: "female-chengshu-jingpin", label: "成熟女性音色-beta" },
  { value: "female-tianmei-jingpin", label: "甜美女性音色-beta" },
  { value: "clever_boy", label: "聪明男童" },
  { value: "cute_boy", label: "可爱男童" },
  { value: "lovely_girl", label: "萌萌女童" },
  { value: "cartoon_pig", label: "卡通猪小琪" },
  { value: "bingjiao_didi", label: "病娇弟弟" },
  { value: "junlang_nanyou", label: "俊朗男友" },
  { value: "chunzhen_xuedi", label: "纯真学弟" },
  { value: "lengdan_xiongzhang", label: "冷淡学长" },
  { value: "badao_shaoye", label: "霸道少爷" },
  { value: "tianxin_xiaoling", label: "甜心小玲" },
  { value: "qiaopi_mengmei", label: "俏皮萌妹" },
  { value: "wumei_yujie", label: "妩媚御姐" },
  { value: "diadia_xuemei", label: "嗲嗲学妹" },
  { value: "danya_xuejie", label: "淡雅学姐" },
  { value: "Santa_Claus", label: "Santa Claus" },
  { value: "Grinch", label: "Grinch" },
  { value: "Rudolph", label: "Rudolph" },
  { value: "Arnold", label: "Arnold" },
  { value: "Charming_Santa", label: "Charming Santa" },
  { value: "Charming_Lady", label: "Charming Lady" },
  { value: "Sweet_Girl", label: "Sweet Girl" },
  { value: "Cute_Elf", label: "Cute Elf" },
  { value: "Attractive_Girl", label: "Attractive Girl" },
  { value: "Serene_Woman", label: "Serene Woman" },
];

export const MINIMAX_MODEL_OPTIONS = [
  { value: "speech-2.5-hd-preview", label: "speech-2.5-hd-preview" },
  { value: "speech-2.5-turbo-preview", label: "speech-2.5-turbo-preview" },
  { value: "speech-02-hd", label: "speech-02-hd" },
  { value: "speech-02-turbo", label: "speech-02-turbo" },
  { value: "speech-01-hd", label: "speech-01-hd" },
  { value: "speech-01-turbo", label: "speech-01-turbo" },
  { value: "speech-01-240228", label: "speech-01-240228" },
  { value: "speech-01-turbo-240228", label: "speech-01-turbo-240228" },
];

export const validateMinimaxConfig = (config: MinimaxTTSConfig): string[] => {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors;
  }

  if (!config.apiKey?.trim()) {
    errors.push("请前往配置页面设置 MiniMax API Key");
  }

  if (!config.groupId?.trim()) {
    errors.push("请前往配置页面设置 Group ID");
  }

  if (!config.voiceId?.trim()) {
    errors.push("声音类型不能为空");
  }

  if (!config.model?.trim()) {
    errors.push("模型不能为空");
  }

  return errors;
};

// 流式语音合成
const speak_minimax_stream = async (
  text: string,
  onAudioChunk: (chunk: Uint8Array) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const t = text.replace(new RegExp(emoji, "g"), "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }

    const config = (await get("minimax_tts_config")) as MinimaxTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("MiniMax TTS 服务未启用");
    }

    const errors = validateMinimaxConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 限制文本长度
    if (t.length > 10000) {
      throw new Error("文本长度不能超过10000字符");
    }

    const requestBody = {
      model: config.model,
      text: t,
      stream: true, // 启用流式
      voice_setting: {
        voice_id: config.voiceId,
        speed: config.speed,
        vol: config.volume,
        pitch: config.pitch,
      },
      audio_setting: {
        sample_rate: config.sampleRate,
        bitrate: 128000,
        format: config.audioFormat,
      },
    };

    const response = await fetch(
      import.meta.env.DEV
        ? "/api/minimax/v1/t2a_v2"
        : "https://api.minimaxi.com/v1/t2a_v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          GroupId: config.groupId,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `MiniMax API 错误 ${response.status}: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    if (!response.body) {
      throw new Error("响应体为空");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.data?.audio) {
                // 解码base64音频数据
                const audioBase64 = parsed.data.audio;
                const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
                  c.charCodeAt(0)
                );
                onAudioChunk(audioBuffer);
              }
            } catch (parseError) {
              console.warn("解析流式数据失败:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (e) {
    onError(
      new Error(`MiniMax TTS 流式错误: ${e instanceof Error ? e.message : e}`)
    );
  }
};

// 非流式语音合成（保持兼容性）
const speak_minimax = async (text: string): Promise<{ audio: Uint8Array }> => {
  try {
    const t = text.replace(new RegExp(emoji, "g"), "");
    if (t.length === 0) {
      throw new Error("文本为空");
    }

    const config = (await get("minimax_tts_config")) as MinimaxTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("MiniMax TTS 服务未启用");
    }

    const errors = validateMinimaxConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 限制文本长度
    if (t.length > 10000) {
      throw new Error("文本长度不能超过10000字符");
    }

    const requestBody = {
      model: config.model,
      text: t,
      stream: false,
      voice_setting: {
        voice_id: config.voiceId,
        speed: config.speed,
        vol: config.volume,
        pitch: config.pitch,
        emotion: "calm",
      },
      audio_setting: {
        sample_rate: config.sampleRate,
        format: "wav",
        channel: 1,
      },
      subtitle_enable: false,
    };

    const response = await fetch(
      import.meta.env.DEV
        ? "/api/minimax/v1/t2a_v2"
        : "https://api.minimaxi.com/v1/t2a_v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          GroupId: config.groupId,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `MiniMax API 错误 ${response.status}: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();

    if (data.base_resp?.status_code !== 0) {
      throw new Error(
        `MiniMax API 错误：${data.base_resp?.status_code} - ${
          data.base_resp?.status_msg || "未知错误"
        }`
      );
    }

    const audioHex = data.data?.audio;
    if (!audioHex) {
      throw new Error("响应中没有音频数据");
    }

    // 从hex格式解码音频数据
    const audioBuffer = new Uint8Array(audioHex.length / 2);
    for (let i = 0; i < audioHex.length; i += 2) {
      audioBuffer[i / 2] = parseInt(audioHex.substr(i, 2), 16);
    }

    return { audio: audioBuffer };
  } catch (e) {
    throw new Error(`MiniMax TTS 错误: ${e instanceof Error ? e.message : e}`);
  }
};

const test_minimax = async (): Promise<boolean> => {
  try {
    const config = (await get("minimax_tts_config")) as MinimaxTTSConfig;
    if (!config || !config.enabled) {
      throw new Error("MiniMax TTS 服务未启用");
    }

    const errors = validateMinimaxConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置错误: ${errors[0]}`);
    }

    // 测试连接
    const testText = "这是一个测试。";
    await speak_minimax(testText);
    return true;
  } catch (e) {
    throw new Error(
      `MiniMax TTS 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

export { speak_minimax, speak_minimax_stream, test_minimax };
