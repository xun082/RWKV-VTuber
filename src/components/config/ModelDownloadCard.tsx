import { Button } from "@/components/ui/button";
import { Download, CheckCircle2 } from "lucide-react";

interface ModelDownloadCardProps {
  title: string;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  size: string;
  onDownload: () => void;
}

export function ModelDownloadCard({
  title,
  downloaded,
  downloading,
  progress,
  size,
  onDownload,
}: ModelDownloadCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {downloaded ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
          )}
          <span className="text-sm font-medium">
            {title} {downloaded && "✓"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={onDownload}
          disabled={downloading || downloaded}
          className={`
            ${downloaded ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}
            text-white text-xs h-8
          `}
        >
          {downloading ? (
            <>
              <Download className="w-3 h-3 mr-1 animate-pulse" />
              {progress}%
            </>
          ) : downloaded ? (
            "已下载"
          ) : (
            <>
              <Download className="w-3 h-3 mr-1" />
              下载 ({size})
            </>
          )}
        </Button>
      </div>
      {downloading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
