import {
  ChevronDown,
  ChevronUp,
  Edit2,
  FileSpreadsheet,
  Info,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useChatApi } from "../../stores/useChatApi";
import { isElectron } from "../../lib/electron";
import { PageHeader } from "../../components/PageHeader";
import {
  useLinkPreviewCache,
  type LinkPreviewData,
} from "../../stores/useLinkPreviewCache";

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

const STORAGE_KEY = "knowledge_base_qa";

export default function KnowledgePage() {
  const loadKnowledgeBase = useChatApi((state) => state.loadKnowledgeBase);
  const extractLinkMetadata = useChatApi((state) => state.extractLinkMetadata);
  const linkCache = useLinkPreviewCache();
  
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // 链接预取相关状态
  const [extractedLinks, setExtractedLinks] = useState<string[]>([]);
  const [fetchingLinks, setFetchingLinks] = useState<Set<string>>(new Set());
  const [isScanningLinks, setIsScanningLinks] = useState(false);

  // 从API获取知识库数据
  const fetchKnowledgeBase = async () => {
    setIsLoading(true);
    try {
      if (!isElectron() || !window.electron) {
        throw new Error("请在Electron环境中使用此功能");
      }

      // 通过Electron主进程请求API
      const result = await window.electron.fetchKnowledgeBase();

      if (!result.success || !result.data) {
        throw new Error(result.error || "获取数据失败");
      }

      const apiData = result.data;

      if (apiData.code !== 200 || !apiData.data) {
        throw new Error(apiData.message || "API返回数据格式错误");
      }

      // 过滤并转换数据：只保留有答案的问答
      const transformedData: QAItem[] = apiData.data
        .filter((item: any) => {
          return (
            item.answers &&
            item.answers.length > 0 &&
            item.answers[0].content &&
            item.question_title
          );
        })
        .map((item: any) => {
          return {
            id: `${item.question_id}`,
            question: item.question_title,
            answer: item.answers[0].content,
          };
        });

      saveToStorage(transformedData);
    } catch (error: any) {
      console.error("获取知识库失败:", error);
      toast.error(`获取知识库失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 从localStorage加载数据，并在首次加载时尝试从API获取
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQaList(parsed);
      } catch (error) {
        console.error("加载数据失败:", error);
      }
    }

    // 首次加载时从API获取最新数据
    fetchKnowledgeBase();
  }, []);

  // 保存数据到localStorage
  const saveToStorage = (data: QAItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setQaList(data);
    // 通知 store 重新加载知识库
    loadKnowledgeBase();
  };

  // 添加新问答
  const handleAdd = () => {
    const newItem: QAItem = {
      id: `${Date.now()}`,
      question: "",
      answer: "",
    };
    saveToStorage([newItem, ...qaList]);
    setEditingId(newItem.id);
    setEditQuestion("");
    setEditAnswer("");
    // 自动展开新添加的项
    setExpandedIds((prev) => new Set(prev).add(newItem.id));
  };

  // 开始编辑
  const startEdit = (item: QAItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
    // 自动展开正在编辑的项
    setExpandedIds((prev) => new Set(prev).add(item.id));
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingId) return;

    const updated = qaList.map((item) =>
      item.id === editingId
        ? { ...item, question: editQuestion, answer: editAnswer }
        : item
    );
    saveToStorage(updated);
    setEditingId(null);
    setEditQuestion("");
    setEditAnswer("");
    toast.success("保存成功");
  };

  // 取消编辑
  const cancelEdit = () => {
    // 如果是新添加但未保存的项目，删除它
    const item = qaList.find((q) => q.id === editingId);
    if (item && !item.question && !item.answer) {
      handleDelete(editingId!);
    }
    setEditingId(null);
    setEditQuestion("");
    setEditAnswer("");
  };

  // 删除问答
  const handleDelete = (id: string) => {
    const updated = qaList.filter((item) => item.id !== id);
    saveToStorage(updated);
    toast.success("删除成功");
  };

  // 切换单个问答的展开/折叠状态（一次只能展开一个）
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      // 如果点击的是已展开的项，则折叠它
      if (prev.has(id)) {
        return new Set();
      }
      // 否则，只展开这一个项
      return new Set([id]);
    });
  };

  // 从问答内容中提取URL
  const extractUrlsFromText = (text: string): string[] => {
    // 更严格的 URL 正则表达式，确保包含完整的域名
    const urlRegex = /(https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
    const matches = text.match(urlRegex);
    if (!matches) return [];
    
    // 过滤和验证 URL
    const validUrls = matches.filter((url) => {
      try {
        const urlObj = new URL(url);
        // 确保有有效的协议和主机名
        return (
          (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
          urlObj.hostname.includes(".") && // 确保有完整的域名
          urlObj.hostname.length > 3 // 最小长度检查
        );
      } catch {
        return false;
      }
    });
    
    return [...new Set(validUrls)];
  };

  // 扫描所有问答中的链接
  const scanLinks = () => {
    setIsScanningLinks(true);
    try {
      const allLinks = new Set<string>();
      
      qaList.forEach((qa) => {
        // 从问题中提取链接
        const questionLinks = extractUrlsFromText(qa.question);
        questionLinks.forEach((link) => allLinks.add(link));
        
        // 从答案中提取链接
        const answerLinks = extractUrlsFromText(qa.answer);
        answerLinks.forEach((link) => allLinks.add(link));
      });
      
      setExtractedLinks(Array.from(allLinks));
      toast.success(`扫描完成，发现 ${allLinks.size} 个链接`);
    } catch (error: any) {
      console.error("扫描链接失败:", error);
      toast.error(`扫描链接失败: ${error.message}`);
    } finally {
      setIsScanningLinks(false);
    }
  };

  // 验证 URL 是否有效
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return (
        (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
        urlObj.hostname.includes(".") &&
        urlObj.hostname.length > 3
      );
    } catch {
      return false;
    }
  };

  // 预取单个链接
  const prefetchLink = async (url: string, silent = false) => {
    // 验证 URL
    if (!isValidUrl(url)) {
      linkCache.setFailed(url, "无效的链接格式");
      if (!silent) {
        toast.error(`无效的链接: ${url}`);
      }
      return { success: false, error: "无效的链接" };
    }

    // 检查是否已失败（在冷却期内）
    if (linkCache.isFailed(url)) {
      const failedInfo = linkCache.getFailedInfo(url);
      if (!silent && failedInfo) {
        const cooldownEnd = failedInfo.cooldownEnd;
        const now = Date.now();
        const diff = cooldownEnd ? cooldownEnd - now : 0;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (60 * 60 * 1000));
          const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
          let timeMsg = "";
          if (hours > 24) {
            timeMsg = `${Math.floor(hours / 24)}天`;
          } else if (hours > 0) {
            timeMsg = `${hours}小时`;
          } else {
            timeMsg = `${minutes}分钟`;
          }
          toast.warning(`该链接获取失败过，${timeMsg}后可重试`, { duration: 4000 });
        }
      }
      return { success: false, error: "在冷却期内" };
    }

    // 检查是否已经缓存
    const cached = linkCache.get(url);
    if (cached && !cached.failed) {
      if (!silent) {
        toast.info("该链接已缓存");
      }
      return { success: true, cached: true };
    }

    setFetchingLinks((prev) => new Set(prev).add(url));
    
    try {
      if (!isElectron() || !window.electron) {
        throw new Error("请在Electron环境中使用此功能");
      }

      // 获取HTML内容
      const result = await window.electron.fetchLinkHtml(url);
      if (!result.success || !result.html) {
        throw new Error(result.error || "获取HTML失败");
      }

      // 使用AI提取元数据
      const metadata = await extractLinkMetadata(result.html, url);
      
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
      linkCache.set(previewData);
      if (!silent) {
        toast.success("预取成功");
      }
      return { success: true, cached: false };
    } catch (error: any) {
      // 标记为失败，避免重复请求
      linkCache.setFailed(url, error.message);
      
      console.error("预取链接失败:", url, error);
      if (!silent) {
        toast.error(`预取失败: ${error.message}`);
      }
      return { success: false, error: error.message };
    } finally {
      setFetchingLinks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  // 批量预取所有链接
  const prefetchAllLinks = async () => {
    let successCount = 0;
    let failedCount = 0;
    let skippedCached = 0;
    let skippedFailed = 0;
    
    toast.info("开始批量预取链接...");
    
    for (const url of extractedLinks) {
      // 检查是否已成功缓存
      const cached = linkCache.get(url);
      if (cached && !cached.failed) {
        skippedCached++;
        continue;
      }
      
      // 检查是否在失败冷却期内
      if (linkCache.isFailed(url)) {
        skippedFailed++;
        continue;
      }
      
      const result = await prefetchLink(url, true); // silent mode
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
      
      // 添加延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    
    // 显示统计结果
    const parts = [];
    if (successCount > 0) parts.push(`✓ 成功 ${successCount} 个`);
    if (failedCount > 0) parts.push(`✗ 失败 ${failedCount} 个`);
    if (skippedCached > 0) parts.push(`已缓存 ${skippedCached} 个`);
    if (skippedFailed > 0) parts.push(`已失败 ${skippedFailed} 个(跳过)`);
    
    const message = `批量预取完成: ${parts.join(", ")}`;
    if (failedCount > 0) {
      toast.warning(message, { duration: 5000 });
    } else {
      toast.success(message, { duration: 5000 });
    }
  };

  // 当问答列表变化时，自动扫描链接
  useEffect(() => {
    if (qaList.length > 0) {
      scanLinks();
    }
  }, [qaList]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <PageHeader
        title="📚 知识库管理"
        subtitle="从API加载、编辑和管理您的问答知识库"
      />
      <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-5">
        <div className="mx-auto space-y-3 max-w-5xl">
          {/* Tabs */}
          <Tabs defaultValue="qa" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="qa">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                问答管理
              </TabsTrigger>
              <TabsTrigger value="links">
                <Link2 className="h-4 w-4 mr-2" />
                链接预取
              </TabsTrigger>
            </TabsList>

            {/* 问答管理 Tab */}
            <TabsContent value="qa" className="space-y-3">
          {/* Action Buttons */}
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Button
                  onClick={fetchKnowledgeBase}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1.5 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  {isLoading ? "加载中..." : "刷新数据"}
                </Button>
                <Button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  新增问答
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QA List */}
          <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="px-4 py-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileSpreadsheet className="text-green-600 h-4 w-4" />
                问答列表
                <span className="text-xs text-gray-500 font-normal ml-1">
                  (共 {qaList.length} 条)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {qaList.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-base mb-1 font-medium">暂无问答数据</p>
                  <p className="text-xs">
                    请上传Excel文件或点击"新增问答"按钮添加
                  </p>
                </div>
              ) : (
                qaList.map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      group relative border rounded-md transition-all
                      ${
                        editingId === item.id
                          ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm"
                          : expandedIds.has(item.id)
                          ? "border-blue-200 dark:border-blue-800 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                      }
                      p-3
                    `}
                  >
                    {editingId === item.id ? (
                      // 编辑模式
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px]">
                              Q{index + 1}
                            </span>
                            问题
                          </Label>
                          <Input
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            placeholder="请输入问题..."
                            className="h-9 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pl-9">
                            答案
                          </Label>
                          <Textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            placeholder="请输入答案..."
                            rows={4}
                            className="resize-none text-sm"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={saveEdit}
                            size="sm"
                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            保存
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="relative">
                        <div
                          className="cursor-pointer select-none"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {/* 标题行 */}
                          <div className="flex items-center gap-2.5 pr-16">
                            <span className="inline-flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 min-w-[32px]">
                              Q{index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">
                              {item.question || "(无问题)"}
                            </span>
                            <div className="shrink-0">
                              {expandedIds.has(item.id) ? (
                                <ChevronUp className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                              )}
                            </div>
                          </div>

                          {/* 答案内容 */}
                          {expandedIds.has(item.id) ? (
                            <div className="mt-2.5 pl-9">
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {item.answer || "(无答案)"}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-1.5 pl-9">
                              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                                {item.answer
                                  ? item.answer.substring(0, 100) +
                                    (item.answer.length > 100 ? "..." : "")
                                  : "(无答案)"}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 - 悬浮在右上角 */}
                        <div
                          className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => startEdit(item)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:scale-110 transition-transform"
                            title="编辑"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/40 hover:scale-110 transition-transform"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="shadow-sm border border-green-200/50 dark:border-green-800/50 bg-linear-to-r from-green-50/50 to-blue-50/50 dark:from-green-900/10 dark:to-blue-900/10">
            <CardContent className="p-3">
              <div className="flex items-start gap-2.5">
                <div className="bg-green-100 dark:bg-green-800/50 rounded-full p-1.5 shrink-0">
                  <Info className="text-green-600 dark:text-green-400 h-4 w-4" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                    💡 使用说明
                  </h4>
                  <ul className="text-gray-600 dark:text-gray-400 leading-relaxed space-y-0.5 list-disc list-inside text-xs">
                    <li>点击"刷新数据"从API加载最新的知识库问答</li>
                    <li>所有数据自动保存到浏览器本地存储并同步到AI对话</li>
                    <li>可随时新增、编辑和删除问答</li>
                    <li>点击问题可展开/折叠答案，一次只能展开一个</li>
                    <li>本地编辑的数据会覆盖从API加载的相同ID的问答</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            {/* 链接预取 Tab */}
            <TabsContent value="links" className="space-y-3">
              {/* Action Buttons */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={scanLinks}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                      disabled={isScanningLinks}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-1.5 ${
                          isScanningLinks ? "animate-spin" : ""
                        }`}
                      />
                      {isScanningLinks ? "扫描中..." : "扫描链接"}
                    </Button>
                    <Button
                      onClick={prefetchAllLinks}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      disabled={
                        extractedLinks.length === 0 || fetchingLinks.size > 0
                      }
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      批量预取全部
                    </Button>
                    <Button
                      onClick={() => {
                        linkCache.clearFailed();
                        toast.success("已清除所有失败记录");
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      清除失败记录
                    </Button>
                  </div>
                  {/* 统计信息 */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {(() => {
                      const stats = linkCache.getStats();
                      return (
                        <>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ✓ 已缓存: {stats.success}
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            ✗ 失败: {stats.failed}
                          </span>
                          {stats.expired > 0 && (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              ⏰ 过期: {stats.expired}
                            </span>
                          )}
                          <span className="text-gray-500 dark:text-gray-400">
                            总计: {stats.total}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Links List */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
                <CardHeader className="px-4 py-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Link2 className="text-blue-600 h-4 w-4" />
                    发现的链接
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (共 {extractedLinks.length} 个)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {extractedLinks.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                      <Link2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-base mb-1 font-medium">暂无链接</p>
                      <p className="text-xs">
                        请先在"问答管理"中添加包含链接的问答，然后点击"扫描链接"
                      </p>
                    </div>
                  ) : (
                    extractedLinks.map((url, index) => {
                      const cached = linkCache.get(url);
                      const isFetching = fetchingLinks.has(url);
                      const isFailed = cached?.failed || linkCache.isFailed(url);
                      
                      return (
                        <div
                          key={url}
                          className={`group relative border rounded-md transition-all p-3 ${
                            isFailed
                              ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 序号和favicon */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[32px]">
                                {index + 1}
                              </span>
                              {cached?.favicon && !isFailed && (
                                <img
                                  src={cached.favicon}
                                  alt=""
                                  className="w-4 h-4 rounded-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                            </div>

                            {/* 链接信息 */}
                            <div className="flex-1 min-w-0">
                              {cached && !isFailed ? (
                                <>
                                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 truncate">
                                    {cached.title || cached.siteName || "无标题"}
                                  </h4>
                                  {cached.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1.5">
                                      {cached.description}
                                    </p>
                                  )}
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate block"
                                  >
                                    {url}
                                  </a>
                                  <div className="mt-1.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                                    已缓存
                                  </div>
                                </>
                              ) : isFailed ? (
                                <>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 truncate block mb-1"
                                  >
                                    {url}
                                  </a>
                                  {(() => {
                                    const failedInfo = linkCache.getFailedInfo(url);
                                    const cooldownEnd = failedInfo?.cooldownEnd;
                                    const failCount = failedInfo?.failCount || 0;
                                    const error = failedInfo?.error || cached?.error;
                                    
                                    let timeLeft = "";
                                    if (cooldownEnd) {
                                      const now = Date.now();
                                      const diff = cooldownEnd - now;
                                      if (diff > 0) {
                                        const hours = Math.floor(diff / (60 * 60 * 1000));
                                        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
                                        if (hours > 24) {
                                          timeLeft = `${Math.floor(hours / 24)}天后可重试`;
                                        } else if (hours > 0) {
                                          timeLeft = `${hours}小时后可重试`;
                                        } else {
                                          timeLeft = `${minutes}分钟后可重试`;
                                        }
                                      }
                                    }
                                    
                                    return (
                                      <div className="space-y-1">
                                        <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                                          获取失败 {failCount > 1 && `(失败${failCount}次)`}
                                        </div>
                                        {error && (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 pl-3">
                                            原因: {error}
                                          </div>
                                        )}
                                        {timeLeft && (
                                          <div className="text-xs text-orange-600 dark:text-orange-400 pl-3">
                                            ⏰ {timeLeft}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                <>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate block"
                                  >
                                    {url}
                                  </a>
                                  <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    未缓存
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            {!cached && !isFailed && (
                              <Button
                                onClick={() => prefetchLink(url)}
                                size="sm"
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 shrink-0"
                                disabled={isFetching}
                              >
                                {isFetching ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    预取中
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3.5 w-3.5 mr-1.5" />
                                    预取
                                  </>
                                )}
                              </Button>
                            )}
                            {isFailed && (
                              <Button
                                onClick={() => {
                                  // 清除失败标记，允许重试
                                  const newCache = { ...linkCache.cache };
                                  delete newCache[url];
                                  linkCache.clear();
                                  Object.values(newCache).forEach((data) => {
                                    if (data.url !== url) {
                                      linkCache.set(data);
                                    }
                                  });
                                  prefetchLink(url);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                                disabled={isFetching}
                              >
                                {isFetching ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    重试中
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                    重试
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Information Card */}
              <Card className="shadow-sm border border-blue-200/50 dark:border-blue-800/50 bg-linear-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="bg-blue-100 dark:bg-blue-800/50 rounded-full p-1.5 shrink-0">
                      <Info className="text-blue-600 dark:text-blue-400 h-4 w-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                        💡 链接预取说明
                      </h4>
                      <ul className="text-gray-600 dark:text-gray-400 leading-relaxed space-y-0.5 list-disc list-inside text-xs">
                        <li>系统会自动扫描问答中的所有链接</li>
                        <li>点击"预取"按钮获取链接内容，使用AI提取标题、描述等信息</li>
                        <li>预取的数据会缓存到本地，聊天时可离线显示链接卡片</li>
                        <li>缓存有效期为7天，过期后需要重新预取</li>
                        <li>批量预取会自动跳过已缓存和失败冷却期内的链接</li>
                        <li className="text-orange-600 dark:text-orange-400">
                          <strong>失败处理：</strong>失败的链接会进入24小时冷却期（失败3次以上延长到7天），冷却期内不会重试，避免重复请求无效链接
                        </li>
                        <li>如需立即重试失败的链接，可点击"重试"按钮或"清除失败记录"</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
