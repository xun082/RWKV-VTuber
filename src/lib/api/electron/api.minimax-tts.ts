/**
 * MiniMax TTS API - 在线语音合成服务
 */

/**
 * MiniMax TTS 语音合成
 * @param text 要合成的文本
 * @returns 音频数据（WAV 格式）
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


    const result = await electronAPI.invoke("minimax_tts_generate", {
      text: text,
      speed: 1.0,
      vol: 1.0,
    });

    if (!result || !result.audio) {
      throw new Error("语音合成失败：未返回音频数据");
    }


    return { audio: new Uint8Array(result.audio) };
  } catch (e) {
    console.error("[MiniMax-TTS] 合成失败:", e);
    throw new Error(`MiniMax TTS 错误: ${e instanceof Error ? e.message : e}`);
  }
};
