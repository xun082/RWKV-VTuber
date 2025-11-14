/**
 * MiniMax TTS 语音合成模块
 */

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
const MINIMAX_API_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLmt7HlnLPlhYPlp4vmmbrog73mnInpmZDlhazlj7giLCJVc2VyTmFtZSI6Iuexs-aLiSIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTY1NjQ5NDAxODI1MjAyNzU3IiwiUGhvbmUiOiIxNzgyMDQwNjc0OCIsIkdyb3VwSUQiOiIxOTY1NjQ5NDAxODIxMDA4NDUzIiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoiIiwiQ3JlYXRlVGltZSI6IjIwMjUtMTEtMTQgMDc6NTE6MjMiLCJUb2tlblR5cGUiOjEsImlzcyI6Im1pbmltYXgifQ.w8yfDA5hcr8aN6R5ddbFR6GZDuSCZ0H4PGg1uVGphumFPVcP08vFVXgzBnhmFH-muJWVy_keIPVk1h_VPATVM8N8qLveZmuclv2llRT5Sqj5CwxrXTQlk0_pJECG6k4pQRiC9SGAx2Pj1hkO-UkGxDisve_L1gnAL1WYlWGuWOFM3It53SJeh0FD-7eF2VFRa1nYgiM7IsEzkMxeme8qoxmBEmA0lEcb5tVhWFO3x2B3a0WfKqoULCROXcK7nKHctJJ85larCecUNbtT5aNVCMoEX_QGj24z2MS-rZV8eDnM896aG19GwVeLTUWs_IxZSD8LIXCP-iIz8iXYXuF3rA";

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
    // 构建请求体
    const requestBody = {
      model: "speech-2.6-hd",
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

    console.log("[MiniMax-TTS] 请求配置:", JSON.stringify(requestBody, null, 2));

    // 发送请求
    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MINIMAX_API_TOKEN}`,
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
    console.log("[MiniMax-TTS] API 响应:", result);

    // 检查响应
    if (!result.data?.audio) {
      console.error("[MiniMax-TTS] 响应中没有音频数据:", result);
      throw new Error("MiniMax API 未返回音频数据");
    }

    // 解码 HEX 编码的音频数据（MiniMax 返回的是 HEX，不是 Base64！）
    const audioHex: string = result.data.audio;
    console.log(`[MiniMax-TTS] HEX 音频长度: ${audioHex.length} 字符`);
    console.log(`[MiniMax-TTS] HEX 前50字符: ${audioHex.substring(0, 50)}`);
    
    // 使用 HEX 解码而不是 Base64
    const audioBuffer = Buffer.from(audioHex, "hex");
    const audioArray = Array.from(audioBuffer);
    
    // 打印音频数据的前16字节（WAV 头部）
    const header = audioArray.slice(0, Math.min(16, audioArray.length));
    console.log(`[MiniMax-TTS] 音频前16字节 (hex): ${header.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`[MiniMax-TTS] 音频前4字节 (ASCII): ${String.fromCharCode(...header.slice(0, 4))}`);

    const elapsed = Date.now() - startTime;
    console.log(
      `[MiniMax-TTS] ✅ 合成完成 (${(elapsed / 1000).toFixed(
        2
      )}s, ${audioArray.length} bytes, 格式: ${args.format || "wav"})`
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

