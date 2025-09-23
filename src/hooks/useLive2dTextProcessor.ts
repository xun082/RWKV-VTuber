import { useCallback } from "react";
import { useLive2dSpeechSync } from "./useLive2dSpeechSync.ts";

/**
 * Live2D文本处理Hook - 优化的逐字显示嘴型同步
 */
export const useLive2dTextProcessor = () => {
  const {
    speakText,
    quickSpeech,
    stopSpeech,
    setMouthShape,
    analyzeVowel,
    animateTransition,
    getVowelMapping,
  } = useLive2dSpeechSync();

  // 优化的逐字嘴型显示 - 支持平滑过渡和上下文感知
  const processCharacterDisplay = useCallback(
    (
      char: string,
      isComplete: boolean = false,
      options?: {
        previousChar?: string;
        nextChar?: string;
        emphasis?: number;
        smoothTransition?: boolean;
      }
    ) => {
      if (!char) return;

      const {
        previousChar,
        nextChar,
        emphasis = 1.0,
        smoothTransition = true,
      } = options || {};

      // 如果是完整文本显示结束，平滑过渡到静默
      if (isComplete) {
        const vowelMapping = getVowelMapping();
        if (smoothTransition && previousChar) {
          const prevVowel = analyzeVowel(previousChar);
          const currentParams = vowelMapping[prevVowel];
          animateTransition(currentParams, vowelMapping.silence, 200);
        } else {
          setTimeout(() => stopSpeech(), 100);
        }
        return;
      }

      // 使用增强的元音分析
      const vowel = analyzeVowel(char);
      const vowelMapping = getVowelMapping();
      let mouthParams = { ...vowelMapping[vowel] };

      // 应用强调效果
      if (emphasis !== 1.0) {
        Object.keys(mouthParams).forEach((key) => {
          mouthParams[key as keyof typeof mouthParams] *= emphasis;
        });
      }

      // 上下文感知调整
      if (previousChar || nextChar) {
        // 如果前后都是静音字符，减少当前字符的强度
        const prevVowel = previousChar ? analyzeVowel(previousChar) : "silence";
        const nextVowel = nextChar ? analyzeVowel(nextChar) : "silence";

        if (prevVowel === "silence" && nextVowel === "silence") {
          Object.keys(mouthParams).forEach((key) => {
            mouthParams[key as keyof typeof mouthParams] *= 0.7;
          });
        }

        // 连续相同元音时增强效果
        if (prevVowel === vowel || nextVowel === vowel) {
          mouthParams.mouth = Math.min(mouthParams.mouth * 1.1, 1.0);
        }
      }

      // 智能随机变化 - 基于字符类型
      let variationIntensity = 0.06;
      if (/[的了在是]/.test(char)) {
        variationIntensity = 0.03; // 常用字变化小
      } else if (/[！？。，]/.test(char)) {
        variationIntensity = 0.1; // 标点变化大
      }

      const variation = variationIntensity * (Math.random() - 0.5);
      mouthParams.mouth = Math.max(
        0,
        Math.min(1, mouthParams.mouth + variation)
      );

      // 设置嘴型（可选择是否使用平滑过渡）
      if (smoothTransition && previousChar) {
        const prevVowel = analyzeVowel(previousChar);
        const prevParams = vowelMapping[prevVowel];
        animateTransition(prevParams, mouthParams, 50);
      } else {
        setMouthShape(mouthParams);
      }
    },
    [
      setMouthShape,
      stopSpeech,
      analyzeVowel,
      animateTransition,
      getVowelMapping,
    ]
  );

  // 智能句子级别嘴型同步 - 自适应选择最佳方法
  const processSentenceSync = useCallback(
    (
      text: string,
      options?: {
        speed?: number;
        delay?: number;
        mode?: "auto" | "detailed" | "quick";
        intensity?: number;
      }
    ) => {
      const {
        speed = 80,
        delay = 0,
        mode = "auto",
        intensity = 0.8,
      } = options || {};

      setTimeout(() => {
        const textLength = text.trim().length;

        // 智能模式选择
        let selectedMode = mode;
        if (mode === "auto") {
          if (textLength > 50) {
            selectedMode = "detailed";
          } else if (textLength > 15) {
            selectedMode = "detailed";
          } else {
            selectedMode = "quick";
          }
        }

        // 执行对应的嘴型同步
        if (selectedMode === "detailed") {
          speakText(text, {
            speed: Math.max(speed, 60), // 确保不会太快
            emphasize: true,
            smoothTransition: true,
          });
        } else {
          quickSpeech(text, { intensity });
        }
      }, delay);
    },
    [speakText, quickSpeech]
  );

  // 批量字符处理 - 用于优化逐字显示性能
  const processBatchCharacters = useCallback(
    (
      characters: string[],
      currentIndex: number,
      options?: {
        batchSize?: number;
        smoothTransition?: boolean;
      }
    ) => {
      const { smoothTransition = true } = options || {};

      // 获取当前字符及其上下文
      const currentChar = characters[currentIndex];
      const previousChar =
        currentIndex > 0 ? characters[currentIndex - 1] : undefined;
      const nextChar =
        currentIndex < characters.length - 1
          ? characters[currentIndex + 1]
          : undefined;

      // 判断是否为强调字符
      const isEmphasis = /[！？。，!?]/.test(currentChar);
      const emphasis = isEmphasis ? 1.3 : 1.0;

      // 处理当前字符
      processCharacterDisplay(currentChar, false, {
        previousChar,
        nextChar,
        emphasis,
        smoothTransition,
      });
    },
    [processCharacterDisplay]
  );

  return {
    processCharacterDisplay,
    processSentenceSync,
    processBatchCharacters,
    stopSpeech,
    // 新增工具方法
    analyzeVowel,
    setMouthShape,
  };
};
