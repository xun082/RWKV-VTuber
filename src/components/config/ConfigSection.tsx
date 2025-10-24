import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConfigSectionProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  colorClass?: string;
  isMobile?: boolean;
}

export function ConfigSection({
  icon,
  title,
  subtitle,
  children,
  colorClass = "from-blue-500 to-cyan-500",
  isMobile = false,
}: ConfigSectionProps) {
  return (
    <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <CardHeader
        className={`bg-gradient-to-r ${colorClass} ${isMobile ? "p-4" : "p-5"}`}
      >
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle
              className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}
            >
              {title}
            </CardTitle>
            {subtitle && (
              <p
                className={`text-white/90 ${
                  isMobile ? "text-xs" : "text-sm"
                } mt-1`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}`}
      >
        {children}
      </CardContent>
    </Card>
  );
}
