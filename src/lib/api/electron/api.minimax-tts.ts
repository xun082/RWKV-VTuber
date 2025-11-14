/**
 * MiniMax TTS API - 在线语音合成服务
 */

// MiniMax TTS 生成参数
export interface MiniMaxTTSArgs {
  text: string;
  voiceId?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: string;
  sampleRate?: number;
  format?: string;
}

/**
 * MiniMax TTS 语音合成
 * @param text 要合成的文本
 * @returns 音频数据（MP3 格式）
 */
export const speak_minimax_tts = async (
  text: string
): Promise<{ audio: Uint8Array }> => {
  try {
    if (text.trim().length === 0) {
      throw new Error("文本为空");
    }

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error("Electron API 不可用");
    }

    console.log("🎙️ [MiniMax-TTS] 开始合成语音...");
    console.log(
      `📝 [MiniMax-TTS] 文本: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
    );

    const result = await electronAPI.invoke("minimax_tts_generate", {
      text: text,
      voiceId: "male-qn-qingse", // 可以后续从配置中读取
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
      emotion: "happy",
      sampleRate: 32000,
      format: "wav", // 使用 WAV 格式
    });

    if (!result || !result.audio) {
      throw new Error("语音合成失败：未返回音频数据");
    }

    console.log(
      `✅ [MiniMax-TTS] 合成成功，音频大小: ${result.audio.length} bytes (WAV)`
    );

    return { audio: new Uint8Array(result.audio) };
  } catch (e) {
    console.error("❌ [MiniMax-TTS] 合成失败:", e);
    throw new Error(
      `MiniMax TTS 错误: ${e instanceof Error ? e.message : e}`
    );
  }
};

/**
 * 测试 MiniMax TTS 连接
 */
export const test_minimax_tts = async (): Promise<boolean> => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      return false;
    }

    // 测试语音合成
    const testText = "这是一个测试。";
    await speak_minimax_tts(testText);
    return true;
  } catch (e) {
    throw new Error(
      `MiniMax TTS 测试失败: ${e instanceof Error ? e.message : e}`
    );
  }
};

