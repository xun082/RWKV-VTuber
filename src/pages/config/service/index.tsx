import {
  Info,
  RotateCcw,
  Save,
  Cpu,
  Globe,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ConfigSection,
  ConfigInput,
  ModelDownloadCard,
  InfoCard,
  ParameterSlider,
} from "@/components/config";
import { useResponsive } from "@/hooks/useResponsive";
import { useSpeakApi } from "@/stores/useSpeakApi.ts";
import { useSherpaConfig } from "@/stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "@/stores/useSherpaTtsConfig.ts";
import { validateSherpaTTSConfig } from "@/lib/api/electron/api.sherpa-tts";
import { useChatApi } from "@/stores/useChatApi.ts";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";

const BUTTON_HEIGHT_CLASS = (isMobile: boolean) => (isMobile ? "h-10" : "h-11");

export default function ConfigServicePage() {
  const { isMobile } = useResponsive();
  const testSpeak = useSpeakApi((state) => state.testSpeak);
  const { checkForUpdates, updateInfo, updateAvailable } = useAutoUpdater();

  // Sherpa-ONNX TTS
  const sherpaTtsConfig = useSherpaTtsConfig((state) => state.config);
  const setSherpaTtsConfig = useSherpaTtsConfig((state) => state.setConfig);
  const resetSherpaTtsConfig = useSherpaTtsConfig((state) => state.resetConfig);

  // Sherpa ASR Config
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);

  // Chat API Config
  const {
    openaiEndpoint,
    openaiApiKey,
    openaiModelName,
    setOpenaiEndpoint,
    setOpenaiApiKey,
    setOpenaiModelName,
  } = useChatApi();

  // API配置状态
  const [endpointValue, setEndpointValue] = useState(openaiEndpoint);
  const [apiKeyValue, setApiKeyValue] = useState(openaiApiKey);
  const [modelNameValue, setModelNameValue] = useState(openaiModelName);
  const [openaiEndpointModified, setOpenaiEndpointModified] = useState(false);
  const [openaiApiKeyModified, setOpenaiApiKeyModified] = useState(false);
  const [openaiModelNameModified, setOpenaiModelNameModified] = useState(false);
  const [sherpaTtsConfigModified, setSherpaTtsConfigModified] = useState(false);

  // 模型下载状态
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

  // Sync form values with store values
  useEffect(() => setEndpointValue(openaiEndpoint), [openaiEndpoint]);
  useEffect(() => setApiKeyValue(openaiApiKey), [openaiApiKey]);
  useEffect(() => setModelNameValue(openaiModelName), [openaiModelName]);

  const isLocalEndpoint = (url: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?/i.test(url || "");

  const testSherpaTtsConnection = async () => {
    const errors = validateSherpaTTSConfig(sherpaTtsConfig);
    if (errors.length > 0) {
      return toast.error(`配置错误: ${errors[0]}`);
    }
    if (!sherpaTtsConfig.enabled) {
      return toast.error("请先启用 Sherpa-ONNX TTS 服务");
    }

    try {
      toast.info("正在测试连接...");
      if (testSpeak) {
        await testSpeak();
        toast.success("🎉 Sherpa-ONNX TTS 连接测试成功！");
      } else {
        throw new Error("测试服务不可用");
      }
    } catch (error) {
      toast.error(
        `连接测试失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  };

  const saveSherpaTtsConfig = async () => {
    const errors = validateSherpaTTSConfig(sherpaTtsConfig);
    if (errors.length > 0) {
      return toast.error(`配置错误: ${errors[0]}`);
    }

    try {
      await setSherpaTtsConfig(sherpaTtsConfig);
      setSherpaTtsConfigModified(false);
      toast.success("Sherpa-ONNX TTS 配置已保存");
    } catch (error) {
      toast.error("保存配置失败");
    }
  };

  const checkModelsDownloaded = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    try {
      const [matchaResult, vocoderResult] = await Promise.all([
        electronAPI.invoke("check_tts_model", { modelType: "matcha" }),
        electronAPI.invoke("check_tts_model", { modelType: "vocoder" }),
      ]);

      setMatchaDownloaded(matchaResult.downloaded);
      setVocoderDownloaded(vocoderResult.downloaded);

      if (matchaResult.downloaded) {
        setSherpaTtsConfig({
          acousticModel: "matcha-icefall-zh-baker/model-steps-3.onnx",
          lexicon: "matcha-icefall-zh-baker/lexicon.txt",
          tokens: "matcha-icefall-zh-baker/tokens.txt",
          ruleFsts:
            "matcha-icefall-zh-baker/phone.fst,matcha-icefall-zh-baker/date.fst,matcha-icefall-zh-baker/number.fst",
        });
      }

      if (vocoderResult.downloaded) {
        setSherpaTtsConfig({ vocoder: "vocos-22khz-univ.onnx" });
      }
    } catch (error) {
      console.error("检查模型失败:", error);
    }
  };

  const checkASRModelDownloaded = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    try {
      const result = await electronAPI.invoke("check_asr_model");
      setAsrDownloaded(result.downloaded);

      if (result.downloaded) {
        setSherpaConfig({
          encoderPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/encoder.int8.onnx",
          decoderPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/decoder.int8.onnx",
          tokensPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/tokens.txt",
        });
      }
    } catch (error) {
      console.error("检查 ASR 模型失败:", error);
    }
  };

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
        `开始下载 ${
          modelType === "matcha" ? "Matcha" : "Vocoder"
        } 模型，请稍候...`
      );

      const result = await electronAPI.invoke("download_tts_model", {
        modelType,
      });

      if (result.success) {
        setDownloaded(true);
        toast.success(
          `${modelType === "matcha" ? "Matcha" : "Vocoder"} 模型下载成功！`
        );

        if (modelType === "matcha") {
          setSherpaTtsConfig({
            acousticModel: "matcha-icefall-zh-baker/model-steps-3.onnx",
            lexicon: "matcha-icefall-zh-baker/lexicon.txt",
            tokens: "matcha-icefall-zh-baker/tokens.txt",
            ruleFsts:
              "matcha-icefall-zh-baker/phone.fst,matcha-icefall-zh-baker/date.fst,matcha-icefall-zh-baker/number.fst",
          });
        } else {
          setSherpaTtsConfig({ vocoder: "vocos-22khz-univ.onnx" });
        }
        setSherpaTtsConfigModified(true);
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
      toast.info("开始下载 ASR 流式模型，请稍候...");

      const result = await electronAPI.invoke("download_asr_model");

      if (result.success) {
        setAsrDownloaded(true);
        toast.success("ASR 流式模型下载成功！");
        setSherpaConfig({
          encoderPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/encoder.int8.onnx",
          decoderPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/decoder.int8.onnx",
          tokensPath:
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en/tokens.txt",
        });
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

  useEffect(() => {
    checkModelsDownloaded();
    checkASRModelDownloaded();
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`flex-1 overflow-y-auto scroll-smooth ${
          isMobile ? "px-3 py-4" : "px-6 py-6"
        }`}
      >
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 py-4">
            <h1
              className={`font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${
                isMobile ? "text-3xl" : "text-4xl"
              }`}
            >
              🔧 服务配置
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              配置 AI 推理服务和本地语音服务
            </p>
          </div>

          <TooltipProvider>
            <div className={`${isMobile ? "space-y-5" : "space-y-6"}`}>
              {/* AI 推理服务配置 */}
              <ConfigSection
                icon={<span className="text-3xl">⚙️</span>}
                title="AI 推理服务"
                subtitle="配置 OpenAI 兼容的推理接口"
                colorClass="from-purple-500 to-indigo-500"
                isMobile={isMobile}
              >
                <ConfigInput
                  icon={Globe}
                  label="推理服务地址"
                  badge="OpenAI Endpoint"
                  value={endpointValue}
                  onChange={(value) => {
                    setEndpointValue(value);
                    setOpenaiEndpointModified(true);
                  }}
                  placeholder="请输入推理服务地址"
                  color="green"
                  isModified={openaiEndpointModified}
                  onReset={async () => {
                    await setOpenaiEndpoint();
                    setEndpointValue("https://api.deepseek.com/");
                    setOpenaiEndpointModified(false);
                    toast.success("推理服务地址已恢复默认值");
                  }}
                  onSave={async () => {
                    if (!endpointValue)
                      return toast.error("请输入推理服务地址");
                    await setOpenaiEndpoint(
                      endpointValue.endsWith("/")
                        ? endpointValue
                        : `${endpointValue}/`
                    );
                    setOpenaiEndpointModified(false);
                    toast.success("推理服务地址已更新");
                  }}
                  isMobile={isMobile}
                />

                <ConfigInput
                  icon={Shield}
                  label="推理服务密钥"
                  badge={
                    isLocalEndpoint(endpointValue)
                      ? "OpenAI API Key（可留空）"
                      : "OpenAI API Key"
                  }
                  value={apiKeyValue}
                  onChange={(value) => {
                    setApiKeyValue(value);
                    setOpenaiApiKeyModified(true);
                  }}
                  placeholder={
                    isLocalEndpoint(endpointValue)
                      ? "本地模型无需密钥，可留空"
                      : "请输入推理服务密钥"
                  }
                  type="password"
                  color="blue"
                  isModified={openaiApiKeyModified}
                  onReset={async () => {
                    await setOpenaiApiKey();
                    setApiKeyValue("");
                    setOpenaiApiKeyModified(false);
                    toast.success("推理服务密钥已恢复默认值");
                  }}
                  onSave={async () => {
                    const isLocal = isLocalEndpoint(endpointValue);
                    if (!apiKeyValue && !isLocal)
                      return toast.error("请输入推理服务密钥");
                    await setOpenaiApiKey(apiKeyValue);
                    setOpenaiApiKeyModified(false);
                    toast.success(
                      isLocal
                        ? "已保存（本地模型可留空）"
                        : "推理服务密钥已更新"
                    );
                  }}
                  isMobile={isMobile}
                />

                <ConfigInput
                  icon={Cpu}
                  label="推理服务模型"
                  badge="OpenAI Model Name"
                  value={modelNameValue}
                  onChange={(value) => {
                    setModelNameValue(value);
                    setOpenaiModelNameModified(true);
                  }}
                  placeholder="请输入推理服务模型"
                  color="purple"
                  isModified={openaiModelNameModified}
                  onReset={async () => {
                    await setOpenaiModelName();
                    setModelNameValue("deepseek-chat");
                    setOpenaiModelNameModified(false);
                    toast.success("推理服务模型已恢复默认值");
                  }}
                  onSave={async () => {
                    if (!modelNameValue)
                      return toast.error("请输入推理服务模型");
                    await setOpenaiModelName(modelNameValue);
                    setOpenaiModelNameModified(false);
                    toast.success("推理服务模型已更新");
                  }}
                  isMobile={isMobile}
                />
              </ConfigSection>

              {/* 语音合成 TTS 配置 */}
              <ConfigSection
                icon={<span className="text-3xl">🎵</span>}
                title="语音合成 (TTS)"
                subtitle="本地离线文本转语音服务"
                colorClass="from-green-500 to-emerald-500"
                isMobile={isMobile}
              >
                {/* 模型下载区域 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    📦 模型文件管理
                  </h4>

                  <ModelDownloadCard
                    title="Matcha 声学模型"
                    downloaded={matchaDownloaded}
                    downloading={matchaDownloading}
                    progress={matchaProgress}
                    size="~80MB"
                    onDownload={() => downloadModel("matcha")}
                  />

                  <ModelDownloadCard
                    title="Vocoder 模型"
                    downloaded={vocoderDownloaded}
                    downloading={vocoderDownloading}
                    progress={vocoderProgress}
                    size="~45MB"
                    onDownload={() => downloadModel("vocoder")}
                  />

                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 提示：下载完成后会自动填充模型路径
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sherpa-tts-enabled"
                      checked={sherpaTtsConfig.enabled}
                      onChange={(e) => {
                        setSherpaTtsConfig({ enabled: e.target.checked });
                        setSherpaTtsConfigModified(true);
                      }}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor="sherpa-tts-enabled"
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      启用 Sherpa-ONNX TTS 服务
                    </label>
                  </div>

                  <InfoCard
                    icon="📂"
                    title="模型存储位置"
                    content={
                      <>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          下载的模型文件会自动保存到应用数据目录：
                        </p>
                        <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block break-all">
                          ~/Library/Application Support/RWKV-VTuber/tts-models/
                        </code>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          💡 模型下载完成后会自动配置，无需手动设置
                        </p>
                      </>
                    }
                  />
                </div>

                {/* 语音参数 */}
                <div className="rounded-xl border border-green-200/40 dark:border-green-900/30 bg-green-50/40 dark:bg-green-900/10 p-3 sm:p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <ParameterSlider
                      label={`语速: ${sherpaTtsConfig.speed.toFixed(1)}x`}
                      value={sherpaTtsConfig.speed}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      color="green"
                      leftLabel="0.5x"
                      rightLabel="2.0x"
                      formatValue={(v) => `${v.toFixed(1)}x`}
                      onChange={(v) => {
                        setSherpaTtsConfig({ speed: v });
                        setSherpaTtsConfigModified(true);
                      }}
                    />

                    <ParameterSlider
                      label={`噪声比例: ${sherpaTtsConfig.noiseScale.toFixed(
                        3
                      )}`}
                      value={sherpaTtsConfig.noiseScale}
                      min={0.1}
                      max={1.0}
                      step={0.001}
                      color="blue"
                      leftLabel="0.1"
                      rightLabel="1.0"
                      formatValue={(v) => v.toFixed(3)}
                      onChange={(v) => {
                        setSherpaTtsConfig({ noiseScale: v });
                        setSherpaTtsConfigModified(true);
                      }}
                    />

                    <ParameterSlider
                      label={`长度比例: ${sherpaTtsConfig.lengthScale.toFixed(
                        2
                      )}`}
                      value={sherpaTtsConfig.lengthScale}
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      color="purple"
                      leftLabel="0.5"
                      rightLabel="2.0"
                      formatValue={(v) => v.toFixed(2)}
                      onChange={(v) => {
                        setSherpaTtsConfig({ lengthScale: v });
                        setSherpaTtsConfigModified(true);
                      }}
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={saveSherpaTtsConfig}
                    disabled={!sherpaTtsConfigModified}
                    className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-medium transition-all ${BUTTON_HEIGHT_CLASS(
                      isMobile
                    )} ${
                      !sherpaTtsConfigModified
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </Button>
                  <Button
                    onClick={testSherpaTtsConnection}
                    disabled={
                      !sherpaTtsConfig.enabled ||
                      !matchaDownloaded ||
                      !vocoderDownloaded
                    }
                    className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all ${BUTTON_HEIGHT_CLASS(
                      isMobile
                    )}`}
                  >
                    <Info className="w-4 h-4 mr-2" />
                    测试连接
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await resetSherpaTtsConfig();
                      setSherpaTtsConfigModified(true);
                      toast.success("Sherpa-ONNX TTS 配置已重置");
                    }}
                    className={`flex-1 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-all ${BUTTON_HEIGHT_CLASS(
                      isMobile
                    )}`}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    恢复默认
                  </Button>
                </div>
              </ConfigSection>

              {/* 语音识别 ASR 配置 */}
              <ConfigSection
                icon={<span className="text-3xl">🎤</span>}
                title="语音识别 (ASR)"
                subtitle="实时流式语音转文本服务"
                colorClass="from-blue-500 to-cyan-500"
                isMobile={isMobile}
              >
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    📦 ASR 模型文件管理
                  </h4>

                  <ModelDownloadCard
                    title="流式 Paraformer 模型"
                    downloaded={asrDownloaded}
                    downloading={asrDownloading}
                    progress={asrProgress}
                    size="~70MB"
                    onDownload={downloadASRModel}
                  />

                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 提示：下载完成后会自动填充模型路径
                  </p>
                </div>

                <InfoCard
                  icon="📂"
                  title="模型存储位置"
                  content={
                    <>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        下载的模型文件会自动保存到应用数据目录：
                      </p>
                      <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block break-all">
                        ~/Library/Application Support/RWKV-VTuber/asr-models/
                      </code>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        💡 模型下载完成后会自动配置，无需手动设置
                      </p>
                    </>
                  }
                />
              </ConfigSection>

              {/* 系统设置 - 仅在 Electron 环境显示 */}
              {window.electron && (
                <ConfigSection
                  icon={<span className="text-3xl">⚙️</span>}
                  title="系统设置"
                  subtitle="应用版本和更新管理"
                  colorClass="from-gray-500 to-slate-500"
                  isMobile={isMobile}
                >
                  <InfoCard
                    icon="ℹ️"
                    title="应用信息"
                    content={
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            当前版本
                          </span>
                          <code className="text-sm font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                            v1.2.0
                          </code>
                        </div>
                        {updateAvailable && updateInfo && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-600 dark:text-green-400">
                              最新版本
                            </span>
                            <code className="text-sm font-mono bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
                              v{updateInfo.version}
                            </code>
                          </div>
                        )}
                      </div>
                    }
                  />

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={checkForUpdates}
                      className={`w-full gap-2 ${BUTTON_HEIGHT_CLASS(
                        isMobile
                      )}`}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                      检查更新
                    </Button>

                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      💡 提示：应用会在启动时自动检查更新
                    </p>
                  </div>

                  <InfoCard
                    icon="🔄"
                    title="自动更新说明"
                    content={
                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                        <p>• 应用启动时会自动检查 GitHub Release 上的更新</p>
                        <p>
                          • 发现新版本时会显示通知，您可以选择立即下载或稍后更新
                        </p>
                        <p>• 下载完成后可选择立即重启安装或在退出时自动安装</p>
                        <p>• 更新过程完全自动化，无需手动操作</p>
                      </div>
                    }
                  />
                </ConfigSection>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
