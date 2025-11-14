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
 * 检测文本主要语言
 * @param text 要检测的文本
 * @returns 'en' | 'zh'
 */
function detectLanguage(text: string): 'en' | 'zh' {
  // 移除空格和标点符号
  const cleanText = text.replace(/[\s\p{P}]/gu, '');
  
  // 统计中文字符数量
  const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;
  
  // 统计英文字符数量
  const englishChars = cleanText.match(/[a-zA-Z]/g);
  const englishCount = englishChars ? englishChars.length : 0;
  
  // 如果英文字符占比超过 50%，判定为英文（降低阈值以更准确检测英文）
  const totalChars = chineseCount + englishCount;
  if (totalChars === 0) return 'zh'; // 默认中文
  
  const englishRatio = englishCount / totalChars;
  
  console.log(`[语言检测] 中文字符: ${chineseCount}, 英文字符: ${englishCount}, 英文占比: ${(englishRatio * 100).toFixed(1)}%`);
  
  return englishRatio > 0.5 ? 'en' : 'zh';
}

/**
 * 根据语言选择合适的音色
 * @param language 语言类型
 * @returns 音色ID
 */
function getVoiceIdByLanguage(language: 'en' | 'zh'): string {
  if (language === 'en') {
    return 'English_radiant_girl'; // 英文音色
  }
  return 'male-qn-qingse'; // 中文音色（默认）
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

    // 检测语言并选择音色
    const language = detectLanguage(text);
    const voiceId = getVoiceIdByLanguage(language);
    
    console.log("[MiniMax-TTS] 开始合成语音...");
    console.log(
      `[MiniMax-TTS] 文本: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
    );
    console.log(`[MiniMax-TTS] 检测语言: ${language}, 使用音色: ${voiceId}`);

    const result = await electronAPI.invoke("minimax_tts_generate", {
      text: text,
      voiceId: voiceId, // 根据语言自动选择音色
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
      `[MiniMax-TTS] 合成成功，音频大小: ${result.audio.length} bytes (WAV)`
    );

    return { audio: new Uint8Array(result.audio) };
  } catch (e) {
    console.error("[MiniMax-TTS] 合成失败:", e);
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

