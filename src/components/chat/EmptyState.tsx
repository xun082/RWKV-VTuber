export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in-0 duration-500">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/25 animate-bounce">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-full animate-ping opacity-20"></div>
        <div className="absolute -inset-4 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-full animate-pulse opacity-10"></div>
      </div>
      <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        开始新的对话
      </span>
      <span className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-xs">
        发送消息开始与AI助手进行智能对话，享受流畅的交流体验
      </span>
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
