import { Outlet } from "react-router-dom";
import { Navigation } from "./Navigation";
import { useResponsive } from "../../hooks/useResponsive";

export function MobileLayout() {
  const { isMobile } = useResponsive();

  return (
    <main className="w-dvw h-dvh overflow-hidden">
      <div className="h-dvh overflow-hidden">
        <div className="w-full h-full overflow-hidden grid grid-rows-[1fr_auto]">
          <div
            className={`
              w-full h-full overflow-hidden flex flex-col justify-center items-center py-4
              transition-all duration-300
              ${isMobile ? "px-4" : "px-6"}
            `}
          >
            <div className="w-full overflow-hidden">
              <Outlet />
            </div>
          </div>
          <Navigation />
        </div>
      </div>
    </main>
  );
}
