/**
 * 响应式断点常量
 * 统一管理所有组件的响应式断点，确保一致性
 */

export const BREAKPOINTS = {
  // 移动端断点 - 小于此值时使用移动端布局
  MOBILE: 768,

  // 平板端断点 - 768px 到 1024px 之间
  TABLET: 1024,

  // 桌面端小屏断点 - 1024px 到 1280px 之间
  DESKTOP_SM: 1280,

  // 桌面端中屏断点 - 1280px 到 1600px 之间
  DESKTOP_MD: 1600,

  // 桌面端大屏断点 - 大于 1600px
  DESKTOP_LG: 1920,
} as const;

/**
 * 响应式检测工具函数
 */
export const responsive = {
  isMobile: (width = window.innerWidth) => width < BREAKPOINTS.MOBILE,
  isTablet: (width = window.innerWidth) =>
    width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.TABLET,
  isDesktopSm: (width = window.innerWidth) =>
    width >= BREAKPOINTS.TABLET && width < BREAKPOINTS.DESKTOP_SM,
  isDesktopMd: (width = window.innerWidth) =>
    width >= BREAKPOINTS.DESKTOP_SM && width < BREAKPOINTS.DESKTOP_MD,
  isDesktopLg: (width = window.innerWidth) => width >= BREAKPOINTS.DESKTOP_MD,

  // 便捷检测函数
  isDesktop: (width = window.innerWidth) => width >= BREAKPOINTS.TABLET,
  isSmallScreen: (width = window.innerWidth) => width < BREAKPOINTS.DESKTOP_SM,
};

/**
 * 获取当前屏幕类型
 */
export function getScreenType(
  width = window.innerWidth
): "mobile" | "tablet" | "desktop-sm" | "desktop-md" | "desktop-lg" {
  if (responsive.isMobile(width)) return "mobile";
  if (responsive.isTablet(width)) return "tablet";
  if (responsive.isDesktopSm(width)) return "desktop-sm";
  if (responsive.isDesktopMd(width)) return "desktop-md";
  return "desktop-lg";
}
