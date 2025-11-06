import {
  Download,
  Edit2,
  FileSpreadsheet,
  Info,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useResponsive } from "../../hooks/useResponsive";
import { useChatApi } from "../../stores/useChatApi";
import * as XLSX from "xlsx";

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

const STORAGE_KEY = "knowledge_base_qa";

export default function KnowledgePage() {
  const { screenType, isMobile } = useResponsive();
  const loadKnowledgeBase = useChatApi((state) => state.loadKnowledgeBase);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从localStorage加载数据
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
  }, []);

  // 保存数据到localStorage
  const saveToStorage = (data: QAItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setQaList(data);
    // 通知 store 重新加载知识库
    loadKnowledgeBase();
  };

  // 处理Excel文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<
          string,
          string
        >[];

        const newQaList: QAItem[] = jsonData.map((row, index) => ({
          id: `${Date.now()}-${index}`,
          question: row.question ?? row["问题"] ?? "",
          answer: row.answer ?? row["答案"] ?? "",
        }));

        saveToStorage([...qaList, ...newQaList]);
        toast.success(`成功导入 ${newQaList.length} 条问答`);
      } catch (error) {
        console.error("导入失败:", error);
        toast.error("导入失败，请检查文件格式");
      }
    };
    reader.readAsBinaryString(file);

    // 清空input以允许重复上传同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 导出为Excel
  const handleExport = async () => {
    try {
      // 动态导入 exceljs
      const ExcelJS = await import("exceljs");

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("问答");

      // 表头
      ws.columns = [
        { header: "问题", key: "question", width: 50 },
        { header: "答案", key: "answer", width: 80 },
      ];

      // 数据行
      qaList.forEach((item) => {
        ws.addRow({ question: item.question, answer: item.answer });
      });

      // 美化：表头加粗，自动换行
      ws.getRow(1).font = { bold: true };
      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { wrapText: true, vertical: "top" };
        });
        if (rowNumber > 1) row.height = 24;
      });

      // 导出
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `知识库_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("导出成功");
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败，请确保已安装 exceljs 依赖");
    }
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
  };

  // 开始编辑
  const startEdit = (item: QAItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
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

  // 清空所有数据
  const handleClearAll = () => {
    if (confirm("确定要清空所有问答数据吗？此操作不可恢复！")) {
      saveToStorage([]);
      toast.success("已清空所有数据");
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`
        flex-1 overflow-y-auto scroll-smooth
        ${isMobile ? "px-3 py-3" : "px-4 py-4"}
      `}
      >
        <div className="mx-auto space-y-4 max-w-full">
          {/* Header */}
          <div className="text-center space-y-2 py-3">
            <h1
              className={`
              font-bold bg-linear-to-r from-green-600 to-blue-600 bg-clip-text text-transparent
              ${isMobile ? "text-2xl" : "text-3xl"}
            `}
            >
              📚 知识库管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              上传、编辑和管理您的问答知识库
            </p>
          </div>

          {/* Action Buttons */}
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <CardContent className={`${isMobile ? "p-3" : "p-4"}`}>
              <div
                className={`
                flex gap-2 flex-wrap
                ${isMobile ? "justify-center" : ""}
              `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    bg-green-600 hover:bg-green-700 text-white
                    ${isMobile ? "flex-1 min-w-[140px]" : ""}
                  `}
                  size={isMobile ? "sm" : "default"}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  导入Excel
                </Button>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className={`
                    border-2
                    ${isMobile ? "flex-1 min-w-[140px]" : ""}
                  `}
                  size={isMobile ? "sm" : "default"}
                  disabled={qaList.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出Excel
                </Button>
                <Button
                  onClick={handleAdd}
                  className={`
                    bg-blue-600 hover:bg-blue-700 text-white
                    ${isMobile ? "flex-1 min-w-[140px]" : ""}
                  `}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增问答
                </Button>
                {qaList.length > 0 && (
                  <Button
                    onClick={handleClearAll}
                    variant="destructive"
                    className={isMobile ? "flex-1 min-w-[140px]" : ""}
                    size={isMobile ? "sm" : "default"}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清空所有
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QA List */}
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet
                  className={`text-green-600 ${
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  }`}
                />
                问答列表
                <span className="text-sm text-gray-500 ml-2">
                  (共 {qaList.length} 条)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {qaList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">暂无问答数据</p>
                  <p className="text-sm">请上传Excel文件或手动添加问答</p>
                </div>
              ) : (
                qaList.map((item, index) => (
                  <Card
                    key={item.id}
                    className="border-2 hover:border-blue-300 transition-colors"
                  >
                    <CardContent className={`${isMobile ? "p-3" : "p-4"}`}>
                      {editingId === item.id ? (
                        // 编辑模式
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold mb-1 block">
                              问题
                            </Label>
                            <Input
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              placeholder="请输入问题"
                              className="border-2"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold mb-1 block">
                              答案
                            </Label>
                            <Textarea
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              placeholder="请输入答案"
                              rows={4}
                              className="border-2 resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={saveEdit}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              保存
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              size="sm"
                              variant="outline"
                            >
                              <X className="h-3 w-3 mr-1" />
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 显示模式
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  Q{index + 1}
                                </span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {item.question || "(无问题)"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 ml-0 mt-2 whitespace-pre-wrap">
                                {item.answer || "(无答案)"}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                onClick={() => startEdit(item)}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="shadow-lg border-0 bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <CardContent
              className={`${
                isMobile ? "p-3" : screenType === "tablet" ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`bg-green-100 dark:bg-green-800 rounded-full ${
                    isMobile ? "p-1.5" : "p-2"
                  }`}
                >
                  <Info
                    className={`text-green-600 dark:text-green-300 ${
                      isMobile ? "h-4 w-4" : "h-5 w-5"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <h4
                    className={`font-semibold text-gray-800 dark:text-gray-200 ${
                      isMobile
                        ? "text-xs"
                        : screenType === "tablet"
                        ? "text-sm"
                        : "text-base"
                    }`}
                  >
                    使用说明
                  </h4>
                  <ul
                    className={`text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside ${
                      isMobile
                        ? "text-xs"
                        : screenType === "tablet"
                        ? "text-xs"
                        : "text-sm"
                    }`}
                  >
                    <li>
                      支持导入Excel文件，文件需包含"问题"和"答案"列（或question/answer）
                    </li>
                    <li>所有数据自动保存到浏览器本地存储</li>
                    <li>可随时编辑、删除问答，或导出为Excel文件</li>
                    <li>数据仅存储在本地，不会上传到服务器</li>
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
