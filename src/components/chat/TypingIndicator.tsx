import { motion } from "framer-motion";

/**
 * 打字指示器组件 - 使用 Framer Motion
 */
export function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 rounded-full bg-current"
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.16,
          }}
        />
      ))}
    </div>
  );
}
