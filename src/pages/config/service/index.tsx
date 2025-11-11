import { Shield, Download, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfigSection, ConfigInput } from "@/components/config";
import { useResponsive } from "@/hooks/useResponsive";
import { useSherpaConfig } from "@/stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "@/stores/useSherpaTtsConfig.ts";
import { useChatApi } from "@/stores/useChatApi.ts";

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
        className={`flex-1 overflow-y-auto scroll-smooth ${
          isMobile ? "px-3 py-3" : "px-4 py-4"
        }`}
      >
        <div className="mx-auto max-w-full space-y-4">
          {/* Header */}
          <div className="text-center space-y-2 py-2">
            <h1
              className={`font-bold bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent ${
                isMobile ? "text-2xl" : "text-3xl"
              }`}
            >
              🔧 服务配置
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              配置 API 密钥并下载所需模型
            </p>
          </div>

          <TooltipProvider>
            <div className="space-y-4">
              {/* API 密钥配置 */}
              <ConfigSection
                icon={<span className="text-3xl">🔑</span>}
                title="硅基流动 API 密钥"
                subtitle={`使用 ${FIXED_MODEL_NAME} 模型`}
                colorClass="from-purple-500 to-indigo-500"
                isMobile={isMobile}
              >
                <ConfigInput
                  icon={Shield}
                  label="API 密钥"
                  badge="必填"
                  value={apiKeyValue}
                  onChange={(value) => {
                    setApiKeyValue(value);
                    setApiKeyModified(true);
                  }}
                  placeholder="请输入硅基流动 API 密钥"
                  type="password"
                  color="blue"
                  isModified={apiKeyModified}
                  onReset={async () => {
                    setApiKeyValue("");
                    await chatApi.setApiKey("");
                    setApiKeyModified(false);
                    toast.success("API 密钥已清空");
                  }}
                  onSave={async () => {
                    if (!apiKeyValue) return toast.error("请输入 API 密钥");
                    await chatApi.setApiKey(apiKeyValue);
                    setApiKeyModified(false);
                    toast.success("API 密钥已保存");
                  }}
                  isMobile={isMobile}
                />

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <span>
                      前往{" "}
                      <a
                        href="https://cloud.siliconflow.cn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                      >
                        硅基流动官网
                      </a>{" "}
                      注册并获取 API 密钥
                    </span>
                  </p>
                </div>
              </ConfigSection>

              {/* 语音合成 TTS 模型 */}
              <ConfigSection
                icon={<span className="text-3xl">🎵</span>}
                title="语音合成模型 (TTS)"
                subtitle="下载本地语音合成模型文件"
                colorClass="from-green-500 to-emerald-500"
                isMobile={isMobile}
              >
                <div className="space-y-3">
                  {/* Matcha 模型 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Matcha 声学模型
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ~80MB
                        </p>
                      </div>
                      {matchaDownloaded ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">已下载</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => downloadModel("matcha")}
                          disabled={matchaDownloading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {matchaDownloading ? "下载中..." : "下载"}
                        </Button>
                      )}
                    </div>
                    {matchaDownloading && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${matchaProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Vocoder 模型 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Vocoder 模型
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ~45MB
                        </p>
                      </div>
                      {vocoderDownloaded ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">已下载</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => downloadModel("vocoder")}
                          disabled={vocoderDownloading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {vocoderDownloading ? "下载中..." : "下载"}
                        </Button>
                      )}
                    </div>
                    {vocoderDownloading && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${vocoderProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-green-500">💡</span>
                      <span>
                        模型会自动保存到应用数据目录，下载完成后自动启用
                      </span>
                    </p>
                  </div>
                </div>
              </ConfigSection>

              {/* 语音识别 ASR 模型 */}
              <ConfigSection
                icon={<span className="text-3xl">🎤</span>}
                title="语音识别模型 (ASR)"
                subtitle="下载本地语音识别模型文件"
                colorClass="from-blue-500 to-cyan-500"
                isMobile={isMobile}
              >
                <div className="space-y-3">
                  {/* ASR 模型 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Paraformer 流式模型
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ~70MB · 支持中英文
                        </p>
                      </div>
                      {asrDownloaded ? (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">已下载</span>
                        </div>
                      ) : (
                        <Button
                          onClick={downloadASRModel}
                          disabled={asrDownloading}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {asrDownloading ? "下载中..." : "下载"}
                        </Button>
                      )}
                    </div>
                    {asrDownloading && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${asrProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500">💡</span>
                      <span>
                        模型会自动保存到应用数据目录，下载完成后自动启用
                      </span>
                    </p>
                  </div>
                </div>
              </ConfigSection>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
