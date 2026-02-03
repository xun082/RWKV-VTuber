import { ExternalLink, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // 使用 microlink.io API（免费且稳定）
        // 添加额外参数以获取更好的预览效果
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `https://api.microlink.io/?url=${encodedUrl}&screenshot=false&video=false`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status !== 'success' || !result.data) {
          throw new Error('Invalid response from preview API');
        }
        
        const data = result.data;
        
        setPreview({
          url,
          title: data.title || data.og?.title,
          description: data.description || data.og?.description,
          image: data.image?.url || data.og?.image,
          siteName: data.publisher || data.og?.site_name,
          favicon: data.logo?.url || data.favicon,
        });
      } catch (err) {
        console.error("Failed to fetch link preview:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

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
