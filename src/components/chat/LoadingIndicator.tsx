import { ReactNode } from "react";

interface LoadingIndicatorProps {
  children: ReactNode;
}

export function LoadingIndicator({ children }: LoadingIndicatorProps) {
  return (
    <div className="flex justify-center items-center gap-3">{children}</div>
  );
}

// 预定义的加载状态
export const LoadingStates = {
  thinking: (
    <LoadingIndicator>
      <div className="typing-indicator">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
      <span className="text-blue-600 font-medium">AI正在思考中...</span>
    </LoadingIndicator>
  ),

  generating: (
    <LoadingIndicator>
      <div className="relative">
        <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
        <div className="absolute top-0 left-0 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-ping opacity-30"></div>
      </div>
      <span className="text-green-600 font-medium">正在生成语音...</span>
    </LoadingIndicator>
  ),

  updating: (
    <LoadingIndicator>
      <div className="relative">
        <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-spin"></div>
        <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
      <span className="text-purple-600 font-medium">正在更新记忆...</span>
    </LoadingIndicator>
  ),

  clearing: (
    <LoadingIndicator>
      <div className="relative">
        <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-orange-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-red-400 to-orange-500 rounded-full animate-ping opacity-25"></div>
      </div>
      <span className="text-red-600 font-medium">正在清除对话...</span>
    </LoadingIndicator>
  ),

  sending: (
    <LoadingIndicator>
      <div className="relative">
        <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-bounce"></div>
        <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-20"></div>
      </div>
      <span className="text-blue-600 font-medium">正在发送消息...</span>
    </LoadingIndicator>
  ),
};
