import { useCallback, useEffect, useRef } from "react";
import { useLive2dApi } from "../stores/useLive2dApi.ts";
import { useStates } from "../stores/useStates.ts";

// ============ 类型定义 ============
type MouthParams = {
  mouth: number;
  a: number;
  i: number;
  u: number;
  e: number;
  o: number;
};

type VowelType = "a" | "i" | "u" | "e" | "o" | "silence";

type SpeechOptions = {
  speed?: number;
  emphasize?: boolean;
  smoothTransition?: boolean;
};

type QuickSpeechOptions = {
  intensity?: number;
};

// ============ 常量配置 ============
const TIMING = {
  DEFAULT_SPEED: 80,
  MIN_TRANSITION_DURATION: 60,
  RESET_DELAY: 100,
  SMOOTH_END_DURATION: 300,
  QUICK_MIN_DURATION: 400,
  QUICK_BASE_INTERVAL: 60,
  QUICK_END_DURATION: 200,
} as const;

const SPEED_MULTIPLIER = {
  WHITESPACE: 0.4,
  PUNCTUATION: 1.8,
  COMMON_CHAR: 0.7,
  SMOOTH_TRANSITION: 0.8,
} as const;

const VARIATION = {
  NATURAL: 0.08,
  QUICK: 0.05,
  EMPHASIS_MOUTH: 1.2,
  EMPHASIS_VOWEL: 1.1,
} as const;

const REGEX = {
  SILENCE: /[\s\n.,!?;:，。！？；：]/,
  EMPHASIS: /[！!？?。.，,]/,
  PUNCTUATION: /[。！？.,!?，]/,
  COMMON_CHARS: /[的了在是]/,
  WHITESPACE: /[\s\n]/,
  DIGIT: /[0-9]/,
  CHINESE_RANGE: { min: 0x4e00, max: 0x9fff },
} as const;

// ============ 元音映射配置 ============
const VOWEL_MAPPING: Record<VowelType, MouthParams> = {
  a: { mouth: 0.85, a: 0.9, i: 0.1, u: 0.0, e: 0.2, o: 0.1 },
  i: { mouth: 0.65, a: 0.1, i: 0.9, u: 0.0, e: 0.3, o: 0.0 },
  u: { mouth: 0.45, a: 0.0, i: 0.0, u: 0.95, e: 0.1, o: 0.3 },
  e: { mouth: 0.75, a: 0.2, i: 0.3, u: 0.0, e: 0.9, o: 0.1 },
  o: { mouth: 0.9, a: 0.1, i: 0.0, u: 0.3, e: 0.1, o: 0.95 },
  silence: { mouth: 0.0, a: 0.0, i: 0.0, u: 0.0, e: 0.0, o: 0.0 },
} as const;

// 中文字符元音特征库（使用字符串代替正则以提升性能）
const CHINESE_VOWEL_CHARS = {
  a: "啊阿爱安按暗案八大发马拿他打达拉撒挂花夸瓜刮",
  e: "额饿恶鹅而儿的得很客色河热节则",
  i: "一以意义因银音比地你米力气西机器鸡",
  o: "哦噢欧偶我多做国过活说破火左右手走口",
  u: "乌五物务屋无不出书住路数粗突出主注",
} as const;

const ENGLISH_VOWELS = ["a", "e", "i", "o", "u"] as const;
const VOWEL_SEQUENCE: VowelType[] = ["a", "i", "u", "e", "o"];

// ============ 工具函数 ============
const clamp = (value: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, value));

const isChinese = (code: number): boolean =>
  code >= REGEX.CHINESE_RANGE.min && code <= REGEX.CHINESE_RANGE.max;

const easeOutCubic = (progress: number): number =>
  1 - Math.pow(1 - progress, 3);

// ============ 核心Hook ============
/**
 * Live2D 嘴型同步Hook - 基于文字内容模拟嘴型动作
 */
