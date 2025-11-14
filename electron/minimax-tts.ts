/**
 * MiniMax TTS 语音合成模块
 */

import { app } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

// MiniMax TTS 配置接口
export interface MiniMaxTTSGenerateArgs {
  text: string;
  voiceId?: string; // 音色ID，默认 "male-qn-qingse"
  speed?: number; // 语速，默认 1.0
  vol?: number; // 音量，默认 1.0
  pitch?: number; // 音调，默认 0
  emotion?: string; // 情感，默认 "happy"
  sampleRate?: number; // 采样率，默认 32000
  format?: string; // 格式，默认 "mp3"
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
 * 流式音频块回调接口
 */
export interface StreamAudioCallback {
  onChunk: (audioChunk: number[]) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * 初始化 MiniMax TTS
 */
export async function initMiniMaxTTS(): Promise<boolean> {
  console.log("[MiniMax-TTS] ✅ MiniMax TTS 模块初始化成功（在线服务）");
  return true;
}

/**
 * 生成语音
 */
export async function generateSpeechMiniMax(
  args: MiniMaxTTSGenerateArgs
): Promise<{ audio: number[] }> {
  const startTime = Date.now();

  console.log("[MiniMax-TTS] 开始生成语音...");
  console.log(`[MiniMax-TTS] 文本: ${args.text.substring(0, 50)}...`);
  console.log(`[MiniMax-TTS] 文本长度: ${args.text.length} 字符`);

  try {
    // 获取 API Key
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("未配置 MiniMax API Key，请在设置中配置");
    }

    // 构建请求体
    const requestBody = {
      model: "speech-2.6-turbo",
      text: args.text,
      stream: false,
      voice_setting: {
        voice_id: args.voiceId || "male-qn-qingse",
        speed: args.speed || 1.0,
        vol: args.vol || 1.0,
        pitch: args.pitch || 0,
        emotion: args.emotion || "happy",
      },
      audio_setting: {
        sample_rate: args.sampleRate || 32000,
        bitrate: 128000,
        format: args.format || "wav", // 使用 WAV 格式
        channel: 1,
      },
      subtitle_enable: false,
    };

    console.log(
      "[MiniMax-TTS] 请求配置:",
      JSON.stringify(requestBody, null, 2)
    );

    // 发送请求
    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MiniMax-TTS] API 请求失败:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `MiniMax API 错误 (${response.status}): ${response.statusText}\n${errorText}`
      );
    }

    const result: any = await response.json();
    console.log("[MiniMax-TTS] API 完整响应:", JSON.stringify(result, null, 2));

    // 检查响应是否有错误
    if (
      result.base_resp?.status_code !== 0 &&
      result.base_resp?.status_code !== undefined
    ) {
      console.error("[MiniMax-TTS] API 返回错误:", {
        status_code: result.base_resp?.status_code,
        status_msg: result.base_resp?.status_msg,
      });
      throw new Error(
        `MiniMax API 错误: ${
          result.base_resp?.status_msg || "未知错误"
        } (code: ${result.base_resp?.status_code})`
      );
    }

    // 检查响应中是否有音频数据（支持多种可能的响应格式）
    let audioHex: string | undefined;

    // 尝试多种可能的响应格式
    if (result.data?.audio) {
      audioHex = result.data.audio;
    } else if (result.audio) {
      audioHex = result.audio;
    } else if (result.extra_info?.audio_file) {
      audioHex = result.extra_info.audio_file;
    }

    if (!audioHex) {
      console.error("[MiniMax-TTS] 响应中没有音频数据，完整响应:", {
        hasData: !!result.data,
        hasAudio: !!result.audio,
        hasExtraInfo: !!result.extra_info,
        responseKeys: Object.keys(result),
        dataKeys: result.data ? Object.keys(result.data) : [],
      });
      throw new Error("MiniMax API 未返回音频数据");
    }

    // 解码 HEX 编码的音频数据（MiniMax 返回的是 HEX，不是 Base64！）
    console.log(`[MiniMax-TTS] HEX 音频长度: ${audioHex.length} 字符`);
    console.log(`[MiniMax-TTS] HEX 前50字符: ${audioHex.substring(0, 50)}`);

    // 使用 HEX 解码而不是 Base64
    const audioBuffer = Buffer.from(audioHex, "hex");
    const audioArray = Array.from(audioBuffer);

    // 打印音频数据的前16字节（WAV 头部）
    const header = audioArray.slice(0, Math.min(16, audioArray.length));
    console.log(
      `[MiniMax-TTS] 音频前16字节 (hex): ${header
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ")}`
    );
    console.log(
      `[MiniMax-TTS] 音频前4字节 (ASCII): ${String.fromCharCode(
        ...header.slice(0, 4)
      )}`
    );

    const elapsed = Date.now() - startTime;
    console.log(
      `[MiniMax-TTS] ✅ 合成完成 (${(elapsed / 1000).toFixed(2)}s, ${
        audioArray.length
      } bytes, 格式: ${args.format || "wav"})`
    );

    return { audio: audioArray };
  } catch (error: any) {
    console.error("[MiniMax-TTS] 生成语音失败:");
    console.error("  错误:", error);
    console.error("  错误消息:", error.message);
    console.error("  错误类型:", typeof error);
    console.error("  错误堆栈:", error.stack);
    console.error("  文本 (前50字符):", args.text.substring(0, 50) + "...");

    throw error;
  }
}

