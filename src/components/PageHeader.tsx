import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, Layout, MessageCircle, Network } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showOnlineStatus?: boolean;
  className?: string;
}

// 定义路由项
const routeItems = [
  {
    key: "/chat",
    label: "聊天",
    icon: MessageCircle,
    category: "main" as const,
  },
  {
    key: "/config/service",
    label: "服务配置",
    icon: Network,
    category: "config" as const,
  },
  {
    key: "/config/layout",
    label: "布局配置",
    icon: Layout,
    category: "config" as const,
  },
  {
    key: "/knowledge",
    label: "知识库上传",
    icon: BookOpen,
    category: "main" as const,
  },
];

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showOnlineStatus = true,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前路径确定选中的菜单项
  const isSelected = (path: string) => {
    const currentPath = location.pathname;
    if (path === "/chat" && (currentPath === "/" || currentPath === "/chat")) {
      return true;
    }
    return currentPath === path;
  };

  // 获取当前路由的标签
  const getCurrentRouteLabel = () => {
    const currentPath = location.pathname;
    if (currentPath === "/" || currentPath === "/chat") {
      return "聊天";
    }
    const currentRoute = routeItems.find((item) => isSelected(item.key));
    return currentRoute?.label || "页面";
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-200/40 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative">
          {/* Logo图标 - 使用更丰富的渐变色 */}
          <div className="h-11 w-11 rounded-xl bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-105 ring-2 ring-white/30 dark:ring-gray-800/30 group">
            <div className="h-6.5 w-6.5 rounded-lg bg-white/40 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-inner"></div>
            </div>
          </div>
          {/* 在线状态指示器 - 更亮的绿色 */}
          {showOnlineStatus && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900 shadow-lg ring-2 ring-emerald-400/40 z-10">
              <div className="w-full h-full bg-emerald-300 rounded-full animate-ping opacity-80"></div>
            </div>
          )}
        </div>
        <div>
          {/* 标题 - 使用漂亮的渐变色 */}
          <h2 className="text-base font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent leading-tight">
            {title}
          </h2>
          {/* 副标题 - 更柔和的颜色 */}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 路由切换下拉菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group flex items-center gap-2 px-3 py-2 h-9 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200/50 dark:hover:border-blue-800/30 cursor-pointer"
          >
            <span className="font-medium">{getCurrentRouteLabel()}</span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-52 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            页面导航
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1.5 bg-gray-200/50 dark:bg-gray-700/50" />
          {routeItems.map((item) => {
            const Icon = item.icon;
            const selected = isSelected(item.key);
            return (
              <DropdownMenuItem
                key={item.key}
                onClick={() => handleNavigation(item.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200 ${
                  selected
                    ? "bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                  selected 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 dark:text-gray-400"
                }`} />
                <span className="flex-1">{item.label}</span>
                {selected && (
                  <span className="ml-auto text-blue-600 dark:text-blue-400 font-bold text-sm">✓</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
