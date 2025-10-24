import { Outlet } from "react-router-dom";
import { useResponsive } from "../../hooks/useResponsive";
import { Navigation } from "./Navigation";

export function MobileLayout() {
  const { isMobile } = useResponsive();

  return (
    <main className="w-dvw h-dvh overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="h-dvh overflow-hidden">
        <div className="w-full h-full overflow-hidden grid grid-rows-[1fr_auto]">
          <div className="w-full h-full overflow-hidden flex flex-col transition-all duration-300">
            <div className="w-full h-full overflow-y-auto">
              <Outlet />
            </div>
          </div>
          <Navigation />
        </div>
      </div>
    </main>
  );
}
