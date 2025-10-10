import { useEffect } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useIsMobile } from "./useIsMobile";

export function useWelcomeMessage() {
  const setTips = useLive2dApi((state) => state.setTips);
  const showTips = useLive2dApi((state) => state.showTips);
  const hideTips = useLive2dApi((state) => state.hideTips);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (sessionStorage.getItem("welcome-message-shown") === "yes" || isMobile) {
      return;
    }

    sessionStorage.setItem("welcome-message-shown", "yes");
    const timer = setTimeout(() => {
      setTips("用户, 我们又见面啦!");
      showTips();
      hideTips(8);
    }, 1000);

    return () => clearTimeout(timer);
  }, [setTips, showTips, hideTips, isMobile]);
}
