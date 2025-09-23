import { useCallback, useEffect, useRef } from "react";
import { useChatApi } from "../stores/useChatApi.ts";
import { useLive2dApi } from "../stores/useLive2dApi.ts";
import { useLive2dSpeechSync } from "./useLive2dSpeechSync.ts";

export const useAIMotionProcessor = () => {
  const { live2d } = useLive2dApi();
  const setMotionProcessor = useChatApi((state) => state.setMotionProcessor);
  const { speakText, quickSpeech, stopSpeech } = useLive2dSpeechSync();

  // Live2D motion functions
  const playRandomMotion = useCallback(
    async (group: string) => {
      if (!live2d) return false;
      try {
        return await live2d.playMotion(group);
      } catch (error) {
        console.error("Error playing motion:", error);
        return false;
      }
    },
    [live2d]
  );

  const playSpecificMotion = useCallback(
    async (group: string, index: number) => {
      if (!live2d) return false;
      try {
        return await live2d.playMotion(group, index);
      } catch (error) {
        console.error("Error playing motion:", error);
        return false;
      }
    },
    [live2d]
  );

  // 表情控制函数
  const setExpression = useCallback(
    async (expressionId: string, intensity: number = 1.0) => {
      if (!live2d) return false;
      try {
        // 通过参数控制表情
        if (live2d.setParam) {
          switch (expressionId) {
            case "happy":
              live2d.setParam("ParamMouthForm", intensity);
              live2d.setParam("ParamEyeForm", intensity * 0.6);
              break;
            case "sad":
              live2d.setParam("ParamMouthForm", -intensity);
              live2d.setParam("ParamEyeForm", -intensity * 0.4);
              break;
            case "surprised":
              live2d.setParam("ParamEyeOpenY", 1.0 + intensity * 0.5);
              live2d.setParam("ParamMouthOpenY", intensity * 0.8);
              break;
            case "angry":
              live2d.setParam("ParamBrowLY", -intensity);
              live2d.setParam("ParamBrowRY", -intensity);
              break;
          }
        }
        return true;
      } catch (error) {
        console.error("Error setting expression:", error);
        return false;
      }
    },
    [live2d]
  );

  // 重置表情到中性状态
  const resetExpression = useCallback(() => {
    if (!live2d?.setParam) return;
    try {
      live2d.setParam("ParamMouthForm", 0);
      live2d.setParam("ParamEyeForm", 0);
      live2d.setParam("ParamEyeOpenY", 1.0);
      live2d.setParam("ParamBrowLY", 0);
      live2d.setParam("ParamBrowRY", 0);
    } catch (error) {
      console.warn("Failed to reset expression:", error);
    }
  }, [live2d]);
  const lastMotionRef = useRef<string>("Idle");
  const motionCounterRef = useRef<number>(0);

  useEffect(() => {
    const processAIResponse = (content: string) => {
      try {
        // Increment counter for variety
        motionCounterRef.current += 1;

        // 停止之前的嘴型动画
        stopSpeech();

        // 清理动作指令，获取纯文本用于嘴型同步
        const cleanContent = content
          .replace(/\[MOTION:(\w+)(?::(\d+))?\]/g, "")
          .trim();

        // Check for special motion commands in the AI response
        const motionMatches = content.match(/\[MOTION:(\w+)(?::(\d+))?\]/g);

        if (motionMatches && motionMatches.length > 0) {
          // Process multiple motion commands with delays
          const processMotionCommands = async () => {
            for (let i = 0; i < motionMatches.length; i++) {
              const match = motionMatches[i].match(
                /\[MOTION:(\w+)(?::(\d+))?\]/
              );
              if (match) {
                const [, group, indexStr] = match;
                const index = indexStr ? Number.parseInt(indexStr) : undefined;

                console.log(
                  `[Live2D Motion] AI Command ${i + 1}/${
                    motionMatches.length
                  }: ${match[0]} -> Group: ${group}, Index: ${index}`
                );

                if (index !== undefined) {
                  playSpecificMotion(group, index);
                } else {
                  playRandomMotion(group);
                }
                lastMotionRef.current = group;

                // Add delay between motions for better visual effect
                if (i < motionMatches.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5s delay between motions
                }
              }
            }
          };

          // Start processing motion commands
          processMotionCommands();

          // 同时启动优化的嘴型同步（基于清理后的文本）
          if (cleanContent) {
            setTimeout(() => {
              if (cleanContent.length > 50) {
                speakText(cleanContent, {
                  speed: 75,
                  emphasize: true,
                  smoothTransition: true,
                });
              } else {
                quickSpeech(cleanContent, {
                  intensity: 0.85,
                });
              }
            }, 200); // 与动作指令同步
          }
          return;
        }

        // Fallback: Enhanced sentiment-based motion triggering if no command found
        const lowerContent = cleanContent.toLowerCase();
        let selectedMotion = "Idle";
        let shouldUseSpecific = false;
        let expressionType = "";

        // Happy emotions - use varied Tap motions
        if (
          lowerContent.includes("哈哈") ||
          lowerContent.includes("开心") ||
          lowerContent.includes("高兴") ||
          lowerContent.includes("快乐") ||
          lowerContent.includes("兴奋") ||
          lowerContent.includes("太好了") ||
          lowerContent.includes("棒") ||
          lowerContent.includes("😊") ||
          lowerContent.includes("😄") ||
          lowerContent.includes("😆") ||
          lowerContent.includes("🎉") ||
          lowerContent.includes("happy") ||
          lowerContent.includes("great") ||
          lowerContent.includes("wonderful") ||
          lowerContent.includes("awesome") ||
          lowerContent.includes("fantastic") ||
          lowerContent.includes("excellent")
        ) {
          selectedMotion = "Tap";
          shouldUseSpecific = true;
          expressionType = "happy";
        }
        // Surprised emotions
        else if (
          lowerContent.includes("哇") ||
          lowerContent.includes("惊讶") ||
          lowerContent.includes("不敢相信") ||
          lowerContent.includes("震惊") ||
          lowerContent.includes("意外") ||
          lowerContent.includes("😲") ||
          lowerContent.includes("😮") ||
          lowerContent.includes("😱") ||
          lowerContent.includes("wow") ||
          lowerContent.includes("amazing") ||
          lowerContent.includes("incredible") ||
          lowerContent.includes("surprising") ||
          lowerContent.includes("unbelievable")
        ) {
          selectedMotion = "FlickUp";
          expressionType = "surprised";
        }
        // Sad or disappointing emotions
        else if (
          lowerContent.includes("难过") ||
          lowerContent.includes("伤心") ||
          lowerContent.includes("失望") ||
          lowerContent.includes("抱歉") ||
          lowerContent.includes("对不起") ||
          lowerContent.includes("遗憾") ||
          lowerContent.includes("😢") ||
          lowerContent.includes("😞") ||
          lowerContent.includes("😔") ||
          lowerContent.includes("sad") ||
          lowerContent.includes("sorry") ||
          lowerContent.includes("disappointed") ||
          lowerContent.includes("regret")
        ) {
          selectedMotion = "FlickDown";
          expressionType = "sad";
        }
        // Thinking or pondering
        else if (
          lowerContent.includes("想想") ||
          lowerContent.includes("思考") ||
          lowerContent.includes("让我想想") ||
          lowerContent.includes("考虑") ||
          lowerContent.includes("分析") ||
          lowerContent.includes("🤔") ||
          lowerContent.includes("thinking") ||
          lowerContent.includes("let me think") ||
          lowerContent.includes("consider") ||
          lowerContent.includes("analyze")
        ) {
          selectedMotion = "Flick";
        }
        // Questions
        else if (
          lowerContent.includes("?") ||
          lowerContent.includes("？") ||
          lowerContent.includes("怎么") ||
          lowerContent.includes("什么") ||
          lowerContent.includes("为什么") ||
          lowerContent.includes("如何") ||
          lowerContent.includes("how") ||
          lowerContent.includes("what") ||
          lowerContent.includes("why")
        ) {
          selectedMotion = "Flick";
        }
        // Greetings
        else if (
          lowerContent.includes("你好") ||
          lowerContent.includes("hello") ||
          lowerContent.includes("hi") ||
          lowerContent.includes("欢迎") ||
          lowerContent.includes("welcome")
        ) {
          selectedMotion = "Tap";
          shouldUseSpecific = true;
          expressionType = "happy";
        }
        // Default: cycle through motions to keep it interesting
        else {
          const defaultMotions = ["Idle", "Tap", "Flick"];
          selectedMotion =
            defaultMotions[motionCounterRef.current % defaultMotions.length];
          shouldUseSpecific = selectedMotion !== "Idle";
        }

        // Execute the motion
        if (
          shouldUseSpecific &&
          (selectedMotion === "Tap" || selectedMotion === "Idle")
        ) {
          // Use specific indices for variety
          const maxIndex = selectedMotion === "Tap" ? 3 : 3; // Both Tap and Idle have 3 variations
          const index = motionCounterRef.current % maxIndex;
          playSpecificMotion(selectedMotion, index);
          console.log(
            `[Live2D Motion] Sentiment: "${cleanContent.substring(
              0,
              30
            )}..." -> ${selectedMotion}[${index}] + Expression: ${expressionType}`
          );
        } else {
          playRandomMotion(selectedMotion);
          console.log(
            `[Live2D Motion] Sentiment: "${cleanContent.substring(
              0,
              30
            )}..." -> ${selectedMotion}[random] + Expression: ${expressionType}`
          );
        }

        // 设置表情
        if (expressionType) {
          setTimeout(() => setExpression(expressionType, 0.8), 200);
          // 3秒后重置表情
          setTimeout(() => resetExpression(), 3000);
        }

        // 启动优化的嘴型同步
        if (cleanContent) {
          setTimeout(() => {
            if (cleanContent.length > 50) {
              speakText(cleanContent, {
                speed: 75,
                emphasize: true,
                smoothTransition: true,
              });
            } else {
              quickSpeech(cleanContent, {
                intensity: 0.85,
              });
            }
          }, 250); // 减少延迟时间
        }

        lastMotionRef.current = selectedMotion;
      } catch (error) {
        console.error(
          "Error processing AI response for Live2D motions:",
          error
        );
        // Fallback to safe motion
        playRandomMotion("Idle");
      }
    };

    // Register the motion processor
    setMotionProcessor(processAIResponse);

    // Cleanup on unmount
    return () => {
      setMotionProcessor(() => {}); // Set empty function as cleanup
    };
  }, [
    playRandomMotion,
    playSpecificMotion,
    setMotionProcessor,
    setExpression,
    resetExpression,
    speakText,
    quickSpeech,
    stopSpeech,
  ]);
};
