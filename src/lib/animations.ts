/**
 * Framer Motion 动画配置
 * 替代 chat.css 中的 @keyframes 动画
 */

import type { Variants } from "framer-motion";

// 消息进入动画
export const messageEnter: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// 打字指示器动画
export const typingDot = {
  animate: {
    scale: [0.8, 1.2, 0.8],
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 1.4,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// 浮动动画
export const floatAnimation = {
  animate: {
    y: [0, -10, 0],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// 脉冲发光动画
export const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 5px rgba(59, 130, 246, 0.4)",
      "0 0 20px rgba(59, 130, 246, 0.8)",
      "0 0 5px rgba(59, 130, 246, 0.4)",
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// 按钮悬停动画
export const buttonHover = {
  whileHover: {
    scale: 1.05,
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
  },
  whileTap: {
    scale: 0.95,
  },
  transition: {
    duration: 0.2,
  },
};

// 渐变文字动画（使用 CSS animation，因为 Framer Motion 不支持 background-clip）
export const gradientTextClass = "gradient-text-animated";
