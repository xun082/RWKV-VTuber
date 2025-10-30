import { BookOpen, Layout, MessageCircle, Network } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useStates } from "../../stores/useStates";
import { Button } from "../ui/button";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const disabled = useStates((state) => state.disabled);
  const forceAllowNav = useStates((state) => state.forceAllowNav);
  const { width } = useResponsive();

  // 小屏幕下不渲染导航栏
  if (width < 1024) {
    return null;
  }

  // 定义导航项
  const allNavItems = [
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
      key: "/memory",
      label: "记忆",
      icon: BookOpen,
      category: "main" as const,
    },
  ];

  const isDisabled = disabled !== false && !forceAllowNav;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // 根据当前路径确定选中的菜单项
  const isSelected = (path: string) => {
    const currentPath = location.pathname;
    if (path === "/chat" && (currentPath === "/" || currentPath === "/chat")) {
      return true;
    }
    return currentPath === path;
  };

  return (
    <div className="w-full flex justify-center items-center py-2 px-4 border-t border-gray-200/30 bg-linear-to-b from-gray-50/80 to-white/90 backdrop-blur-md">
      <div className="w-full max-w-full">
        <nav className="flex items-center justify-center p-1.5">
          <div className="flex items-center justify-center gap-1.5 transition-all duration-300">
            {allNavItems.map((item, index) => {
              const Icon = item.icon;
              const isItemSelected = isSelected(item.key);

              return (
                <div key={item.key} className="relative flex items-center">
                  {/* 分隔线 - 在第一个配置项前显示 */}
                  {index === 1 && (
                    <div className="w-px h-5 bg-linear-to-b from-transparent via-gray-300/50 to-transparent mx-1" />
                  )}

                  <Button
                    variant={isItemSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation(item.key)}
                    disabled={isDisabled}
                    className={`
                      relative flex items-center gap-2 transition-all duration-300 ease-in-out
                      px-4 py-2 h-9 text-sm
                      ${
                        isItemSelected
                          ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 scale-[1.02]"
                          : "hover:bg-gray-100/80 text-gray-700 hover:text-gray-900 hover:scale-[1.01]"
                      }
                      rounded-lg border-0 font-medium
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Icon className="h-4 w-4 transition-colors duration-200 shrink-0" />
                    <span className="whitespace-nowrap font-medium">
                      {item.label}
                    </span>
                  </Button>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
