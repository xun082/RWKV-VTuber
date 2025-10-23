import {
  Info,
  Mic,
  RotateCcw,
  Save,
  Settings,
  Volume2,
  Brain,
  Speaker,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Slider } from "../../../components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { useResponsive } from "../../../hooks/useResponsive";
import { useListenApi } from "../../../stores/useListenApi.ts";
import { useSpeakApi } from "../../../stores/useSpeakApi.ts";
import { useSherpaConfig } from "../../../stores/useSherpaConfig.ts";
import { useSherpaTtsConfig } from "../../../stores/useSherpaTtsConfig.ts";
import {
  DEFAULT_MINIMAX_CONFIG,
  MINIMAX_VOICE_OPTIONS,
  MINIMAX_MODEL_OPTIONS,
  validateMinimaxConfig,
} from "../../../lib/api/shared/api.minimax-tts";
import { validateSherpaTTSConfig } from "../../../lib/api/electron/api.sherpa-tts";

export default function ConfigServicePage() {
  const { screenType, isMobile } = useResponsive();

  // TTS Service
  const speakApiList = useSpeakApi((state) => state.speakApiList);
  const currentSpeakApi = useSpeakApi((state) => state.currentSpeakApi);
  const setSpeakApi = useSpeakApi((state) => state.setSpeakApi);
  const testSpeak = useSpeakApi((state) => state.testSpeak);

  // MiniMax TTS
  const minimaxConfig = useSpeakApi((state) => state.minimaxConfig);
  const setMinimaxConfig = useSpeakApi((state) => state.setMinimaxConfig);

  // Sherpa-ONNX TTS
  const sherpaTtsConfig = useSherpaTtsConfig((state) => state.config);
  const setSherpaTtsConfig = useSherpaTtsConfig((state) => state.setConfig);
  const resetSherpaTtsConfig = useSherpaTtsConfig((state) => state.resetConfig);

  // Listen Service
  const setListenApi = useListenApi((state) => state.setListenApi);
  const listenApiList = useListenApi((state) => state.listenApiList);
  const currentListenApi = useListenApi((state) => state.currentListenApi);

  // Sherpa ASR Config
  const sherpaConfig = useSherpaConfig((state) => state.config);
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);
  const resetSherpaConfig = useSherpaConfig((state) => state.resetConfig);

  const [minimaxConfigModified, setMinimaxConfigModified] = useState(false);
  const [sherpaTtsConfigModified, setSherpaTtsConfigModified] = useState(false);
  const [sherpaConfigModified, setSherpaConfigModified] = useState(false);

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

  // 测试MiniMax连接
  const testMinimaxConnection = async () => {
    const errors = validateMinimaxConfig(minimaxConfig);
    if (errors.length > 0) {
      toast.error(`配置错误: ${errors[0]}`);
      return;
    }

    if (!minimaxConfig.enabled) {
      toast.error("请先启用MiniMax TTS服务");
      return;
    }

    try {
      toast.info("正在测试连接...");
      console.log("开始测试MiniMax TTS连接...");

      if (testSpeak) {
        await testSpeak();
        toast.success("🎉 MiniMax TTS连接测试成功！");
        console.log("✅ MiniMax TTS连接测试成功");
      } else {
        throw new Error("测试服务不可用");
      }
    } catch (error) {
      console.error("MiniMax TTS连接测试失败:", error);
      toast.error(
        `连接测试失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  };

  // 保存MiniMax配置
  const saveMinimaxConfig = async () => {
    const errors = validateMinimaxConfig(minimaxConfig);
    if (errors.length > 0) {
      toast.error(`配置错误: ${errors[0]}`);
      return;
    }

    try {
      await setMinimaxConfig(minimaxConfig);
      setMinimaxConfigModified(false);
      toast.success("MiniMax TTS配置已保存");
    } catch (error) {
      console.error("保存MiniMax配置失败:", error);
      toast.error("保存配置失败");
    }
  };

  // 重置MiniMax配置
  const resetMinimaxConfig = async () => {
    await setMinimaxConfig(DEFAULT_MINIMAX_CONFIG);
    setMinimaxConfigModified(true);
    toast.success("MiniMax配置已重置");
  };

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

      // 如果模型已下载，自动填充路径
      if (matchaResult.downloaded && matchaResult.path) {
        const basePath = matchaResult.path;
        setSherpaTtsConfig({
          acousticModel: `${basePath}/model-steps-3.onnx`,
          lexicon: `${basePath}/lexicon.txt`,
          tokens: `${basePath}/tokens.txt`,
          ruleFsts: `${basePath}/phone.fst,${basePath}/date.fst,${basePath}/number.fst`,
        });
      }

      if (vocoderResult.downloaded && vocoderResult.path) {
        setSherpaTtsConfig({
          vocoder: vocoderResult.path,
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

      // 如果模型已下载，自动填充路径
      if (
        result.downloaded &&
        result.encoderPath &&
        result.decoderPath &&
        result.tokensPath
      ) {
        setSherpaConfig({
          encoderPath: result.encoderPath,
          decoderPath: result.decoderPath,
          tokensPath: result.tokensPath,
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

          // 自动填充路径
          const basePath = result.path;
          setSherpaTtsConfig({
            acousticModel: `${basePath}/model-steps-3.onnx`,
            lexicon: `${basePath}/lexicon.txt`,
            tokens: `${basePath}/tokens.txt`,
            ruleFsts: `${basePath}/phone.fst,${basePath}/date.fst,${basePath}/number.fst`,
          });
          setSherpaTtsConfigModified(true);
        } else {
          setVocoderDownloaded(true);
          toast.success("Vocoder 模型下载成功！");

          // 自动填充路径
          setSherpaTtsConfig({
            vocoder: result.path,
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

        // 自动填充路径（使用 INT8 量化模型）
        const basePath = result.path;
        setSherpaConfig({
          encoderPath: `${basePath}/encoder.int8.onnx`,
          decoderPath: `${basePath}/decoder.int8.onnx`,
          tokensPath: `${basePath}/tokens.txt`,
        });
        setSherpaConfigModified(true);
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
    if (currentSpeakApi === "Sherpa-ONNX TTS") {
      checkModelsDownloaded();
    }
  }, [currentSpeakApi]);

  // 页面加载时检查 ASR 模型
  useEffect(() => {
    if (currentListenApi === "sherpa") {
      checkASRModelDownloaded();
    }
  }, [currentListenApi]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`
         flex-1 overflow-y-auto scroll-smooth
         ${isMobile ? "px-4 py-4" : "px-6 py-6"}
       `}
      >
        <div
          className={`
           mx-auto space-y-6
           ${screenType === "mobile" ? "max-w-sm" : ""}
           ${screenType === "tablet" ? "max-w-2xl" : ""}
           ${screenType === "desktop-sm" ? "max-w-3xl" : ""}
           ${screenType === "desktop-md" ? "max-w-4xl" : ""}
           ${screenType === "desktop-lg" ? "max-w-5xl" : ""}
         `}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className={`
               font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent
               ${isMobile ? "text-2xl" : "text-3xl"}
             `}
            >
              语音服务配置
            </h1>
            <p
              className={`
               text-muted-foreground
               ${isMobile ? "text-sm" : "text-base"}
             `}
            >
              配置MiniMax语音合成和语音识别服务
            </p>
          </div>

          <TooltipProvider>
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className={`${isMobile ? "pb-4" : "pb-6"}`}>
                <CardTitle
                  className={`
                   flex items-center gap-2
                   ${isMobile ? "text-lg" : "text-xl"}
                 `}
                >
                  <Settings
                    className={`text-blue-600 ${
                      isMobile ? "h-4 w-4" : "h-5 w-5"
                    }`}
                  />
                  语音服务设置
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`${isMobile ? "space-y-6" : "space-y-8"}`}
              >
                {/* TTS Service Selection */}
                <div className={`${isMobile ? "space-y-4" : "space-y-6"}`}>
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div
                      className={`bg-blue-100 rounded-full ${
                        isMobile ? "p-1.5" : "p-2"
                      }`}
                    >
                      <Speaker
                        className={`text-blue-600 ${
                          isMobile ? "h-4 w-4" : "h-5 w-5"
                        }`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-semibold text-gray-800 ${
                          isMobile ? "text-base" : "text-lg"
                        }`}
                      >
                        语音合成服务
                      </h3>
                      <p
                        className={`text-gray-600 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        选择文本转语音服务
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      TTS 服务选择
                    </Label>
                    <Select
                      value={currentSpeakApi}
                      onValueChange={async (value) => {
                        await setSpeakApi(value);
                        toast.success(`已切换到 ${value}`);
                      }}
                    >
                      <SelectTrigger
                        className={`
                          border-2 focus:border-blue-500 transition-colors
                          ${isMobile ? "h-10 text-sm" : "h-11"} cursor-pointer
                        `}
                      >
                        <SelectValue placeholder="选择 TTS 服务" />
                      </SelectTrigger>
                      <SelectContent>
                        {speakApiList.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* MiniMax TTS Configuration */}
                {currentSpeakApi === "MiniMax TTS" && (
                  <div
                    className={`border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 ${
                      isMobile ? "space-y-4" : "space-y-6"
                    }`}
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <div
                        className={`bg-purple-100 rounded-full ${
                          isMobile ? "p-1.5" : "p-2"
                        }`}
                      >
                        <Volume2
                          className={`text-purple-600 ${
                            isMobile ? "h-4 w-4" : "h-5 w-5"
                          }`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-semibold text-gray-800 ${
                            isMobile ? "text-base" : "text-lg"
                          }`}
                        >
                          MiniMax TTS 配置
                        </h3>
                        <p
                          className={`text-gray-600 ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                        >
                          配置高质量AI语音合成服务
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground hover:text-purple-600 transition-colors ml-auto cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            MiniMax提供高质量的AI语音合成服务，
                            支持多种音色和语言
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* API配置 */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          启用服务
                        </Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="minimax-enabled"
                            checked={minimaxConfig.enabled}
                            onChange={(e) => {
                              setMinimaxConfig({
                                enabled: e.target.checked,
                              });
                              setMinimaxConfigModified(true);
                            }}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <label
                            htmlFor="minimax-enabled"
                            className="text-sm text-gray-700"
                          >
                            启用MiniMax TTS服务
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">API Key</Label>
                        <Input
                          type="password"
                          value={minimaxConfig.apiKey}
                          onChange={(e) => {
                            setMinimaxConfig({
                              apiKey: e.target.value,
                            });
                            setMinimaxConfigModified(true);
                          }}
                          placeholder="请输入MiniMax API Key"
                          className={`border-2 focus:border-purple-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Group ID
                        </Label>
                        <Input
                          type="text"
                          value={minimaxConfig.groupId}
                          onChange={(e) => {
                            setMinimaxConfig({
                              groupId: e.target.value,
                            });
                            setMinimaxConfigModified(true);
                          }}
                          placeholder="请输入Group ID"
                          className={`border-2 focus:border-purple-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          模型选择
                        </Label>
                        <Select
                          value={minimaxConfig.model}
                          onValueChange={(value) => {
                            setMinimaxConfig({
                              model: value,
                            });
                            setMinimaxConfigModified(true);
                          }}
                        >
                          <SelectTrigger
                            className={`border-2 focus:border-purple-500 transition-colors ${
                              isMobile ? "h-10 text-sm" : "h-11"
                            } cursor-pointer`}
                          >
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINIMAX_MODEL_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          音色选择
                          <Badge variant="secondary" className="ml-2">
                            {MINIMAX_VOICE_OPTIONS.length} 种音色
                          </Badge>
                        </Label>
                        <Select
                          value={minimaxConfig.voiceId}
                          onValueChange={(value) => {
                            setMinimaxConfig({
                              voiceId: value,
                            });
                            setMinimaxConfigModified(true);
                          }}
                        >
                          <SelectTrigger
                            className={`border-2 focus:border-purple-500 transition-colors ${
                              isMobile ? "h-10 text-sm" : "h-11"
                            } cursor-pointer`}
                          >
                            <SelectValue placeholder="选择音色" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {MINIMAX_VOICE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 语音参数 */}
                    <div className="rounded-xl border border-purple-200/40 dark:border-purple-900/30 bg-purple-50/40 dark:bg-purple-900/10 p-3 sm:p-4 space-y-4">
                      <div className={`grid grid-cols-1 gap-4`}>
                        {/* Speed */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            语速: {minimaxConfig.speed.toFixed(1)}x
                          </Label>
                          <Slider
                            value={[minimaxConfig.speed]}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            color="purple"
                            variant="gradient"
                            showLabels
                            leftLabel={"0.5x"}
                            rightLabel={"2.0x"}
                            currentValue={`${minimaxConfig.speed.toFixed(1)}x`}
                            onValueChange={(v) => {
                              setMinimaxConfig({ speed: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                            onValueCommit={(v) => {
                              setMinimaxConfig({ speed: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                          />
                        </div>

                        {/* Volume */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            音量: {minimaxConfig.volume.toFixed(1)}
                          </Label>
                          <Slider
                            value={[minimaxConfig.volume]}
                            min={0.1}
                            max={3.0}
                            step={0.1}
                            color="blue"
                            variant="gradient"
                            showLabels
                            leftLabel={"0.1"}
                            rightLabel={"3.0"}
                            currentValue={`${minimaxConfig.volume.toFixed(1)}`}
                            onValueChange={(v) => {
                              setMinimaxConfig({ volume: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                            onValueCommit={(v) => {
                              setMinimaxConfig({ volume: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                          />
                        </div>

                        {/* Pitch */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            音调: {minimaxConfig.pitch}
                          </Label>
                          <Slider
                            value={[minimaxConfig.pitch]}
                            min={-12}
                            max={12}
                            step={1}
                            color="green"
                            variant="gradient"
                            showLabels
                            leftLabel={"-12"}
                            rightLabel={"12"}
                            currentValue={`${minimaxConfig.pitch}`}
                            onValueChange={(v) => {
                              setMinimaxConfig({ pitch: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                            onValueCommit={(v) => {
                              setMinimaxConfig({ pitch: v[0] });
                              setMinimaxConfigModified(true);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={saveMinimaxConfig}
                        disabled={!minimaxConfigModified}
                        className={`
                      bg-purple-600 hover:bg-purple-700 text-white border-0 font-medium transition-all duration-200
                      ${isMobile ? "w-full h-10" : "h-11"} 
                      ${
                        !minimaxConfigModified
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }
                    `}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存配置
                      </Button>
                      <Button
                        onClick={testMinimaxConnection}
                        disabled={
                          !minimaxConfig.enabled ||
                          !minimaxConfig.apiKey ||
                          !minimaxConfig.groupId
                        }
                        className={`
                      bg-green-600 hover:bg-green-700 text-white border-0 font-medium transition-all duration-200
                      ${isMobile ? "w-full h-10" : "h-11"} cursor-pointer
                    `}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        测试连接
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetMinimaxConfig}
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
                )}

                {/* Sherpa-ONNX TTS Configuration */}
                {currentSpeakApi === "Sherpa-ONNX TTS" && (
                  <div
                    className={`border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-green-50/50 to-blue-50/50 ${
                      isMobile ? "space-y-4" : "space-y-6"
                    }`}
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <div
                        className={`bg-green-100 rounded-full ${
                          isMobile ? "p-1.5" : "p-2"
                        }`}
                      >
                        <Brain
                          className={`text-green-600 ${
                            isMobile ? "h-4 w-4" : "h-5 w-5"
                          }`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-semibold text-gray-800 ${
                            isMobile ? "text-base" : "text-lg"
                          }`}
                        >
                          Sherpa-ONNX TTS 配置
                        </h3>
                        <p
                          className={`text-gray-600 ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                        >
                          配置本地离线语音合成（需自行下载模型）
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground hover:text-green-600 transition-colors ml-auto cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">
                            Sherpa-ONNX 离线语音合成
                          </p>
                          <p className="text-xs mb-2">
                            请从以下地址下载模型文件：
                          </p>
                          <a
                            href="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block break-all mb-1"
                          >
                            下载 Matcha 模型 (约80MB)
                          </a>
                          <a
                            href="https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block break-all"
                          >
                            下载 Vocoder 模型 (约45MB)
                          </a>
                        </TooltipContent>
                      </Tooltip>
                    </div>

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

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          启用服务
                        </Label>
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
                            className="text-sm text-gray-700"
                          >
                            启用 Sherpa-ONNX TTS 服务
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          声学模型路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaTtsConfig.acousticModel}
                          onChange={(e) => {
                            setSherpaTtsConfig({
                              acousticModel: e.target.value,
                            });
                            setSherpaTtsConfigModified(true);
                          }}
                          placeholder="matcha-icefall-zh-baker/model-steps-3.onnx"
                          className={`border-2 focus:border-green-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          Matcha 声学模型的路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Vocoder 模型路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaTtsConfig.vocoder}
                          onChange={(e) => {
                            setSherpaTtsConfig({
                              vocoder: e.target.value,
                            });
                            setSherpaTtsConfigModified(true);
                          }}
                          placeholder="vocos-22khz-univ.onnx"
                          className={`border-2 focus:border-green-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          Vocos vocoder 模型的路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          词典文件路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaTtsConfig.lexicon}
                          onChange={(e) => {
                            setSherpaTtsConfig({
                              lexicon: e.target.value,
                            });
                            setSherpaTtsConfigModified(true);
                          }}
                          placeholder="matcha-icefall-zh-baker/lexicon.txt"
                          className={`border-2 focus:border-green-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Tokens 文件路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaTtsConfig.tokens}
                          onChange={(e) => {
                            setSherpaTtsConfig({
                              tokens: e.target.value,
                            });
                            setSherpaTtsConfigModified(true);
                          }}
                          placeholder="matcha-icefall-zh-baker/tokens.txt"
                          className={`border-2 focus:border-green-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
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
                            currentValue={`${sherpaTtsConfig.speed.toFixed(
                              1
                            )}x`}
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

                        {/* Num Threads */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            线程数: {sherpaTtsConfig.numThreads}
                          </Label>
                          <Slider
                            value={[sherpaTtsConfig.numThreads]}
                            min={1}
                            max={8}
                            step={1}
                            color="orange"
                            variant="gradient"
                            showLabels
                            leftLabel={"1"}
                            rightLabel={"8"}
                            currentValue={`${sherpaTtsConfig.numThreads}`}
                            onValueChange={(v) => {
                              setSherpaTtsConfig({ numThreads: v[0] });
                              setSherpaTtsConfigModified(true);
                            }}
                            onValueCommit={(v) => {
                              setSherpaTtsConfig({ numThreads: v[0] });
                              setSherpaTtsConfigModified(true);
                            }}
                          />
                          <p className="text-xs text-gray-500">
                            推理线程数（建议 2-4）
                          </p>
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
                          !sherpaTtsConfig.acousticModel ||
                          !sherpaTtsConfig.vocoder
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
                )}

                {/* Speech Recognition Section */}
                <div className={`${isMobile ? "space-y-4" : "space-y-6"}`}>
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                    <div
                      className={`bg-orange-100 rounded-full ${
                        isMobile ? "p-1.5" : "p-2"
                      }`}
                    >
                      <Mic
                        className={`text-orange-600 ${
                          isMobile ? "h-4 w-4" : "h-5 w-5"
                        }`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-semibold text-gray-800 ${
                          isMobile ? "text-base" : "text-lg"
                        }`}
                      >
                        语音识别服务
                      </h3>
                      <p
                        className={`text-gray-600 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        配置语音转文本服务
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      服务选择
                    </Label>
                    <Select
                      value={currentListenApi}
                      onValueChange={async (value) => {
                        await setListenApi(value);
                      }}
                    >
                      <SelectTrigger
                        className={`
                     border-2 focus:border-orange-500 transition-colors
                     ${isMobile ? "h-10 text-sm" : "h-11"} cursor-pointer
                   `}
                      >
                        <SelectValue placeholder="选择语音识别服务" />
                      </SelectTrigger>
                      <SelectContent>
                        {listenApiList.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sherpa-ONNX Configuration (仅在 Electron 环境显示) */}
                {currentListenApi === "sherpa" && (
                  <div
                    className={`border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 ${
                      isMobile ? "space-y-4" : "space-y-6"
                    }`}
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <div
                        className={`bg-blue-100 rounded-full ${
                          isMobile ? "p-1.5" : "p-2"
                        }`}
                      >
                        <Brain
                          className={`text-blue-600 ${
                            isMobile ? "h-4 w-4" : "h-5 w-5"
                          }`}
                        />
                      </div>
                      <div>
                        <h3
                          className={`font-semibold text-gray-800 ${
                            isMobile ? "text-base" : "text-lg"
                          }`}
                        >
                          Sherpa-ONNX 模型配置
                        </h3>
                        <p
                          className={`text-gray-600 ${
                            isMobile ? "text-xs" : "text-sm"
                          }`}
                        >
                          配置本地语音识别模型路径（需自行下载）
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors ml-auto cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">
                            Sherpa-ONNX 实时流式语音识别
                          </p>
                          <p className="text-xs mb-2">
                            请从以下地址下载模型文件：
                          </p>
                          <a
                            href="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block break-all"
                          >
                            下载流式模型 (约70MB)
                          </a>
                          <p className="text-xs mt-2">
                            使用 INT8 量化模型: encoder.int8.onnx,
                            decoder.int8.onnx 和 tokens.txt
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

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

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Encoder 模型路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaConfig.encoderPath}
                          onChange={(e) => {
                            setSherpaConfig({
                              encoderPath: e.target.value,
                            });
                            setSherpaConfigModified(true);
                          }}
                          placeholder="sherpa-onnx-streaming-paraformer-bilingual-zh-en/encoder.int8.onnx"
                          className={`border-2 focus:border-blue-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          Encoder 模型文件的绝对路径或相对路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Decoder 模型路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaConfig.decoderPath}
                          onChange={(e) => {
                            setSherpaConfig({
                              decoderPath: e.target.value,
                            });
                            setSherpaConfigModified(true);
                          }}
                          placeholder="sherpa-onnx-streaming-paraformer-bilingual-zh-en/decoder.int8.onnx"
                          className={`border-2 focus:border-blue-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          Decoder 模型文件的绝对路径或相对路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          Tokens 文件路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaConfig.tokensPath}
                          onChange={(e) => {
                            setSherpaConfig({
                              tokensPath: e.target.value,
                            });
                            setSherpaConfigModified(true);
                          }}
                          placeholder="sherpa-onnx-streaming-paraformer-bilingual-zh-en/tokens.txt"
                          className={`border-2 focus:border-blue-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          Tokens 文件的绝对路径或相对路径
                        </p>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={async () => {
                          try {
                            // 保存配置到本地存储
                            await setSherpaConfig(sherpaConfig);

                            // 如果在 Electron 环境，通知主进程重新加载配置
                            const electronAPI = (window as any).electronAPI;
                            if (electronAPI) {
                              try {
                                await electronAPI.invoke(
                                  "sherpa_reload_config",
                                  {
                                    encoderPath: sherpaConfig.encoderPath,
                                    decoderPath: sherpaConfig.decoderPath,
                                    tokensPath: sherpaConfig.tokensPath,
                                  }
                                );
                                toast.success(
                                  "Sherpa-ONNX 流式识别器配置已保存并应用"
                                );
                              } catch (reloadError: any) {
                                console.error("重新加载配置失败:", reloadError);
                                toast.warning(
                                  `配置已保存，但重新加载失败: ${
                                    reloadError.message || "未知错误"
                                  }`
                                );
                              }
                            } else {
                              toast.success("Sherpa-ONNX 配置已保存");
                            }

                            setSherpaConfigModified(false);
                          } catch (error) {
                            console.error("保存配置失败:", error);
                            toast.error("保存配置失败");
                          }
                        }}
                        disabled={!sherpaConfigModified}
                        className={`
                          bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-200
                          ${isMobile ? "w-full h-10" : "h-11"} 
                          ${
                            !sherpaConfigModified
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }
                        `}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存配置
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await resetSherpaConfig();
                          setSherpaConfigModified(true);
                          toast.success("Sherpa-ONNX 配置已重置");
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
                )}
              </CardContent>
            </Card>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