export const useLive2dSpeechSync = () => {
  const live2dRef = useRef(useLive2dApi.getState().live2d);
  const ttsPlaybackState = useStates((state) => state.ttsPlaybackState);

  useEffect(() => {
    live2dRef.current = useLive2dApi.getState().live2d;
    const unsub = useLive2dApi.subscribe((state) => {
      live2dRef.current = state.live2d;
    });
    return unsub;
  }, []);
  
  const animationFrameRef = useRef<number | undefined>(undefined);
  const isPlayingRef = useRef(false);
  
  // 监听 TTS 播放状态，暂停/停止时也停止嘴型动画
  useEffect(() => {
    if (ttsPlaybackState === 'paused' || ttsPlaybackState === 'idle') {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
        // 平滑过渡到静默状态
        const live2d = live2dRef.current;
        if (live2d) {
          live2d.setParam("mouth", 0);
          live2d.setParam("a", 0);
          live2d.setParam("i", 0);
          live2d.setParam("u", 0);
          live2d.setParam("e", 0);
          live2d.setParam("o", 0);
        }
      }
    }
  }, [ttsPlaybackState]);

  // 分析字符对应的元音类型
  const analyzeVowel = useCallback((char: string): VowelType => {
    // 1. 空白字符和标点符号
    if (REGEX.SILENCE.test(char)) {
      return "silence";
    }

    const code = char.charCodeAt(0);

    // 2. 中文字符处理
    if (isChinese(code)) {
      // 优先使用字符匹配（更准确）
      for (const [vowel, chars] of Object.entries(CHINESE_VOWEL_CHARS)) {
        if (chars.includes(char)) {
          return vowel as VowelType;
        }
      }

      // 回退方案：基于Unicode哈希分布
      return VOWEL_SEQUENCE[code % 5];
    }

    // 3. 英文元音字母
    const lowerChar = char.toLowerCase();
    if (ENGLISH_VOWELS.includes(lowerChar as any)) {
      return lowerChar as VowelType;
    }

    // 4. 数字字符
    if (REGEX.DIGIT.test(char)) {
      const num = Number.parseInt(char, 10);
      return VOWEL_SEQUENCE[num % 5];
    }

    // 5. 其他字符默认为静默
    return "silence";
  }, []);

  // 设置Live2D嘴型参数
  const setMouthShape = useCallback((params: MouthParams) => {
    const live2d = live2dRef.current;
    if (!live2d?.setParam) return;

    try {
      live2d.setParam("ParamMouthOpenY", params.mouth);
      live2d.setParam("ParamA", params.a);
      live2d.setParam("ParamI", params.i);
      live2d.setParam("ParamU", params.u);
      live2d.setParam("ParamE", params.e);
      live2d.setParam("ParamO", params.o);
    } catch (error) {
      console.warn("Failed to set mouth parameters:", error);
    }
  }, []);

  // 停止当前嘴型动画
  const stopSpeech = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    isPlayingRef.current = false;

    // 重置嘴型到静默状态
    setTimeout(() => {
      setMouthShape(VOWEL_MAPPING.silence);
    }, TIMING.RESET_DELAY);
  }, [setMouthShape]);

  // 平滑过渡动画
  const animateTransition = useCallback(
    (from: MouthParams, to: MouthParams, duration: number) => {
      const startTime = performance.now();
      const keys = Object.keys(from) as (keyof MouthParams)[];

      const transition = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const interpolated = {} as MouthParams;
        for (const key of keys) {
          interpolated[key] = from[key] + (to[key] - from[key]) * eased;
        }

        setMouthShape(interpolated);

        if (progress < 1) {
          requestAnimationFrame(transition);
        }
      };

      requestAnimationFrame(transition);
    },
    [setMouthShape]
  );

  // 应用强调效果到嘴型参数
  const applyEmphasis = useCallback((params: MouthParams): MouthParams => {
    const emphasized = { ...params };
    emphasized.mouth = clamp(params.mouth * VARIATION.EMPHASIS_MOUTH);

    for (const key of Object.keys(params) as (keyof MouthParams)[]) {
      if (key !== "mouth") {
        emphasized[key] = clamp(params[key] * VARIATION.EMPHASIS_VOWEL);
      }
    }

    return emphasized;
  }, []);

  // 添加自然变化
  const addNaturalVariation = useCallback(
    (params: MouthParams, amount: number = VARIATION.NATURAL): MouthParams => {
      const varied = { ...params };
      const variation = amount * (Math.random() - 0.5);
      varied.mouth = clamp(params.mouth + variation);
      return varied;
    },
    []
  );

  // 计算字符说话速度
  const calculateCharSpeed = useCallback(
    (char: string, baseSpeed: number): number => {
      if (REGEX.WHITESPACE.test(char)) {
        return baseSpeed * SPEED_MULTIPLIER.WHITESPACE;
      }
      if (REGEX.PUNCTUATION.test(char)) {
        return baseSpeed * SPEED_MULTIPLIER.PUNCTUATION;
      }
      if (REGEX.COMMON_CHARS.test(char)) {
        return baseSpeed * SPEED_MULTIPLIER.COMMON_CHAR;
      }
      return baseSpeed;
    },
    []
  );

  // 文字嘴型同步 - 支持平滑过渡和自适应速度
  const speakText = useCallback(
    async (text: string, options?: SpeechOptions) => {
      const live2d = live2dRef.current;
      if (!live2d || !text.trim()) return;

      const {
        speed = TIMING.DEFAULT_SPEED,
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
      let previousParams = VOWEL_MAPPING.silence;

      const animate = () => {
        if (!isPlayingRef.current || currentIndex >= characters.length) {
          // 动画结束，平滑过渡到静默状态
          if (smoothTransition) {
            animateTransition(
              previousParams,
              VOWEL_MAPPING.silence,
              TIMING.SMOOTH_END_DURATION
            );
          } else {
            setTimeout(
              () => setMouthShape(VOWEL_MAPPING.silence),
              TIMING.SMOOTH_END_DURATION - 100
            );
          }
          return;
        }

        const char = characters[currentIndex];
        const vowel = analyzeVowel(char);
        let mouthParams = { ...VOWEL_MAPPING[vowel] };

        // 应用强调效果
        if (emphasize && REGEX.EMPHASIS.test(char)) {
          mouthParams = applyEmphasis(mouthParams);
        }

        // 添加自然变化
        mouthParams = addNaturalVariation(mouthParams);

        // 平滑过渡或直接设置
        if (smoothTransition && currentIndex > 0) {
          const transitionDuration = Math.min(
            speed * SPEED_MULTIPLIER.SMOOTH_TRANSITION,
            TIMING.MIN_TRANSITION_DURATION
          );
          animateTransition(previousParams, mouthParams, transitionDuration);
        } else {
          setMouthShape(mouthParams);
        }

        previousParams = mouthParams;
        currentIndex++;

        // 智能速度调整
        const charSpeed = calculateCharSpeed(char, speed);

        // 继续下一个字符
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(animate);
        }, charSpeed);
      };

      // 开始动画
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [
      analyzeVowel,
      setMouthShape,
      stopSpeech,
      animateTransition,
      applyEmphasis,
      addNaturalVariation,
      calculateCharSpeed,
    ]
  );

  // 快速嘴型同步 - 基于文本内容的智能变化
  const quickSpeech = useCallback(
    (text: string, options?: QuickSpeechOptions) => {
      const live2d = live2dRef.current;
      if (!live2d || !text.trim()) return;

      const { intensity = 0.8 } = options || {};

      // 分析文本内容，生成更真实的嘴型序列
      const chars = text.split("").filter((c) => c.trim());
      const vowelSequence = chars.map((char) => analyzeVowel(char));

      // 智能计算持续时间和间隔
      const baseDuration = Math.max(
        text.length * TIMING.QUICK_BASE_INTERVAL,
        TIMING.QUICK_MIN_DURATION
      );
      const intervals = Math.min(Math.max(vowelSequence.length, 3), 8);
      const intervalDuration = baseDuration / intervals;

      let count = 0;
      const interval = setInterval(() => {
        if (count >= intervals) {
          clearInterval(interval);
          // 平滑结束
          const lastVowel =
            vowelSequence[vowelSequence.length - 1] || ("a" as VowelType);
          animateTransition(
            VOWEL_MAPPING[lastVowel],
            VOWEL_MAPPING.silence,
            TIMING.QUICK_END_DURATION
          );
          return;
        }

        // 使用实际的元音序列，如果不够就循环
        const vowelIndex = count % vowelSequence.length;
        const vowel = vowelSequence[vowelIndex];
        let params = { ...VOWEL_MAPPING[vowel] };

        // 根据进度调整强度，使用更自然的曲线
        const progress = count / (intervals - 1);
        const naturalIntensity =
          intensity * (0.6 + 0.4 * Math.sin(progress * Math.PI));

        // 应用强度到所有参数
        for (const key of Object.keys(params) as (keyof MouthParams)[]) {
          params[key] *= naturalIntensity;
        }

        // 添加微小变化
        params = addNaturalVariation(params, VARIATION.QUICK);

        setMouthShape(params);
        count++;
      }, intervalDuration);

      // 清理函数
      return () => clearInterval(interval);
    },
    [setMouthShape, analyzeVowel, animateTransition, addNaturalVariation]
  );

  return {
    // 主要功能
    speakText,
    quickSpeech,
    stopSpeech,

    // 工具方法
    setMouthShape,
    animateTransition,
    analyzeVowel,

    // 状态查询
    isPlaying: () => isPlayingRef.current,
    getVowelMapping: () => VOWEL_MAPPING,
  };
};
