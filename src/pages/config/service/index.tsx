import {
  Info,
  Mic,
  RotateCcw,
  Save,
  Settings,
  Volume2,
  Brain,
} from "lucide-react";
import { useState } from "react";
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
import {
  DEFAULT_MINIMAX_CONFIG,
  MINIMAX_VOICE_OPTIONS,
  MINIMAX_MODEL_OPTIONS,
  validateMinimaxConfig,
} from "../../../lib/api/shared/api.minimax-tts";

export default function ConfigServicePage() {
  const { screenType, isMobile } = useResponsive();
  const minimaxConfig = useSpeakApi((state) => state.minimaxConfig);
  const setMinimaxConfig = useSpeakApi((state) => state.setMinimaxConfig);
  const testSpeak = useSpeakApi((state) => state.testSpeak);

  const setListenApi = useListenApi((state) => state.setListenApi);
  const listenApiList = useListenApi((state) => state.listenApiList);
  const currentListenApi = useListenApi((state) => state.currentListenApi);

  const sherpaConfig = useSherpaConfig((state) => state.config);
  const setSherpaConfig = useSherpaConfig((state) => state.setConfig);
  const resetSherpaConfig = useSherpaConfig((state) => state.resetConfig);

  const [minimaxConfigModified, setMinimaxConfigModified] = useState(false);
  const [sherpaConfigModified, setSherpaConfigModified] = useState(false);

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
                {/* MiniMax TTS Configuration */}
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
                          MiniMax提供高质量的AI语音合成服务， 支持多种音色和语言
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
                      <Label className="text-sm font-semibold">Group ID</Label>
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
                      <Label className="text-sm font-semibold">模型选择</Label>
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
                            <SelectItem key={option.value} value={option.value}>
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
                            <SelectItem key={option.value} value={option.value}>
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
                            Sherpa-ONNX 离线语音识别
                          </p>
                          <p className="text-xs mb-2">
                            请从以下地址下载模型文件：
                          </p>
                          <a
                            href="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-2024-03-09.tar.bz2"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block break-all"
                          >
                            下载模型 (约70MB)
                          </a>
                          <p className="text-xs mt-2">
                            解压后需要: model.int8.onnx 和 tokens.txt
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          模型文件路径
                        </Label>
                        <Input
                          type="text"
                          value={sherpaConfig.modelPath}
                          onChange={(e) => {
                            setSherpaConfig({
                              modelPath: e.target.value,
                            });
                            setSherpaConfigModified(true);
                          }}
                          placeholder="sherpa/model.int8.onnx"
                          className={`border-2 focus:border-blue-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          模型文件的绝对路径或相对路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          词表文件路径
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
                          placeholder="sherpa/tokens.txt"
                          className={`border-2 focus:border-blue-500 transition-colors ${
                            isMobile ? "h-10 text-sm" : "h-11"
                          }`}
                        />
                        <p className="text-xs text-gray-500">
                          词表文件的绝对路径或相对路径
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          线程数: {sherpaConfig.numThreads}
                        </Label>
                        <Slider
                          value={[sherpaConfig.numThreads]}
                          min={1}
                          max={8}
                          step={1}
                          color="blue"
                          variant="gradient"
                          showLabels
                          leftLabel={"1"}
                          rightLabel={"8"}
                          currentValue={`${sherpaConfig.numThreads}`}
                          onValueChange={(v) => {
                            setSherpaConfig({ numThreads: v[0] });
                            setSherpaConfigModified(true);
                          }}
                          onValueCommit={(v) => {
                            setSherpaConfig({ numThreads: v[0] });
                            setSherpaConfigModified(true);
                          }}
                        />
                        <p className="text-xs text-gray-500">
                          推理线程数（建议 2-4）
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          模型类型
                        </Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="use-int8-model"
                            checked={sherpaConfig.useInt8Model}
                            onChange={(e) => {
                              const useInt8 = e.target.checked;
                              setSherpaConfig({
                                useInt8Model: useInt8,
                                modelPath: useInt8
                                  ? "sherpa/model.int8.onnx"
                                  : "sherpa/model.onnx",
                              });
                              setSherpaConfigModified(true);
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label
                            htmlFor="use-int8-model"
                            className="text-sm text-gray-700"
                          >
                            使用 INT8 量化模型（更快，体积更小）
                          </label>
                        </div>
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
                                    modelPath: sherpaConfig.modelPath,
                                    tokensPath: sherpaConfig.tokensPath,
                                    numThreads: sherpaConfig.numThreads,
                                  }
                                );
                                toast.success("Sherpa-ONNX 配置已保存并应用");
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
