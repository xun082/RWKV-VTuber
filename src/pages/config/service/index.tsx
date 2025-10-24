import { Info, RotateCcw, Save, Download, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Slider } from "../../../components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { useResponsive } from "../../../hooks/useResponsive";
import { useSpeakApi } from "../../../stores/useSpeakApi.ts";
import { useSherpaConfig } from "../../../stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "../../../stores/useSherpaTtsConfig.ts";
import { validateSherpaTTSConfig } from "../../../lib/api/electron/api.sherpa-tts";

export default function ConfigServicePage() {
  const { isMobile } = useResponsive();

  // TTS Service
  const testSpeak = useSpeakApi((state) => state.testSpeak);

  // Sherpa-ONNX TTS
  const sherpaTtsConfig = useSherpaTtsConfig((state) => state.config);
  const setSherpaTtsConfig = useSherpaTtsConfig((state) => state.setConfig);
  const resetSherpaTtsConfig = useSherpaTtsConfig((state) => state.resetConfig);

  // Sherpa ASR Config
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);

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

  // 测试 Sherpa-ONNX TTS 连接
  const testSherpaTtsConnection = async () => {
    const errors = validateSherpaTTSConfig(sherpaTtsConfig);
    if (errors.length > 0) {
      toast.error(`配置错误: ${errors[0]}`);
      return;
    }

    if (!sherpaTtsConfig.enabled) {
      toast.error("请先启用 Sherpa-ONNX TTS 服务");
      return;
    }

    try {
      toast.info("正在测试连接...");
      console.log("开始测试 Sherpa-ONNX TTS 连接...");

      if (testSpeak) {
        await testSpeak();
        toast.success("🎉 Sherpa-ONNX TTS 连接测试成功！");
        console.log("✅ Sherpa-ONNX TTS 连接测试成功");
      } else {
        throw new Error("测试服务不可用");
      }
    } catch (error) {
      console.error("Sherpa-ONNX TTS 连接测试失败:", error);
      toast.error(
        `连接测试失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  };

  // 保存 Sherpa-ONNX TTS 配置
  const saveSherpaTtsConfig = async () => {
    const errors = validateSherpaTTSConfig(sherpaTtsConfig);
    if (errors.length > 0) {
      toast.error(`配置错误: ${errors[0]}`);
      return;
    }

    try {
      await setSherpaTtsConfig(sherpaTtsConfig);
      setSherpaTtsConfigModified(false);
      toast.success("Sherpa-ONNX TTS 配置已保存");
    } catch (error) {
      console.error("保存 Sherpa-ONNX TTS 配置失败:", error);
      toast.error("保存配置失败");
    }
  };

  // 检查模型是否已下载
  const checkModelsDownloaded = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    try {
      const matchaResult = await electronAPI.invoke("check_tts_model", {
        modelType: "matcha",
      });
      const vocoderResult = await electronAPI.invoke("check_tts_model", {
        modelType: "vocoder",
      });

      setMatchaDownloaded(matchaResult.downloaded);
      setVocoderDownloaded(vocoderResult.downloaded);

      // 如果模型已下载，自动填充路径（使用相对路径）
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
        setSherpaTtsConfig({
          vocoder: "vocos-22khz-univ.onnx",
        });
      }
    } catch (error) {
      console.error("检查模型失败:", error);
    }
  };

  // 检查 ASR 模型是否已下载
  const checkASRModelDownloaded = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    try {
      const result = await electronAPI.invoke("check_asr_model");
      setAsrDownloaded(result.downloaded);

      // 如果模型已下载，自动填充路径（使用相对路径）
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

  // 下载模型
  const downloadModel = async (modelType: "matcha" | "vocoder") => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      toast.error("下载功能仅在 Electron 环境可用");
      return;
    }

    // 设置下载进度监听器
    const removeListener = electronAPI.on("download_progress", (data: any) => {
      if (data.modelType === modelType) {
        if (modelType === "matcha") {
          setMatchaProgress(data.progress);
        } else {
          setVocoderProgress(data.progress);
        }
      }
    });

    try {
      if (modelType === "matcha") {
        setMatchaDownloading(true);
        setMatchaProgress(0);
        toast.info("开始下载 Matcha 模型，请稍候...");
      } else {
        setVocoderDownloading(true);
        setVocoderProgress(0);
        toast.info("开始下载 Vocoder 模型，请稍候...");
      }

      const result = await electronAPI.invoke("download_tts_model", {
        modelType,
      });

      if (result.success) {
        if (modelType === "matcha") {
          setMatchaDownloaded(true);
          toast.success("Matcha 模型下载成功！");

          // 自动填充路径（使用相对路径）
          setSherpaTtsConfig({
            acousticModel: "matcha-icefall-zh-baker/model-steps-3.onnx",
            lexicon: "matcha-icefall-zh-baker/lexicon.txt",
            tokens: "matcha-icefall-zh-baker/tokens.txt",
            ruleFsts:
              "matcha-icefall-zh-baker/phone.fst,matcha-icefall-zh-baker/date.fst,matcha-icefall-zh-baker/number.fst",
          });
          setSherpaTtsConfigModified(true);
        } else {
          setVocoderDownloaded(true);
          toast.success("Vocoder 模型下载成功！");

          // 自动填充路径（使用相对路径）
          setSherpaTtsConfig({
            vocoder: "vocos-22khz-univ.onnx",
          });
          setSherpaTtsConfigModified(true);
        }
      }
    } catch (error) {
      console.error("下载模型失败:", error);
      toast.error(
        `下载失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      // 清理监听器
      if (removeListener) {
        removeListener();
      }

      if (modelType === "matcha") {
        setMatchaDownloading(false);
        setMatchaProgress(0);
      } else {
        setVocoderDownloading(false);
        setVocoderProgress(0);
      }
    }
  };

  // 下载 ASR 模型
  const downloadASRModel = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      toast.error("下载功能仅在 Electron 环境可用");
      return;
    }

    // 设置下载进度监听器
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

        // 自动填充路径（使用相对路径）
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
      console.error("下载 ASR 模型失败:", error);
      toast.error(
        `下载失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      // 清理监听器
      if (removeListener) {
        removeListener();
      }

      setAsrDownloading(false);
      setAsrProgress(0);
    }
  };

  // 页面加载时检查模型
  useEffect(() => {
    checkModelsDownloaded();
    checkASRModelDownloaded();
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30">
      <div
        className={`flex-1 overflow-y-auto scroll-smooth ${
          isMobile ? "px-3 py-4" : "px-6 py-8"
        }`}
      >
        <div className="mx-auto max-w-5xl space-y-6">
          {/* 优化后的 Header */}
          <div className="text-center space-y-3 py-4">
            <h1
              className={`font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${
                isMobile ? "text-3xl" : "text-4xl"
              }`}
            >
              🎙️ 语音服务配置
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              本地离线语音合成 (TTS) 和实时语音识别 (ASR)
            </p>
          </div>

          <TooltipProvider>
            <div className={`${isMobile ? "space-y-5" : "space-y-6"}`}>
              {/* Sherpa-ONNX TTS Configuration */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div
                  className={`bg-gradient-to-r from-green-500 to-emerald-500 ${
                    isMobile ? "p-4" : "p-6"
                  }`}
                >
                  <div className="flex items-center gap-3 text-white">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <span className="text-3xl">🎵</span>
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold ${
                          isMobile ? "text-lg" : "text-2xl"
                        }`}
                      >
                        语音合成 (TTS)
                      </h3>
                      <p
                        className={`text-white/90 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        本地离线文本转语音服务
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-5 w-5 text-white/80 hover:text-white transition-colors cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">
                          Sherpa-ONNX 离线语音合成
                        </p>
                        <p className="text-xs mb-2">手动下载模型文件：</p>
                        <a
                          href="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline block break-all mb-1"
                        >
                          Matcha 模型 (~80MB)
                        </a>
                        <a
                          href="https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline block break-all"
                        >
                          Vocoder 模型 (~45MB)
                        </a>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div
                  className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}`}
                >
                  {/* 模型下载区域 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        📦 模型文件管理
                      </h4>
                    </div>

                    {/* Matcha 模型下载 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {matchaDownloaded ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className="text-sm font-medium">
                            Matcha 声学模型 {matchaDownloaded && "✓"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => downloadModel("matcha")}
                          disabled={matchaDownloading || matchaDownloaded}
                          className={`
                              ${
                                matchaDownloaded
                                  ? "bg-gray-400"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }
                              text-white text-xs h-8
                            `}
                        >
                          {matchaDownloading ? (
                            <>
                              <Download className="w-3 h-3 mr-1 animate-pulse" />
                              {matchaProgress}%
                            </>
                          ) : matchaDownloaded ? (
                            "已下载"
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-1" />
                              下载 (~80MB)
                            </>
                          )}
                        </Button>
                      </div>
                      {matchaDownloading && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${matchaProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Vocoder 模型下载 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {vocoderDownloaded ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className="text-sm font-medium">
                            Vocoder 模型 {vocoderDownloaded && "✓"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => downloadModel("vocoder")}
                          disabled={vocoderDownloading || vocoderDownloaded}
                          className={`
                              ${
                                vocoderDownloaded
                                  ? "bg-gray-400"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }
                              text-white text-xs h-8
                            `}
                        >
                          {vocoderDownloading ? (
                            <>
                              <Download className="w-3 h-3 mr-1 animate-pulse" />
                              {vocoderProgress}%
                            </>
                          ) : vocoderDownloaded ? (
                            "已下载"
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-1" />
                              下载 (~45MB)
                            </>
                          )}
                        </Button>
                      </div>
                      {vocoderDownloading && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${vocoderProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

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
                          setSherpaTtsConfig({
                            enabled: e.target.checked,
                          });
                          setSherpaTtsConfigModified(true);
                        }}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label
                        htmlFor="sherpa-tts-enabled"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        启用 Sherpa-ONNX TTS 服务
                      </label>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">📂</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            模型存储位置
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            下载的模型文件会自动保存到应用数据目录：
                          </p>
                          <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block break-all">
                            ~/Library/Application
                            Support/RWKV-VTuber/tts-models/
                          </code>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 模型下载完成后会自动配置，无需手动设置
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 语音参数 */}
                  <div className="rounded-xl border border-green-200/40 dark:border-green-900/30 bg-green-50/40 dark:bg-green-900/10 p-3 sm:p-4 space-y-4">
                    <div className={`grid grid-cols-1 gap-4`}>
                      {/* Speed */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          语速: {sherpaTtsConfig.speed.toFixed(1)}x
                        </Label>
                        <Slider
                          value={[sherpaTtsConfig.speed]}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          color="green"
                          variant="gradient"
                          showLabels
                          leftLabel={"0.5x"}
                          rightLabel={"2.0x"}
                          currentValue={`${sherpaTtsConfig.speed.toFixed(1)}x`}
                          onValueChange={(v) => {
                            setSherpaTtsConfig({ speed: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                          onValueCommit={(v) => {
                            setSherpaTtsConfig({ speed: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                        />
                      </div>

                      {/* Noise Scale */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          噪声比例: {sherpaTtsConfig.noiseScale.toFixed(3)}
                        </Label>
                        <Slider
                          value={[sherpaTtsConfig.noiseScale]}
                          min={0.1}
                          max={1.0}
                          step={0.001}
                          color="blue"
                          variant="gradient"
                          showLabels
                          leftLabel={"0.1"}
                          rightLabel={"1.0"}
                          currentValue={`${sherpaTtsConfig.noiseScale.toFixed(
                            3
                          )}`}
                          onValueChange={(v) => {
                            setSherpaTtsConfig({ noiseScale: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                          onValueCommit={(v) => {
                            setSherpaTtsConfig({ noiseScale: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                        />
                      </div>

                      {/* Length Scale */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          长度比例: {sherpaTtsConfig.lengthScale.toFixed(2)}
                        </Label>
                        <Slider
                          value={[sherpaTtsConfig.lengthScale]}
                          min={0.5}
                          max={2.0}
                          step={0.01}
                          color="purple"
                          variant="gradient"
                          showLabels
                          leftLabel={"0.5"}
                          rightLabel={"2.0"}
                          currentValue={`${sherpaTtsConfig.lengthScale.toFixed(
                            2
                          )}`}
                          onValueChange={(v) => {
                            setSherpaTtsConfig({ lengthScale: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                          onValueCommit={(v) => {
                            setSherpaTtsConfig({ lengthScale: v[0] });
                            setSherpaTtsConfigModified(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                    <Button
                      onClick={saveSherpaTtsConfig}
                      disabled={!sherpaTtsConfigModified}
                      className={`
                          bg-green-600 hover:bg-green-700 text-white border-0 font-medium transition-all duration-200
                          ${isMobile ? "w-full h-10" : "h-11"} 
                          ${
                            !sherpaTtsConfigModified
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }
                        `}
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
                      className={`
                          bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-200
                          ${isMobile ? "w-full h-10" : "h-11"} cursor-pointer
                        `}
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
                      className={`
                          border-2 hover:bg-gray-50 font-medium transition-all duration-200
                          ${isMobile ? "w-full h-10" : "h-11"} cursor-pointer
                        `}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      恢复默认
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sherpa-ONNX ASR Configuration */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div
                  className={`bg-gradient-to-r from-blue-500 to-cyan-500 ${
                    isMobile ? "p-4" : "p-6"
                  }`}
                >
                  <div className="flex items-center gap-3 text-white">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <span className="text-3xl">🎤</span>
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold ${
                          isMobile ? "text-lg" : "text-2xl"
                        }`}
                      >
                        语音识别 (ASR)
                      </h3>
                      <p
                        className={`text-white/90 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        实时流式语音转文本服务
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-5 w-5 text-white/80 hover:text-white transition-colors cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">
                          Sherpa-ONNX 实时流式语音识别
                        </p>
                        <p className="text-xs mb-2">手动下载模型文件：</p>
                        <a
                          href="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline block break-all"
                        >
                          流式 Paraformer 模型 (~70MB)
                        </a>
                        <p className="text-xs mt-2 text-gray-500">
                          INT8 量化: encoder.int8.onnx, decoder.int8.onnx,
                          tokens.txt
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div
                  className={`${isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}`}
                >
                  {/* 模型下载区域 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        📦 ASR 模型文件管理
                      </h4>
                    </div>

                    {/* ASR 模型下载 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {asrDownloaded ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className="text-sm font-medium">
                            流式 Paraformer 模型 {asrDownloaded && "✓"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={downloadASRModel}
                          disabled={asrDownloading || asrDownloaded}
                          className={`
                            ${
                              asrDownloaded
                                ? "bg-gray-400"
                                : "bg-blue-600 hover:bg-blue-700"
                            }
                            text-white text-xs h-8
                          `}
                        >
                          {asrDownloading ? (
                            <>
                              <Download className="w-3 h-3 mr-1 animate-pulse" />
                              {asrProgress}%
                            </>
                          ) : asrDownloaded ? (
                            "已下载"
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-1" />
                              下载 (~70MB)
                            </>
                          )}
                        </Button>
                      </div>
                      {asrDownloading && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${asrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      💡 提示：下载完成后会自动填充模型路径
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📂</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          模型存储位置
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          下载的模型文件会自动保存到应用数据目录：
                        </p>
                        <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block break-all">
                          ~/Library/Application Support/RWKV-VTuber/asr-models/
                        </code>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          💡 模型下载完成后会自动配置，无需手动设置
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
