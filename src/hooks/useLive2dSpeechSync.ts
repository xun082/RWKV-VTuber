import { useCallback, useRef } from "react";
import { useLive2dApi } from "../stores/useLive2dApi.ts";

/**
 * Live2D 嘴型同步Hook - 基于文字内容模拟嘴型动作
 */
export const useLive2dSpeechSync = () => {
  const { live2d } = useLive2dApi();
  const animationFrameRef = useRef<number | undefined>(undefined);
  const isPlayingRef = useRef(false);

  // 中文元音映射 - 优化参数平衡度，更自然的嘴型
  const vowelMapping = {
    a: { mouth: 0.85, a: 0.9, i: 0.1, u: 0.0, e: 0.2, o: 0.1 },
    i: { mouth: 0.65, a: 0.1, i: 0.9, u: 0.0, e: 0.3, o: 0.0 },
    u: { mouth: 0.45, a: 0.0, i: 0.0, u: 0.95, e: 0.1, o: 0.3 },
    e: { mouth: 0.75, a: 0.2, i: 0.3, u: 0.0, e: 0.9, o: 0.1 },
    o: { mouth: 0.9, a: 0.1, i: 0.0, u: 0.3, e: 0.1, o: 0.95 },
    silence: { mouth: 0.0, a: 0.0, i: 0.0, u: 0.0, e: 0.0, o: 0.0 },
  };

  // 增强的中文字符元音分析
  const analyzeChineseVowel = useCallback(
    (char: string): keyof typeof vowelMapping => {
      // 空白字符和标点符号处理
      if (/[\s\n.,!?;:，。！？；：]/.test(char)) {
        return "silence";
      }

      const code = char.charCodeAt(0);

      // 中文字符处理 (Unicode范围)
      if (code >= 0x4e00 && code <= 0x9fff) {
        // 扩展的中文字符元音模式匹配
        const patterns = {
          a: /[啊阿爱安按暗案八大发马拿他打达拉撒挂花夸瓜刮]/,
          e: /[额饿恶鹅而儿的得很客色河热节则]/,
          i: /[一以意义因银音比地你米力气西机器鸡]/,
          o: /[哦噢欧偶我多做国过活说破火左右手走口]/,
          u: /[乌五物务屋无不出书住路数粗突出主注]/,
        };

        for (const [vowel, pattern] of Object.entries(patterns)) {
          if (pattern.test(char)) {
            return vowel as keyof typeof vowelMapping;
          }
        }

        // 根据字符特征进行更智能的判断
        const unicode = char.charCodeAt(0);
        // 基于Unicode分布的统计判断
        if (unicode % 5 === 0) return "a";
        if (unicode % 5 === 1) return "i";
        if (unicode % 5 === 2) return "u";
        if (unicode % 5 === 3) return "e";
        return "o";
      }

      // 英文字符处理
      const lowerChar = char.toLowerCase();
      if (["a", "e", "i", "o", "u"].includes(lowerChar)) {
        return lowerChar as keyof typeof vowelMapping;
      }

      // 数字和其他字符
      if (/[0-9]/.test(char)) {
        const num = parseInt(char);
        const vowels: (keyof typeof vowelMapping)[] = ["a", "i", "u", "e", "o"];
        return vowels[num % 5];
      }

      return "silence";
    },
    []
  );

  // 设置Live2D嘴型参数
  const setMouthShape = useCallback(
    (params: (typeof vowelMapping)[keyof typeof vowelMapping]) => {
      if (!live2d?.setParam) return;

      try {
        // 设置嘴型参数
        live2d.setParam("ParamMouthOpenY", params.mouth);
        live2d.setParam("ParamA", params.a);
        live2d.setParam("ParamI", params.i);
        live2d.setParam("ParamU", params.u);
        live2d.setParam("ParamE", params.e);
        live2d.setParam("ParamO", params.o);
      } catch (error) {
        console.warn("Failed to set mouth parameters:", error);
      }
    },
    [live2d]
  );

  // 停止当前嘴型动画
  const stopSpeech = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    isPlayingRef.current = false;

    // 重置嘴型到静默状态
    setTimeout(() => {
      setMouthShape(vowelMapping.silence);
    }, 100);
  }, [setMouthShape]);

  // 优化的文字嘴型同步 - 支持平滑过渡和自适应速度
  const speakText = useCallback(
    async (
      text: string,
      options?: {
        speed?: number; // 说话速度，默认80ms每字符
        emphasize?: boolean; // 是否强调重点字符
        smoothTransition?: boolean; // 是否使用平滑过渡
      }
    ) => {
      if (!live2d || !text.trim()) return;

      const {
        speed = 80,
        emphasize = true,
        smoothTransition = true,
      } = options || {};

      // 停止之前的动画
      stopSpeech();
      isPlayingRef.current = true;

      // 优化文本清理，保留更多字符
      const cleanText = text
        .replace(/[^\u4e00-\u9fff\w\s\d.,!?，。！？]/g, "")
        .trim();
      if (!cleanText) return;

      const characters = cleanText.split("");
      let currentIndex = 0;
      let previousParams = vowelMapping.silence;

      const animate = () => {
        if (!isPlayingRef.current || currentIndex >= characters.length) {
          // 动画结束，平滑过渡到静默状态
          if (smoothTransition) {
            const targetParams = vowelMapping.silence;
            animateTransition(previousParams, targetParams, 300);
          } else {
            setTimeout(() => setMouthShape(vowelMapping.silence), 200);
          }
          return;
        }

        const char = characters[currentIndex];
        const vowel = analyzeChineseVowel(char);
        let mouthParams = { ...vowelMapping[vowel] };

        // 强调处理
        if (emphasize) {
          const isEmphasis = /[！!？?。.，,]/.test(char);
          if (isEmphasis) {
            mouthParams.mouth = Math.min(mouthParams.mouth * 1.2, 1.0);
            // 增强所有元音参数
            Object.keys(mouthParams).forEach((key) => {
              if (key !== "mouth") {
                mouthParams[key as keyof typeof mouthParams] *= 1.1;
              }
            });
          }
        }

        // 自然随机变化
        const variation = 0.08 * (Math.random() - 0.5);
        mouthParams.mouth = Math.max(
          0,
          Math.min(1, mouthParams.mouth + variation)
        );

        // 平滑过渡或直接设置
        if (smoothTransition && currentIndex > 0) {
          animateTransition(
            previousParams,
            mouthParams,
            Math.min(speed * 0.8, 60)
          );
        } else {
          setMouthShape(mouthParams);
        }

        previousParams = mouthParams;
        currentIndex++;

        // 智能速度调整
        let charSpeed = speed;
        if (/[\s\n]/.test(char)) {
          charSpeed = speed * 0.4; // 空格更快
        } else if (/[。！？.,!?，]/.test(char)) {
          charSpeed = speed * 1.8; // 标点停顿
        } else if (/[的了在是]/.test(char)) {
          charSpeed = speed * 0.7; // 常用字更快
        }

        // 继续下一个字符
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(animate) as number;
        }, charSpeed);
      };

      // 开始动画
      animationFrameRef.current = requestAnimationFrame(animate) as number;
    },
    [live2d, analyzeChineseVowel, setMouthShape, stopSpeech]
  );

  // 平滑过渡动画
  const animateTransition = useCallback(
    (
      from: (typeof vowelMapping)[keyof typeof vowelMapping],
      to: (typeof vowelMapping)[keyof typeof vowelMapping],
      duration: number
    ) => {
      const startTime = performance.now();
      const keys = Object.keys(from) as (keyof typeof from)[];

      const transition = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);

        const interpolated = {} as typeof from;
        keys.forEach((key) => {
          interpolated[key] = from[key] + (to[key] - from[key]) * eased;
        });

        setMouthShape(interpolated);

        if (progress < 1) {
          requestAnimationFrame(transition);
        }
      };

      requestAnimationFrame(transition);
    },
    [setMouthShape]
  );

  // 优化的快速嘴型同步 - 基于文本内容的智能变化
  const quickSpeech = useCallback(
    (text: string, options?: { intensity?: number }) => {
      if (!live2d || !text.trim()) return;

      const { intensity = 0.8 } = options || {};

      // 分析文本内容，生成更真实的嘴型序列
      const chars = text.split("").filter((c) => c.trim());
      const vowelSequence = chars.map((char) => analyzeChineseVowel(char));

      // 智能计算持续时间和间隔
      const baseDuration = Math.max(text.length * 60, 400);
      const intervals = Math.min(Math.max(vowelSequence.length, 3), 8);
      const intervalDuration = baseDuration / intervals;

      let count = 0;
      const interval = setInterval(() => {
        if (count >= intervals) {
          clearInterval(interval);
          // 平滑结束
          animateTransition(
            vowelMapping[vowelSequence[vowelSequence.length - 1]] ||
              vowelMapping.a,
            vowelMapping.silence,
            200
          );
          return;
        }

        // 使用实际的元音序列，如果不够就循环
        const vowelIndex = count % vowelSequence.length;
        const vowel = vowelSequence[vowelIndex];
        let params = { ...vowelMapping[vowel] };

        // 根据进度调整强度，使用更自然的曲线
        const progress = count / (intervals - 1);
        const naturalIntensity =
          intensity * (0.6 + 0.4 * Math.sin(progress * Math.PI));

        // 应用强度到所有参数
        Object.keys(params).forEach((key) => {
          params[key as keyof typeof params] *= naturalIntensity;
        });

        // 添加微小变化
        const variation = 0.05 * (Math.random() - 0.5);
        params.mouth = Math.max(0, Math.min(1, params.mouth + variation));

        setMouthShape(params);
        count++;
      }, intervalDuration);

      // 清理函数
      return () => clearInterval(interval);
    },
    [live2d, setMouthShape, analyzeChineseVowel, animateTransition]
  );

  return {
    speakText,
    quickSpeech,
    stopSpeech,
    setMouthShape,
    animateTransition,
    isPlaying: () => isPlayingRef.current,
    // 新增工具方法
    analyzeVowel: analyzeChineseVowel,
    getVowelMapping: () => vowelMapping,
  };
};
