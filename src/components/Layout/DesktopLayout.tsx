import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * 桌面布局组件 - 使用 Tailwind CSS + Framer Motion
 */
export function DesktopLayout() {
  return (
    <>
      {/* 左侧：Live2D 和背景 */}
      <div className="fixed left-0 top-0 w-[50vw] h-screen overflow-hidden bg-black">
        {/* 背景图片 */}
        <div 
          id="back-container" 
          className="absolute inset-0 overflow-hidden z-0"
        >
          <img 
            id="back" 
            alt="background" 
            className="w-full h-full object-contain object-center"
          />
        </div>
        
        {/* Live2D 模型容器 */}
        <div 
          id="live2d-container" 
          className="absolute inset-0 z-10 flex items-center justify-center p-5 pointer-events-none overflow-hidden"
        >
          <canvas 
            id="live2d" 
            className="max-w-[80%] max-h-[80%] pointer-events-auto"
          />
          
          {/* 聊天气泡 - 使用 Framer Motion 动画 */}
          <motion.div
            id="live2d-message"
            className="absolute top-[120px] left-1/2 -translate-x-1/2 w-80 min-h-[120px] 
                       flex items-center justify-center z-50 pointer-events-auto
                       bg-linear-to-br from-indigo-500 to-purple-600
                       border-2 border-white/30 rounded-2xl
                       px-5 py-4 text-white text-center font-medium
                       shadow-[0_8px_32px_rgba(102,126,234,0.4)] backdrop-blur-md
                       opacity-0 transition-opacity duration-500"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>

      {/* 右侧：控制面板 */}
      <div className="fixed right-0 top-0 w-[50vw] h-screen overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
