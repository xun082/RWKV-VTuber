/**
 * 更新通知组件
 * 显示应用更新状态和操作按钮
 */
import { useEffect } from "react";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, CheckCircle } from "lucide-react";

export function UpdateNotification() {
  const {
    updateAvailable,
    updateInfo,
    downloadProgress,
    isDownloading,
    updateDownloaded,
    downloadUpdate,
    quitAndInstall,
  } = useAutoUpdater();

  // 如果没有更新相关状态，不显示组件
  if (!updateAvailable && !isDownloading && !updateDownloaded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-primary/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {updateDownloaded ? "更新已就绪" : "发现新版本"}
            </CardTitle>
            {updateInfo && (
              <Badge variant="secondary" className="ml-2">
                v{updateInfo.version}
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm">
            {updateDownloaded
              ? "重启应用以完成更新"
              : updateInfo
              ? `版本 ${updateInfo.version} 可供下载`
              : "有新版本可用"}
          </CardDescription>
        </CardHeader>

        {downloadProgress && isDownloading && (
          <CardContent className="pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">下载进度</span>
                <span className="font-medium">
                  {Math.floor(downloadProgress.percent)}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {(downloadProgress.transferred / 1024 / 1024).toFixed(2)} MB /
                  {(downloadProgress.total / 1024 / 1024).toFixed(2)} MB
                </span>
                <span>
                  {(downloadProgress.bytesPerSecond / 1024).toFixed(0)} KB/s
                </span>
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter className="pt-0">
          {updateDownloaded ? (
            <Button
              onClick={quitAndInstall}
              className="w-full gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              立即重启安装
            </Button>
          ) : isDownloading ? (
            <Button disabled className="w-full gap-2" variant="secondary">
              <Download className="h-4 w-4 animate-pulse" />
              下载中...
            </Button>
          ) : (
            <Button
              onClick={downloadUpdate}
              className="w-full gap-2"
              variant="default"
            >
              <Download className="h-4 w-4" />
              立即下载
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
