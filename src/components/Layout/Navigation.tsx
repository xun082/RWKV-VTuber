import {
  Blocks,
  BookOpen,
  Layout,
  Menu,
  MessageCircle,
  Network,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { useStates } from "../../stores/useStates";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const disabled = useStates((state) => state.disabled);
  const forceAllowNav = useStates((state) => state.forceAllowNav);
  const { screenType, width } = useResponsive();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 定义导航项
  const allNavItems = [
    {
      key: "/chat",
      label: "聊天",
      icon: MessageCircle,
      category: "main" as const,
    },
    {
      key: "/config/main",
      label: "推理服务",
      icon: Blocks,
      category: "config" as const,
    },
    {
      key: "/config/service",
      label: "语音服务",
      icon: Network,
      category: "config" as const,
    },
    {
      key: "/config/layout",
      label: "自定义设置",
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

  // 响应式断点判断 - 小于 1024px 使用汉堡菜单
  const shouldShowFullNav = width >= 1024;
  const isDisabled = disabled !== false && !forceAllowNav;

  // 当切换到完整导航时自动关闭菜单
  useEffect(() => {
    if (shouldShowFullNav) {
      setIsMenuOpen(false);
    }
  }, [shouldShowFullNav]);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 根据当前路径确定选中的菜单项
  const isSelected = (path: string) => {
    const currentPath = location.pathname;
    if (path === "/chat" && (currentPath === "/" || currentPath === "/chat")) {
      return true;
    }
    return currentPath === path;
  };

  // 响应式样式配置
  const containerStyles = {
    mobile: "max-w-full px-3",
    tablet: "max-w-2xl px-4",
    "desktop-sm": "max-w-3xl px-4",
    "desktop-md": "max-w-4xl px-6",
    "desktop-lg": "max-w-5xl px-8",
  };

  const navSpacing = {
    "desktop-sm": "gap-1",
    "desktop-md": "gap-2",
    "desktop-lg": "gap-3",
  };

  const buttonSizes = {
    "desktop-sm": { padding: "px-2.5 py-1.5", height: "h-8", text: "text-xs" },
    "desktop-md": { padding: "px-3 py-2", height: "h-9", text: "text-sm" },
    "desktop-lg": { padding: "px-4 py-2.5", height: "h-10", text: "text-base" },
  };

  const iconSizes = {
    "desktop-sm": "h-3.5 w-3.5",
    "desktop-md": "h-4 w-4",
    "desktop-lg": "h-4 w-4",
  };

  return (
    <div className="w-full flex justify-center items-center py-2 px-2 sm:py-3 md:py-4">
      <Card
        className={`
          w-full shadow-md border border-gray-200/50 
          bg-white/95 backdrop-blur-sm 
          transition-all duration-300 ease-in-out
          ${containerStyles[screenType] || containerStyles.mobile}
        `}
      >
        <nav
          className={`flex items-center justify-center ${
            screenType === "mobile" ? "p-2" : "p-2.5"
          }`}
        >
          {!shouldShowFullNav ? (
            // 移动端和平板：只显示汉堡菜单按钮
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              disabled={isDisabled}
              className={`
                h-11 w-11 p-0 rounded-lg transition-all duration-200
                ${
                  isMenuOpen
                    ? "bg-gray-100 hover:bg-gray-200"
                    : "hover:bg-gray-100"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={isMenuOpen ? "关闭菜单" : "打开菜单"}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" strokeWidth={2} />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" strokeWidth={2} />
              )}
            </Button>
          ) : (
            // 桌面端：完整导航
            <div
              className={`
                flex items-center justify-center flex-wrap transition-all duration-300
                ${
                  navSpacing[screenType as keyof typeof navSpacing] ||
                  navSpacing["desktop-sm"]
                }
              `}
            >
              {allNavItems.map((item, index) => {
                const Icon = item.icon;
                const isItemSelected = isSelected(item.key);
                const sizes =
                  buttonSizes[screenType as keyof typeof buttonSizes] ||
                  buttonSizes["desktop-sm"];
                const iconSize =
                  iconSizes[screenType as keyof typeof iconSizes] ||
                  iconSizes["desktop-sm"];

                return (
                  <div key={item.key} className="relative flex items-center">
                    {/* 分隔线 - 在第一个配置项前显示 */}
                    {index === 1 && (
                      <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1.5" />
                    )}

                    <Button
                      variant={isItemSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleNavigation(item.key)}
                      disabled={isDisabled}
                      className={`
                        relative flex items-center gap-2 transition-all duration-300 ease-in-out
                        ${sizes.padding} ${sizes.height} ${sizes.text}
                        ${
                          isItemSelected
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700"
                            : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                        }
                        rounded-xl border-0 font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <Icon
                        className={`${iconSize} transition-colors duration-200 shrink-0`}
                      />
                      <span className="whitespace-nowrap">{item.label}</span>

                      {/* 选中状态指示器 */}
                      {isItemSelected && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-sm" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* 展开的菜单 - 移动端和平板 */}
        {!shouldShowFullNav && isMenuOpen && (
          <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
            <div
              className={`${
                screenType === "mobile" ? "p-2.5" : "p-3"
              } space-y-1.5`}
            >
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isItemSelected = isSelected(item.key);

                return (
                  <Button
                    key={item.key}
                    variant={isItemSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation(item.key)}
                    disabled={isDisabled}
                    className={`
                      w-full justify-start gap-3 px-4 py-3 h-auto min-h-[48px]
                      transition-all duration-200 ease-in-out
                      ${
                        isItemSelected
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg"
                          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900 active:bg-gray-200"
                      }
                      rounded-xl border-0 font-medium text-base
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isItemSelected && (
                      <div className="w-2 h-2 bg-white rounded-full shrink-0" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
