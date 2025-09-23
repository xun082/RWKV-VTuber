import { useSyncExternalStore } from "react";
import { BREAKPOINTS } from "../lib/breakpoints";

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  // 检测移动设备用户代理
  const isMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // 使用统一的断点检测小屏幕
  const isSmallScreen = window.innerWidth < BREAKPOINTS.TABLET;

  return isMobileUserAgent || isSmallScreen;
}
