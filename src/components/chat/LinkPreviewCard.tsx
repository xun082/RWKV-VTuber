import { ExternalLink, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatApi } from "../../stores/useChatApi";
import { isElectron } from "../../lib/electron";
import { useLinkPreviewCache, type LinkPreviewData } from "../../stores/useLinkPreviewCache";

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const extractLinkMetadata = useChatApi((state) => state.extractLinkMetadata);
  const cache = useLinkPreviewCache();

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);

        // 验证 URL 格式
        try {
          const urlObj = new URL(url);
          if (
            (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") ||
            !urlObj.hostname.includes(".") ||
            urlObj.hostname.length < 4
          ) {
            // 无效URL，直接标记为失败，不显示组件
            cache.setFailed(url, "Invalid URL format");
            setError(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          // 无效URL，直接标记为失败，不显示组件
          cache.setFailed(url, "Invalid URL");
          setError(true);
          setLoading(false);
          return;
        }

        // 【关键修复】先检查是否已失败（在冷却期内）
        if (cache.isFailed(url)) {
          // 已经标记为失败且在冷却期内，直接不显示
          setError(true);
          setLoading(false);
          return;
        }

        // 检查缓存（成功的数据）
        const cached = cache.get(url);
        if (cached) {
          // 只有成功的数据才会被 get 返回
          setPreview(cached);
          setLoading(false);
          return;
        }

        // 【关键修复】如果没有缓存，也没有失败记录，才尝试获取
        // 但如果用户已经在知识库预取过了，这里应该不会执行到
        
        // 使用新方案：直接fetch HTML + AI提取元数据
        let html: string;
        
        if (isElectron() && window.electron?.fetchLinkHtml) {
          // Electron环境：使用IPC获取HTML
          const result = await window.electron.fetchLinkHtml(url);
          if (!result.success || !result.html) {
            throw new Error(result.error || "获取HTML失败");
          }
          html = result.html;
        } else {
          // Web环境：使用fetch（可能受CORS限制）
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
          }
          
          html = await response.text();
        }

        // 使用AI提取元数据
        const metadata = await extractLinkMetadata(html, url);
        
        // 生成favicon URL
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
        
        const previewData: LinkPreviewData = {
          url,
          title: metadata.title,
          description: metadata.description,
          image: metadata.image,
          siteName: metadata.siteName,
          favicon: faviconUrl,
          timestamp: Date.now(),
        };
        
        // 保存到缓存
        cache.set(previewData);
        setPreview(previewData);
      } catch (err: any) {
        // 标记为失败，避免重复请求
        cache.setFailed(url, err.message);
        
        // 静默处理错误，不在控制台显示（避免大量无效链接产生错误日志）
        // 只在开发环境下记录警告
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to fetch link preview for:", url, err.message);
        }
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url, extractLinkMetadata, cache]);

  const handleCardClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="mt-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 overflow-hidden animate-pulse">
        {/* 左右布局骨架屏 */}
        <div className="flex gap-3 p-3">
          {/* 左侧图片骨架 - 增大尺寸 */}
          <div className="w-24 h-24 rounded-md bg-gray-300 dark:bg-gray-700 shrink-0" />
          
          {/* 右侧内容骨架 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/5" />
            <div className="space-y-1.5">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
            </div>
            <div className="h-2.5 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return null;
  }

  const imageUrl = preview.image;
  const displayTitle = preview.title || preview.siteName || url;
  const displayDescription = preview.description;

  return (
    <div
      onClick={handleCardClick}
      className="mt-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-linear-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-850/90 hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all duration-300 cursor-pointer group overflow-hidden shadow-sm hover:shadow-md"
    >
      {/* 左右布局 */}
      <div className="flex gap-3 p-3">
        {/* 左侧缩略图 - 增大尺寸 */}
        {imageUrl && !imageError ? (
          <div className="w-24 h-24 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={displayTitle}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-md shrink-0 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <ImageOff className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          {/* 标题 - 增大字体 */}
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 mb-1.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {displayTitle}
          </h3>

          {/* 描述 - 增大字体和行数 */}
          {displayDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1.5 leading-relaxed">
              {displayDescription}
            </p>
          )}

          {/* 网站信息 - 增大字体 */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-500">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-3 h-3 rounded-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="truncate flex-1">
              {preview.siteName || new URL(url).hostname}
            </span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}
