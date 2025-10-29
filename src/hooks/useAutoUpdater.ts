/**
 * 自动更新 Hook
 * 处理应用自动更新逻辑
 */
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export function useAutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<UpdateProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const isManualCheckRef = useRef(false);

  useEffect(() => {
    // 检查是否在 Electron 环境
    if (!window.electron) {
      console.log("[AutoUpdater] 非 Electron 环境，跳过自动更新");
      return;
    }

    // 监听更新消息
    const unsubscribe = window.electron.onUpdaterMessage((message: any) => {
      console.log("[AutoUpdater] 收到更新消息:", message);

      switch (message.status) {
        case "checking-for-update":
          console.log("[AutoUpdater] 正在检查更新...");
          break;

        case "update-available":
          setUpdateAvailable(true);
          setUpdateInfo(message.data);
          // 不显示 toast，避免遮挡更新卡片
          console.log(`[AutoUpdater] 发现新版本 ${message.data.version}`);
          break;

        case "update-not-available":
          console.log("[AutoUpdater] 已是最新版本");
          // 只在手动检查时显示提示
          if (isManualCheckRef.current) {
            toast.success("已是最新版本", {
              description: "您当前使用的是最新版本",
              duration: 3000,
            });
            isManualCheckRef.current = false;
          }
          break;

        case "download-progress":
          setIsDownloading(true);
          setDownloadProgress(message.data);

          // 每 10% 显示一次进度
          if (Math.floor(message.data.percent) % 10 === 0) {
            toast.loading(`下载更新中: ${Math.floor(message.data.percent)}%`, {
              id: "update-download",
            });
          }
          break;

        case "update-downloaded":
          setIsDownloading(false);
          setUpdateDownloaded(true);
          setDownloadProgress(null);
          toast.dismiss("update-download");
          toast.success("更新已下载", {
            description: "重启应用以安装更新",
            duration: 10000,
            action: {
              label: "立即重启",
              onClick: () => handleQuitAndInstall(),
            },
          });
          break;

        case "error":
          setIsDownloading(false);
          setDownloadProgress(null);
          toast.dismiss("update-download");
          toast.error("更新失败", {
            description: message.data?.message || "未知错误",
            duration: 5000,
          });
          break;
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 手动检查更新
  const checkForUpdates = async () => {
    if (!window.electron) {
      toast.error("自动更新功能仅在桌面版可用");
      return;
    }

    try {
      isManualCheckRef.current = true;
      toast.loading("正在检查更新...", { id: "check-update" });
      await window.electron.checkForUpdates();

      // 延迟关闭提示，等待实际的更新检查结果
      setTimeout(() => {
        toast.dismiss("check-update");
      }, 2000);
    } catch (error: any) {
      isManualCheckRef.current = false;
      toast.dismiss("check-update");
      toast.error("检查更新失败", {
        description: error?.message || "未知错误",
      });
    }
  };

  // 下载更新
  const downloadUpdate = async () => {
    if (!window.electron) {
      return;
    }

    try {
      await window.electron.downloadUpdate();
      toast.loading("开始下载更新...", { id: "update-download" });
    } catch (error: any) {
      toast.error("下载更新失败", {
        description: error?.message || "未知错误",
      });
    }
  };

  // 退出并安装
  const handleQuitAndInstall = async () => {
    if (!window.electron) {
      return;
    }

    try {
      await window.electron.quitAndInstall();
    } catch (error: any) {
      toast.error("安装更新失败", {
        description: error?.message || "未知错误",
      });
    }
  };

  return {
    updateAvailable,
    updateInfo,
    downloadProgress,
    isDownloading,
    updateDownloaded,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall: handleQuitAndInstall,
  };
}
