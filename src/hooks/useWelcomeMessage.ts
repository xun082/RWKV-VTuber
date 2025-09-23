import { useEffect } from "react";
import { useLive2dApi } from "../stores/useLive2dApi";
import { useIsMobile } from "./useIsMobile";
import { migrateFromWebToTauri } from "../lib/utils";

export function useWelcomeMessage() {
  const setTips = useLive2dApi((state) => state.setTips);
  const showTips = useLive2dApi((state) => state.showTips);
  const hideTips = useLive2dApi((state) => state.hideTips);
  const isMobile = useIsMobile();

  useEffect(() => {
    // 执行数据迁移（从 Web 存储到 Tauri 存储）
    migrateFromWebToTauri().catch(console.error);

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
