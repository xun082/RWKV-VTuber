import { ReactNode } from "react";

interface InfoCardProps {
  icon: string;
  title: string;
  content: ReactNode;
  className?: string;
}

export function InfoCard({
  icon,
  title,
  content,
  className = "",
}: InfoCardProps) {
  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {title}
          </p>
          {content}
        </div>
      </div>
    </div>
  );
}
