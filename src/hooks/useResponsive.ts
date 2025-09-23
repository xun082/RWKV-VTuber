import { useSyncExternalStore } from "react";
import { BREAKPOINTS, getScreenType, responsive } from "../lib/breakpoints";

/**
 * 响应式状态 hook
 * 提供完整的响应式检测能力
 */
export function useResponsive() {
  const width = useSyncExternalStore(subscribe, getSnapshot);

  return {
    width,
    screenType: getScreenType(width),
    isMobile: responsive.isMobile(width),
    isTablet: responsive.isTablet(width),
    isDesktop: responsive.isDesktop(width),
    isDesktopSm: responsive.isDesktopSm(width),
    isDesktopMd: responsive.isDesktopMd(width),
    isDesktopLg: responsive.isDesktopLg(width),
    isSmallScreen: responsive.isSmallScreen(width),
  };
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  return window.innerWidth;
}
