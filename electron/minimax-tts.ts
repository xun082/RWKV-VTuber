/**
 * MiniMax TTS 语音合成模块
 */

import { app } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

// MiniMax TTS 配置接口
export interface MiniMaxTTSGenerateArgs {
  text: string;
  voiceId?: string;
  speed?: number;
  vol?: number;
}

/**
 * 检测文本主要语言
 * @param text 要检测的文本
 * @returns 'en' | 'zh'
 */
function detectLanguage(text: string): "en" | "zh" {
  // 移除空格和标点符号
  const cleanText = text.replace(/[\s\p{P}]/gu, "");

  // 统计中文字符数量
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // 统计英文字符数量
  const englishChars = cleanText.match(/[a-zA-Z]/g);
  const englishCount = englishChars ? englishChars.length : 0;

  // 如果英文字符占比超过 50%，判定为英文
  const totalChars = chineseCount + englishCount;
  if (totalChars === 0) return "zh"; // 默认中文

  const englishRatio = englishCount / totalChars;


  return englishRatio > 0.5 ? "en" : "zh";
}

/**
 * 根据语言选择合适的音色
 * @param language 语言类型
 * @returns 音色ID
 */
function getVoiceIdByLanguage(language: "en" | "zh"): string {
  if (language === "en") {
    return "English_radiant_girl"; // 英文音色
  }
  return "male-qn-qingse"; // 中文音色（默认）
}

// MiniMax API 配置
const MINIMAX_API_URL = "https://api.minimaxi.com/v1/t2a_v2";

// 配置文件路径
const CONFIG_FILE_PATH = path.join(
  app.getPath("userData"),
  "minimax-config.json"
);

// 从配置文件读取 API Key
function getApiKey(): string {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const config = JSON.parse(configData);
      return config.apiKey || "";
    }
  } catch (error) {
    console.error("[MiniMax-TTS] 读取配置文件失败:", error);
  }
  return "";
}

/**
 * 初始化 MiniMax TTS
 */
export async function initMiniMaxTTS(): Promise<boolean> {
  return true;
}

/**
 * 生成语音
 */
export async function generateSpeechMiniMax(
  args: MiniMaxTTSGenerateArgs
): Promise<{ audio: number[] }> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("未配置 MiniMax API Key，请在设置中配置");
    }

    // 如果没有指定音色，自动检测语言并选择音色
    let voiceId = args.voiceId;
    if (!voiceId) {
      const language = detectLanguage(args.text);
      voiceId = getVoiceIdByLanguage(language);
    }

    const requestBody = {
      model: "speech-2.6-turbo",
      text: args.text,
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: args.speed || 1.0,
        vol: args.vol || 1.0,
        pitch: 0,
        emotion: "happy",
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "wav",
        channel: 1,
      },
      subtitle_enable: false,
    };

    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`MiniMax API 错误 (${response.status})`);
    }

    const result: any = await response.json();

    if (
      result.base_resp?.status_code !== 0 &&
      result.base_resp?.status_code !== undefined
    ) {
      throw new Error(
        `MiniMax API 错误: ${result.base_resp?.status_msg || "未知错误"}`
      );
    }

    // 获取音频数据
    const audioHex =
      result.data?.audio || result.audio || result.extra_info?.audio_file;

    if (!audioHex) {
      throw new Error("MiniMax API 未返回音频数据");
    }

    // 解码 HEX 音频数据
    const audioBuffer = Buffer.from(audioHex, "hex");
    return { audio: Array.from(audioBuffer) };
  } catch (error: any) {
    console.error("[MiniMax-TTS] 生成语音失败:", error.message);
    throw error;
  }
}