/**
 * 流式生成语音（边生成边播放，降低首字延迟）
 */
export async function generateSpeechMiniMaxStreaming(
  args: MiniMaxTTSGenerateArgs,
  callback: StreamAudioCallback
): Promise<void> {
  const startTime = Date.now();
  let firstChunkTime: number | null = null;

  console.log("[MiniMax-TTS-Stream] 🌊 开始流式生成语音...");
  console.log(`[MiniMax-TTS-Stream] 文本: ${args.text.substring(0, 50)}...`);
  console.log(`[MiniMax-TTS-Stream] 文本长度: ${args.text.length} 字符`);

  try {
    // 获取 API Key
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("未配置 MiniMax API Key，请在设置中配置");
    }

    // 构建请求体（stream: true）
    const requestBody = {
      model: "speech-2.6-hd",
      text: args.text,
      stream: true, // 启用流式传输
      voice_setting: {
        voice_id: args.voiceId || "male-qn-qingse",
        speed: args.speed || 1.0,
        vol: args.vol || 1.0,
        pitch: args.pitch || 0,
        emotion: args.emotion || "happy",
      },
      audio_setting: {
        sample_rate: args.sampleRate || 32000,
        bitrate: 128000,
        format: args.format || "wav", // 使用 WAV 格式
        channel: 1,
      },
      subtitle_enable: false,
    };

    console.log(
      "[MiniMax-TTS-Stream] 请求配置:",
      JSON.stringify(requestBody, null, 2)
    );

    // 发送请求
    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MiniMax-TTS-Stream] API 请求失败:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `MiniMax API 错误 (${response.status}): ${response.statusText}\n${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("响应体为空");
    }

    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("[MiniMax-TTS-Stream] ✅ 流式传输完成");
        break;
      }

      // 解码数据
      buffer += decoder.decode(value, { stream: true });

      // 处理缓冲区中的 JSON 对象（可能有多个）
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最后一个不完整的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk = JSON.parse(trimmed);

          // 检查是否有音频数据
          if (chunk.data?.audio) {
            chunkCount++;
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              const ttfb = (firstChunkTime - startTime) / 1000;
              console.log(
                `[MiniMax-TTS-Stream] ⚡ 首块到达 (TTFB: ${ttfb.toFixed(2)}s)`
              );
            }

            // 解码 HEX 音频数据
            const audioHex: string = chunk.data.audio;
            const audioBuffer = Buffer.from(audioHex, "hex");
            const audioArray = Array.from(audioBuffer);

            console.log(
              `[MiniMax-TTS-Stream] 📦 收到音频块 #${chunkCount} (${audioArray.length} bytes, status: ${chunk.data.status})`
            );

            // 立即发送音频块给回调
            callback.onChunk(audioArray);

            // status: 2 表示最后一块
            if (chunk.data.status === 2) {
              const elapsed = Date.now() - startTime;
              console.log(
                `[MiniMax-TTS-Stream] ✅ 全部完成 (${(elapsed / 1000).toFixed(
                  2
                )}s, 共 ${chunkCount} 块)`
              );
              callback.onComplete();
              return;
            }
          }
        } catch (parseError) {
          console.warn(
            "[MiniMax-TTS-Stream] JSON 解析失败:",
            parseError,
            "原始数据:",
            trimmed
          );
        }
      }
    }

    // 处理剩余的缓冲区
    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer);
        if (chunk.data?.audio) {
          const audioHex: string = chunk.data.audio;
          const audioBuffer = Buffer.from(audioHex, "hex");
          const audioArray = Array.from(audioBuffer);
          callback.onChunk(audioArray);
        }
      } catch (parseError) {
        console.warn(
          "[MiniMax-TTS-Stream] 最后一块 JSON 解析失败:",
          parseError
        );
      }
    }

    callback.onComplete();
  } catch (error: any) {
    console.error("[MiniMax-TTS-Stream] 流式生成失败:");
    console.error("  错误:", error);
    console.error("  错误消息:", error.message);
    console.error("  错误类型:", typeof error);
    console.error("  错误堆栈:", error.stack);

    callback.onError(error);
    throw error;
  }
}
