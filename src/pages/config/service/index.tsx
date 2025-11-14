import {
  Download,
  CheckCircle2,
  FileDown,
  AlertCircle,
  Trash2,
  Mic,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResponsive } from "@/hooks/useResponsive";
import { useSherpaConfig } from "@/stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "@/stores/useSherpaTtsConfig.ts";
import { useChatSession } from "@/stores/useChatSession.ts";
import { useSpeakApi } from "@/stores/useSpeakApi.ts";
import { db, isDatabaseReady } from "@/lib/db/index.ts";
import { errorLogger } from "@/lib/error-logger";

export default function ConfigServicePage() {
  const { isMobile } = useResponsive();

  // Stores
  const setSherpaTtsConfig = useSherpaTtsConfig((state) => state.setConfig);
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);
  const { currentSpeakApi, setSpeakApi, speakApiList } = useSpeakApi();

  // TTS 模型下载状态
  const [matchaDownloaded, setMatchaDownloaded] = useState(false);
  const [vocoderDownloaded, setVocoderDownloaded] = useState(false);
  const [matchaDownloading, setMatchaDownloading] = useState(false);
  const [vocoderDownloading, setVocoderDownloading] = useState(false);
  const [matchaProgress, setMatchaProgress] = useState(0);
  const [vocoderProgress, setVocoderProgress] = useState(0);
  const [matchaSpeed, setMatchaSpeed] = useState(0);
  const [vocoderSpeed, setVocoderSpeed] = useState(0);
  const [matchaInfo, setMatchaInfo] = useState({ downloaded: 0, total: 0 });
  const [vocoderInfo, setVocoderInfo] = useState({ downloaded: 0, total: 0 });

  // ASR 模型下载状态
  const [asrDownloaded, setAsrDownloaded] = useState(false);
  const [asrDownloading, setAsrDownloading] = useState(false);
  const [asrProgress, setAsrProgress] = useState(0);
  const [asrSpeed, setAsrSpeed] = useState(0);
  const [asrInfo, setAsrInfo] = useState({ downloaded: 0, total: 0 });

  // 获取当前会话信息用于导出
  const currentSessionId = useChatSession((state) => state.currentSessionId);

  // MiniMax API Key 配置
  const [miniMaxApiKey, setMiniMaxApiKey] = useState("");
  const [savingApiKey, setSavingApiKey] = useState(false);

  // 错误日志统计
  const [errorStats, setErrorStats] = useState<{
    total: number;
    byType: Record<string, number>;
  }>({
    total: 0,
    byType: {},
  });

  // 导出聊天记录为JSONL格式
  const handleExportMessages = async () => {
    try {
      if (!isDatabaseReady()) {
        toast.error("数据库未准备就绪，请稍后重试");
        return;
      }

      if (!currentSessionId) {
        toast.error("当前会话未初始化");
        return;
      }

      // 获取当前会话的所有消息（包括已清除的，用于完整导出）
      const allMessages = await db.getAllSessionMessages(currentSessionId);

      if (allMessages.length === 0) {
        toast.warning("暂无聊天记录可导出");
        return;
      }

      // 转换为JSONL格式（每行一个JSON对象）
      const jsonlContent = allMessages
        .map((msg) => {
          // 标准JSONL格式，每个消息一行
          return JSON.stringify({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            uuid: msg.uuid,
            sessionId: msg.sessionId,
            date: new Date(msg.timestamp).toISOString(),
          });
        })
        .join("\n");

      // 创建Blob并下载
      const blob = new Blob([jsonlContent], {
        type: "application/x-jsonlines",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // 使用时间戳作为文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `chat-history-${timestamp}.jsonl`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`成功导出 ${allMessages.length} 条聊天记录！`);
    } catch (error) {
      console.error("导出失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "导出失败，请重试";
      toast.error(errorMessage);
    }
  };

  // 导出错误日志
  const handleExportErrors = async () => {
    try {
      if (!isDatabaseReady()) {
        toast.error("数据库未准备就绪，请稍后重试");
        return;
      }

      const errorLogs = await errorLogger.getAllLogs();

      if (errorLogs.length === 0) {
        toast.warning("暂无错误日志可导出");
        return;
      }

      // 转换为JSON格式（更易读）
      const jsonContent = JSON.stringify(errorLogs, null, 2);

      // 创建Blob并下载
      const blob = new Blob([jsonContent], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // 使用时间戳作为文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `error-logs-${timestamp}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`成功导出 ${errorLogs.length} 条错误日志！`);
    } catch (error) {
      console.error("导出错误日志失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "导出失败，请重试";
      toast.error(errorMessage);
    }
  };

  // 清除错误日志
  const handleClearErrors = async () => {
    try {
      if (!isDatabaseReady()) {
        toast.error("数据库未准备就绪，请稍后重试");
        return;
      }

      await errorLogger.clearAllLogs();
      await updateErrorStats();
      toast.success("错误日志已清除");
    } catch (error) {
      console.error("清除错误日志失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "清除失败，请重试";
      toast.error(errorMessage);
    }
  };

  // 更新错误统计
  const updateErrorStats = async () => {
    try {
      const stats = await errorLogger.getStats();
      setErrorStats(stats);
    } catch (error) {
      console.error("获取错误统计失败:", error);
    }
  };

  // 切换 TTS 服务
  const handleSpeakApiChange = async (apiName: string) => {
    try {
      await setSpeakApi(apiName);
      toast.success(`已切换到 ${apiName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`切换失败: ${errorMessage}`);
    }
  };

  // 保存 MiniMax API Key
  const saveMiniMaxApiKey = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      return toast.error("保存功能仅在 Electron 环境可用");
    }

    try {
      setSavingApiKey(true);
      const result = await electronAPI.invoke("save_minimax_config", {
        apiKey: miniMaxApiKey,
      });

      if (result.success) {
        toast.success("MiniMax API Key 保存成功！");
      } else {
        toast.error(`保存失败: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`保存失败: ${errorMessage}`);
    } finally {
      setSavingApiKey(false);
    }
  };

  // 初始化配置（仅在组件挂载时执行一次）
  useEffect(() => {
    const initializeConfig = async () => {
      // 设置固定的 TTS 配置
      setSherpaTtsConfig({
        enabled: true,
        acousticModel: "matcha-icefall-zh-baker/model-steps-3.onnx",
        lexicon: "matcha-icefall-zh-baker/lexicon.txt",
        tokens: "matcha-icefall-zh-baker/tokens.txt",
        ruleFsts:
          "matcha-icefall-zh-baker/phone.fst,matcha-icefall-zh-baker/date.fst,matcha-icefall-zh-baker/number.fst",
        vocoder: "vocos-22khz-univ.onnx",
      });

      // 设置固定的 ASR 配置
      setSherpaConfig({
        encoderPath:
          "sherpa-onnx-streaming-paraformer-bilingual-zh-en/encoder.int8.onnx",
        decoderPath:
          "sherpa-onnx-streaming-paraformer-bilingual-zh-en/decoder.int8.onnx",
        tokensPath:
          "sherpa-onnx-streaming-paraformer-bilingual-zh-en/tokens.txt",
      });

      // 检查模型下载状态
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) return;

      try {
        const [matchaResult, vocoderResult, asrResult, miniMaxConfigResult] =
          await Promise.all([
            electronAPI.invoke("check_tts_model", { modelType: "matcha" }),
            electronAPI.invoke("check_tts_model", { modelType: "vocoder" }),
            electronAPI.invoke("check_asr_model"),
            electronAPI.invoke("get_minimax_config"),
          ]);

        setMatchaDownloaded(matchaResult.downloaded);
        setVocoderDownloaded(vocoderResult.downloaded);
        setAsrDownloaded(asrResult.downloaded);

        if (miniMaxConfigResult.success) {
          setMiniMaxApiKey(miniMaxConfigResult.apiKey);
        }
      } catch (error) {
        console.error("检查模型失败:", error);
      }

      // 更新错误统计
      await updateErrorStats();
    };

    initializeConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组：只在组件挂载时执行一次

  // 下载 TTS 模型
  const downloadModel = async (modelType: "matcha" | "vocoder") => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      return toast.error("下载功能仅在 Electron 环境可用");
    }

    const setDownloading =
      modelType === "matcha" ? setMatchaDownloading : setVocoderDownloading;
    const setProgress =
      modelType === "matcha" ? setMatchaProgress : setVocoderProgress;
    const setDownloaded =
      modelType === "matcha" ? setMatchaDownloaded : setVocoderDownloaded;
    const setSpeed = modelType === "matcha" ? setMatchaSpeed : setVocoderSpeed;
    const setInfo = modelType === "matcha" ? setMatchaInfo : setVocoderInfo;

    const removeListener = electronAPI.on("download_progress", (data: any) => {
      if (data.modelType === modelType) {
        setProgress(Math.round(data.progress));
        if (data.speed !== undefined) {
          setSpeed(data.speed);
        }
        if (data.downloadedSize !== undefined && data.totalSize !== undefined) {
          setInfo({ downloaded: data.downloadedSize, total: data.totalSize });
        }
      }
    });

    try {
      setDownloading(true);
      setProgress(0);
      toast.info(
        `开始下载 ${modelType === "matcha" ? "Matcha" : "Vocoder"} 模型...`
      );

      const result = await electronAPI.invoke("download_tts_model", {
        modelType,
      });

      if (result.success) {
        setDownloaded(true);
        toast.success(
          `${modelType === "matcha" ? "Matcha" : "Vocoder"} 模型下载成功！`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`下载失败: ${errorMessage}`);
    } finally {
      if (removeListener) removeListener();
      setDownloading(false);
      setProgress(0);
      setSpeed(0);
      setInfo({ downloaded: 0, total: 0 });
    }
  };

  // 下载 ASR 模型
  const downloadASRModel = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      return toast.error("下载功能仅在 Electron 环境可用");
    }

    const removeListener = electronAPI.on("download_progress", (data: any) => {
      if (data.modelType === "asr-streaming") {
        setAsrProgress(Math.round(data.progress));
        if (data.speed !== undefined) {
          setAsrSpeed(data.speed);
        }
        if (data.downloadedSize !== undefined && data.totalSize !== undefined) {
          setAsrInfo({
            downloaded: data.downloadedSize,
            total: data.totalSize,
          });
        }
      }
    });

    try {
      setAsrDownloading(true);
      setAsrProgress(0);
      toast.info("开始下载 ASR 模型...");

      const result = await electronAPI.invoke("download_asr_model");

      if (result.success) {
        setAsrDownloaded(true);
        toast.success("ASR 模型下载成功！");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`下载失败: ${errorMessage}`);
    } finally {
      if (removeListener) removeListener();
      setAsrDownloading(false);
      setAsrProgress(0);
      setAsrSpeed(0);
      setAsrInfo({ downloaded: 0, total: 0 });
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`flex-1 overflow-y-auto ${
          isMobile ? "px-3 py-4" : "px-6 py-5"
        }`}
      >
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 py-2">
            <h1
              className={`font-bold bg-linear-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent ${
                isMobile ? "text-2xl" : "text-3xl"
              }`}
            >
              服务配置
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              下载语音识别和语音合成模型
            </p>
          </div>

          <TooltipProvider>
            <div className="space-y-6">
              {/* 语音合成服务 (TTS) - 统一区域 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    语音合成服务 (TTS)
                  </h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  {/* TTS 服务选择器 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      选择服务
                    </label>
                    <Select
                      value={currentSpeakApi}
                      onValueChange={handleSpeakApiChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择 TTS 服务" />
                      </SelectTrigger>
                      <SelectContent>
                        {speakApiList.map((api) => (
                          <SelectItem key={api.name} value={api.name}>
                            {api.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {currentSpeakApi === "MiniMax TTS"
                        ? "在线服务 · 高质量多语言 · 需要 API Key"
                        : currentSpeakApi === "Sherpa-ONNX TTS (离线)"
                        ? "本地离线 · 无需联网 · 需下载模型"
                        : ""}
                    </p>
                  </div>

                  {/* MiniMax API Key 配置 - 仅在选择 MiniMax TTS 时显示 */}
                  {currentSpeakApi === "MiniMax TTS" && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        API Key 配置
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="请输入 MiniMax API Key"
                          value={miniMaxApiKey}
                          onChange={(e) => setMiniMaxApiKey(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={saveMiniMaxApiKey}
                          disabled={savingApiKey || !miniMaxApiKey.trim()}
                          size="sm"
                        >
                          {savingApiKey ? "保存中..." : "保存"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sherpa 模型下载 - 仅在选择 Sherpa-ONNX TTS 时显示 */}
                  {currentSpeakApi === "Sherpa-ONNX TTS (离线)" && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                        模型文件下载
                      </label>

                      <div className="space-y-3">
                        {/* Matcha 模型 */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Matcha 声学模型
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ~80MB
                                </span>
                              </div>
                            </div>
                            {matchaDownloaded ? (
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm">已下载</span>
                              </div>
                            ) : (
                              <Button
                                onClick={() => downloadModel("matcha")}
                                disabled={matchaDownloading}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                {matchaDownloading
                                  ? `${matchaProgress}%`
                                  : "下载"}
                              </Button>
                            )}
                          </div>
                          {matchaDownloading && (
                            <div className="mt-2 space-y-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${matchaProgress}%` }}
                                />
                              </div>
                              {matchaSpeed > 0 && (
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    {matchaInfo.downloaded.toFixed(2)} MB /{" "}
                                    {matchaInfo.total.toFixed(2)} MB
                                  </span>
                                  <span>{matchaSpeed.toFixed(2)} KB/s</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Vocoder 模型 */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Vocoder 模型
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ~45MB
                                </span>
                              </div>
                            </div>
                            {vocoderDownloaded ? (
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm">已下载</span>
                              </div>
                            ) : (
                              <Button
                                onClick={() => downloadModel("vocoder")}
                                disabled={vocoderDownloading}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                {vocoderDownloading
                                  ? `${vocoderProgress}%`
                                  : "下载"}
                              </Button>
                            )}
                          </div>
                          {vocoderDownloading && (
                            <div className="mt-2 space-y-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${vocoderProgress}%` }}
                                />
                              </div>
                              {vocoderSpeed > 0 && (
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <span>
                                    {vocoderInfo.downloaded.toFixed(2)} MB /{" "}
                                    {vocoderInfo.total.toFixed(2)} MB
                                  </span>
                                  <span>{vocoderSpeed.toFixed(2)} KB/s</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        模型会自动保存到应用数据目录，下载完成后自动启用
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 数据导出 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    数据导出
                  </h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* 聊天记录导出 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          导出聊天记录 (JSONL)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          导出所有历史聊天记录，包括已清除的对话
                        </p>
                      </div>
                      <Button
                        onClick={handleExportMessages}
                        size="sm"
                        variant="outline"
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" />
                        导出
                      </Button>
                    </div>
                  </div>

                  {/* 错误日志导出 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            导出错误日志 (JSON)
                          </h4>
                          {errorStats.total > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              {errorStats.total} 条错误
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          应用运行期间的所有错误会自动记录，用于排错和改进
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {errorStats.total > 0 && (
                          <Button
                            onClick={handleClearErrors}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            清除
                          </Button>
                        )}
                        <Button
                          onClick={handleExportErrors}
                          size="sm"
                          variant="outline"
                          disabled={errorStats.total === 0}
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1.5" />
                          导出
                        </Button>
                      </div>
                    </div>
                    {errorStats.total > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(errorStats.byType).map(
                          ([type, count]) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {type}: {count}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 语音识别 ASR 模型 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    语音识别模型 (ASR)
                  </h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Paraformer 流式模型
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ~70MB · 支持中英文
                        </span>
                      </div>
                    </div>
                    {asrDownloaded ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">已下载</span>
                      </div>
                    ) : (
                      <Button
                        onClick={downloadASRModel}
                        disabled={asrDownloading}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {asrDownloading ? `${asrProgress}%` : "下载"}
                      </Button>
                    )}
                  </div>
                  {asrDownloading && (
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${asrProgress}%` }}
                        />
                      </div>
                      {asrSpeed > 0 && (
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {asrInfo.downloaded.toFixed(2)} MB /{" "}
                            {asrInfo.total.toFixed(2)} MB
                          </span>
                          <span>{asrSpeed.toFixed(2)} KB/s</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  模型会自动保存到应用数据目录，下载完成后自动启用
                </p>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
