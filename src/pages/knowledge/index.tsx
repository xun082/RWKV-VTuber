import {
  ChevronDown,
  ChevronUp,
  Edit2,
  FileSpreadsheet,
  Info,
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
import { useChatApi } from "../../stores/useChatApi";
import { isElectron } from "../../lib/electron";

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

const STORAGE_KEY = "knowledge_base_qa";

export default function KnowledgePage() {
  const loadKnowledgeBase = useChatApi((state) => state.loadKnowledgeBase);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-5">
        <div className="mx-auto space-y-3 max-w-5xl">
          {/* Header */}
          <div className="text-center space-y-1 py-2">
            <h1 className="text-2xl font-bold bg-linear-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              📚 知识库管理
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              从API加载、编辑和管理您的问答知识库
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
