import {
  Blocks,
  BookOpen,
  Layout,
  MessageCircle,
  Network,
  Menu,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStates } from "../../stores/useStates";
import { useResponsive } from "../../hooks/useResponsive";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const disabled = useStates((state) => state.disabled);
  const forceAllowNav = useStates((state) => state.forceAllowNav);
  const { screenType, isSmallScreen, isDesktop } = useResponsive();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 当屏幕变为桌面大小时自动关闭菜单
  useEffect(() => {
    if (isDesktop) {
      setIsMenuOpen(false);
    }
  }, [isDesktop]);

  const handleNavigation = (path: string) => {
    navigate(path);
    // 在小屏幕时导航后关闭菜单
    if (isSmallScreen) {
      setIsMenuOpen(false);
    }
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

  const isDisabled = disabled !== false && !forceAllowNav;

  const allNavItems = [
    {
      key: "/memory",
      label: "记忆",
      icon: BookOpen,
      category: "main",
    },
    {
      key: "/chat",
      label: "聊天",
      icon: MessageCircle,
      category: "main",
    },
    {
      key: "/config/main",
      label: "推理服务",
      icon: Blocks,
      category: "config",
    },
    {
      key: "/config/service",
      label: "语音服务",
      icon: Network,
      category: "config",
    },
    {
      key: "/config/layout",
      label: "自定义设置",
      icon: Layout,
      category: "config",
    },
  ];

  // 根据屏幕大小决定显示方式
  const shouldShowFullNav = isDesktop;
  const navItems = shouldShowFullNav ? allNavItems : [];

  return (
    <div className="w-full flex justify-center items-center py-2 px-2 sm:py-4 sm:px-4">
      <Card
        className={`
        w-full shadow-lg border-0 bg-gradient-to-r from-white to-gray-50/50 backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${screenType === "mobile" ? "max-w-sm" : ""}
        ${screenType === "tablet" ? "max-w-2xl" : ""}
        ${screenType === "desktop-sm" ? "max-w-3xl" : ""}
        ${screenType === "desktop-md" ? "max-w-4xl" : ""}
        ${screenType === "desktop-lg" ? "max-w-5xl" : ""}
      `}
      >
        <nav
          className={`
          flex items-center justify-center transition-all duration-300
          ${screenType === "mobile" ? "p-2" : "p-3"}
        `}
        >
          {!shouldShowFullNav ? (
            // 小屏幕：汉堡菜单
            <div className="w-full flex items-center justify-between">
              {/* 当前选中的页面标题 */}
              <div className="flex items-center gap-2">
                {allNavItems.map((item) => {
                  if (isSelected(item.key)) {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-700">
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* 汉堡菜单按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                disabled={isDisabled}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
              >
                {isMenuOpen ? (
                  <X className="h-4 w-4 text-gray-600" />
                ) : (
                  <Menu className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            </div>
          ) : (
            // 大屏幕：完整导航
            <div
              className={`
              flex items-center transition-all duration-300
              ${screenType === "desktop-sm" ? "space-x-1" : ""}
              ${screenType === "desktop-md" ? "space-x-2" : ""}
              ${screenType === "desktop-lg" ? "space-x-3" : ""}
            `}
            >
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isItemSelected = isSelected(item.key);
                const isConfigItem = item.category === "config";

                return (
                  <div key={item.key} className="relative">
                    {/* 分隔线 */}
                    {index === 2 && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                    )}

                    <Button
                      variant={isItemSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleNavigation(item.key)}
                      disabled={isDisabled}
                      className={`
                        relative flex items-center gap-2 transition-all duration-300 ease-in-out
                        ${
                          screenType === "desktop-sm"
                            ? "px-2 py-1 h-8 text-xs"
                            : ""
                        }
                        ${
                          screenType === "desktop-md"
                            ? "px-3 py-2 h-9 text-sm"
                            : ""
                        }
                        ${
                          screenType === "desktop-lg"
                            ? "px-4 py-2 h-10 text-base"
                            : ""
                        }
                        ${
                          isItemSelected
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
                            : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                        }
                        ${
                          isConfigItem && screenType !== "desktop-lg"
                            ? "text-xs"
                            : "font-medium"
                        }
                        rounded-xl border-0 hover:border-0
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <Icon
                        className={`
                          transition-colors duration-200
                          ${screenType === "desktop-sm" ? "h-3 w-3" : ""}
                          ${screenType === "desktop-md" ? "h-4 w-4" : ""}
                          ${screenType === "desktop-lg" ? "h-4 w-4" : ""}
                          ${isItemSelected ? "text-white" : "text-gray-600"}
                        `}
                      />
                      <span className="font-medium">{item.label}</span>

                      {/* 选中状态指示器 */}
                      {isItemSelected && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-sm" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* 展开的菜单 */}
        {!shouldShowFullNav && isMenuOpen && (
          <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="p-3 space-y-2">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isItemSelected = isSelected(item.key);
                const isConfigItem = item.category === "config";

                return (
                  <Button
                    key={item.key}
                    variant={isItemSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation(item.key)}
                    disabled={isDisabled}
                    className={`
                      w-full justify-start gap-3 px-3 py-2 h-10
                      transition-all duration-200 ease-in-out
                      ${
                        isItemSelected
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                      }
                      ${isConfigItem ? "text-sm" : "text-base font-medium"}
                      rounded-lg border-0
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Icon
                      className={`h-4 w-4 transition-colors duration-200 ${
                        isItemSelected ? "text-white" : "text-gray-600"
                      }`}
                    />
                    <span className="font-medium">{item.label}</span>
                    {isItemSelected && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full" />
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
