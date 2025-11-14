import { useEffect, useRef } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useChatSession } from "../stores/useChatSession";
import { useStates } from "../stores/useStates";

export function useWelcomeMessage() {
  const setTips = useLive2dApi((state) => state.setTips);
  const showTips = useLive2dApi((state) => state.showTips);
  const hideTips = useLive2dApi((state) => state.hideTips);
  const messages = useChatSession((state) => state.messages);
  const disabled = useStates((state) => state.disabled);

  // 用于跟踪是否曾经显示过欢迎消息
  const hasShownWelcomeRef = useRef(false);
  // 用于跟踪初始消息数量
  const initialMessageCountRef = useRef(messages.length);
  // 用于跟踪上一次的消息数量
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const currentMessageCount = messages.length;
    const isIdle = disabled === false;

    // 判断是否应该显示欢迎消息的条件：
    // 1. 系统处于空闲状态
    // 2. 满足以下任一条件：
    //    a) 还没有显示过欢迎消息（初始加载）
    //    b) 消息被清空了（从有消息变成没消息）
    const isCleared =
      prevMessageCountRef.current > 0 && currentMessageCount === 0;
    const shouldShowWelcome =
      isIdle && (!hasShownWelcomeRef.current || isCleared);

    // 检测是否有新消息产生（用户发送了新消息）
    const hasNewMessage = currentMessageCount > initialMessageCountRef.current;

    if (shouldShowWelcome) {
      const timer = setTimeout(() => {
        setTips(
          "你好！我是 RWKV 智能助手。欢迎向我提问关于 RWKV 大模型架构的任何问题，我一定知无不言、言无不尽！"
        );
        showTips();
        hasShownWelcomeRef.current = true;
        // 不设置自动隐藏，让欢迎消息持续显示
      }, 1000);

      return () => clearTimeout(timer);
    } else if (hasNewMessage || !isIdle) {
      // 如果有新消息产生或正在处理，隐藏欢迎消息
      hideTips();
    }

    // 更新消息计数
    prevMessageCountRef.current = currentMessageCount;
  }, [messages.length, disabled, setTips, showTips, hideTips]);
}
