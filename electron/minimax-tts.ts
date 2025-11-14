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

    const requestBody = {
      model: "speech-2.6-turbo",
      text: args.text,
      stream: false,
      voice_setting: {
        voice_id: args.voiceId || "male-qn-qingse",
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
