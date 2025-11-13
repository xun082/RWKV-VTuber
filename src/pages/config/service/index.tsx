import { Shield, Download, CheckCircle2, FileDown } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResponsive } from "@/hooks/useResponsive";
import { useSherpaConfig } from "@/stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "@/stores/useSherpaTtsConfig.ts";
import { useChatApi } from "@/stores/useChatApi.ts";
import { useChatSession } from "@/stores/useChatSession.ts";
import { db, isDatabaseReady } from "@/lib/db/index.ts";

// 固定配置
const FIXED_MODEL_NAME = "deepseek-ai/DeepSeek-V3";

export default function ConfigServicePage() {
  const { isMobile } = useResponsive();

  // Stores
  const setSherpaTtsConfig = useSherpaTtsConfig((state) => state.setConfig);
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);
  const chatApi = useChatApi();

  // API Key 状态
  const [apiKeyValue, setApiKeyValue] = useState(chatApi.apiKey);
  const [apiKeyModified, setApiKeyModified] = useState(false);

  // TTS 模型下载状态
  const [matchaDownloaded, setMatchaDownloaded] = useState(false);
  const [vocoderDownloaded, setVocoderDownloaded] = useState(false);
  const [matchaDownloading, setMatchaDownloading] = useState(false);
  const [vocoderDownloading, setVocoderDownloading] = useState(false);
  const [matchaProgress, setMatchaProgress] = useState(0);
  const [vocoderProgress, setVocoderProgress] = useState(0);

  // ASR 模型下载状态
  const [asrDownloaded, setAsrDownloaded] = useState(false);
  const [asrDownloading, setAsrDownloading] = useState(false);
  const [asrProgress, setAsrProgress] = useState(0);

  // 获取当前会话信息用于导出
  const currentSessionId = useChatSession((state) => state.currentSessionId);

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

      // 获取当前会话的所有消息（包括已清除的）
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
      toast.error(error instanceof Error ? error.message : "导出失败，请重试");
    }
  };

  // 同步 API Key
  useEffect(() => {
    setApiKeyValue(chatApi.apiKey);
  }, [chatApi.apiKey]);

  // 初始化配置（仅在组件挂载时执行一次）
  useEffect(() => {
    const initializeConfig = async () => {
      // 设置固定的 API 配置
      await chatApi.setModelName(FIXED_MODEL_NAME);

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
        const [matchaResult, vocoderResult, asrResult] = await Promise.all([
          electronAPI.invoke("check_tts_model", { modelType: "matcha" }),
          electronAPI.invoke("check_tts_model", { modelType: "vocoder" }),
          electronAPI.invoke("check_asr_model"),
        ]);

        setMatchaDownloaded(matchaResult.downloaded);
        setVocoderDownloaded(vocoderResult.downloaded);
        setAsrDownloaded(asrResult.downloaded);
      } catch (error) {
        console.error("检查模型失败:", error);
      }
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

    const removeListener = electronAPI.on("download_progress", (data: any) => {
      if (data.modelType === modelType) {
        setProgress(data.progress);
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
      toast.error(
        `下载失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      if (removeListener) removeListener();
      setDownloading(false);
      setProgress(0);
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
        setAsrProgress(data.progress);
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
      toast.error(
        `下载失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      if (removeListener) removeListener();
      setAsrDownloading(false);
      setAsrProgress(0);
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
              配置 API 密钥并下载所需模型
            </p>
          </div>

          <TooltipProvider>
            <div className="space-y-6">
              {/* API 密钥配置 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    API 密钥
                  </h2>
                  <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
                    必填
                  </span>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        硅基流动 API 密钥 ({FIXED_MODEL_NAME})
                      </label>
                      {apiKeyModified && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          未保存
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={apiKeyValue}
                      onChange={(e) => {
                        setApiKeyValue(e.target.value);
                        setApiKeyModified(true);
                      }}
                      placeholder="请输入硅基流动 API 密钥"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!apiKeyValue) return toast.error("请输入 API 密钥");
                        await chatApi.setApiKey(apiKeyValue);
                        setApiKeyModified(false);
                        toast.success("API 密钥已保存");
                      }}
                      disabled={!apiKeyModified}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      保存
                    </Button>
                    <Button
                      onClick={async () => {
                        setApiKeyValue("");
                        await chatApi.setApiKey("");
                        setApiKeyModified(false);
                        toast.success("API 密钥已清空");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      清空
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    前往{" "}
                    <a
                      href="https://cloud.siliconflow.cn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      硅基流动官网
                    </a>{" "}
                    注册并获取 API 密钥
                  </p>
                </div>
              </div>

              {/* 语音合成 TTS 模型 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    语音合成模型 (TTS)
                  </h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Matcha 模型 */}
                  <div className="p-4">
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
                          {matchaDownloading ? `${matchaProgress}%` : "下载"}
                        </Button>
                      )}
                    </div>
                    {matchaDownloading && (
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${matchaProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Vocoder 模型 */}
                  <div className="p-4">
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
                          {vocoderDownloading ? `${vocoderProgress}%` : "下载"}
                        </Button>
                      )}
                    </div>
                    {vocoderDownloading && (
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${vocoderProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  模型会自动保存到应用数据目录，下载完成后自动启用
                </p>
              </div>

              {/* 数据导出 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    数据导出
                  </h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        导出聊天记录 (JSONL)
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        您的对话会自动保存，可随时导出为 JSONL 格式
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
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${asrProgress}%` }}
                      />
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
