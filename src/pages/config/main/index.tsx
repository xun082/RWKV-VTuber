import { RotateCcw, Save, Settings, Globe, Shield, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { useChatApi } from "../../../stores/useChatApi.ts";
import { useResponsive } from "../../../hooks/useResponsive";

export default function ConfigMainPage() {
  const { screenType, isMobile } = useResponsive();
  const {
    openaiEndpoint,
    openaiApiKey,
    openaiModelName,
    setOpenaiEndpoint,
    setOpenaiApiKey,
    setOpenaiModelName,
  } = useChatApi();

  // Form state management
  const [endpointValue, setEndpointValue] = useState(openaiEndpoint);
  const [apiKeyValue, setApiKeyValue] = useState(openaiApiKey);
  const [modelNameValue, setModelNameValue] = useState(openaiModelName);

  const [openaiModelNameModified, setOpenaiModelNameModified] = useState(false);
  const [openaiApiKeyModified, setOpenaiApiKeyModified] = useState(false);
  const [openaiEndpointModified, setOpenaiEndpointModified] = useState(false);

  // Sync form values with store values
  useEffect(() => setEndpointValue(openaiEndpoint), [openaiEndpoint]);
  useEffect(() => setApiKeyValue(openaiApiKey), [openaiApiKey]);
  useEffect(() => setModelNameValue(openaiModelName), [openaiModelName]);

  // 响应式样式工具函数
  const getSpacing = () => ({
    container: isMobile ? "px-4 py-4" : "px-6 py-6",
    card: isMobile ? "pb-4" : "pb-6",
    content: isMobile ? "space-y-6" : "space-y-8",
    section: "space-y-4",
    inputGroup: "flex gap-3",
  });

  const getTextSize = () => ({
    title: isMobile ? "text-2xl" : "text-3xl",
    subtitle: isMobile ? "text-sm" : "text-base",
    cardTitle: isMobile ? "text-lg" : "text-xl",
    label: "text-sm",
  });

  const getInputSize = () => ({
    height: "h-11",
    iconSize: isMobile ? "h-4 w-4" : "h-5 w-5",
    buttonSize: "h-11 w-11",
  });

  const getMaxWidth = () => {
    switch (screenType) {
      case "mobile":
        return "max-w-sm";
      case "tablet":
        return "max-w-2xl";
      case "desktop-sm":
        return "max-w-3xl";
      case "desktop-md":
        return "max-w-4xl";
      case "desktop-lg":
        return "max-w-5xl";
      default:
        return "max-w-full";
    }
  };

  const styles = {
    spacing: getSpacing(),
    text: getTextSize(),
    input: getInputSize(),
    maxWidth: getMaxWidth(),
  };

  // Helper: detect local/on-device endpoints
  const isLocalEndpoint = (url: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?/i.test(url || "");

  // 可复用的配置项组件
  const ConfigItem = ({
    icon: Icon,
    label,
    badge,
    value,
    onChange,
    placeholder,
    type = "text",
    color,
    isModified,
    onReset,
    onSave,
  }: {
    icon: React.ComponentType<any>;
    label: string;
    badge: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    color: string;
    isModified: boolean;
    onReset: () => void;
    onSave: () => void;
  }) => (
    <div className={styles.spacing.section}>
      <Label
        className={`${styles.text.label} font-semibold flex items-center gap-2`}
      >
        <Icon className={`h-4 w-4 text-${color}-600`} />
        {label}
        <Badge variant="secondary" className="ml-2">
          {badge}
        </Badge>
      </Label>
      <div className={styles.spacing.inputGroup}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${styles.input.buttonSize} border-2 hover:bg-gray-50 transition-all duration-200`}
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>恢复默认值</p>
          </TooltipContent>
        </Tooltip>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${styles.input.height} border-2 focus:border-${color}-500 transition-colors`}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isModified ? "default" : "outline"}
              size="icon"
              className={`${
                styles.input.buttonSize
              } transition-all duration-200 ${
                isModified
                  ? `bg-gradient-to-r from-${color}-600 to-${color}-700 hover:from-${color}-700 hover:to-${color}-800 text-white shadow-lg hover:shadow-xl`
                  : "border-2 hover:bg-gray-50"
              }`}
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>保存修改</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`flex-1 overflow-y-auto scroll-smooth ${styles.spacing.container}`}
      >
        <div className={`mx-auto space-y-6 ${styles.maxWidth}`}>
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${styles.text.title}`}
            >
              推理服务
            </h1>
            <p className={`text-muted-foreground ${styles.text.subtitle}`}>
              配置 AI 推理服务的连接参数
            </p>
          </div>

          <TooltipProvider>
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className={styles.spacing.card}>
                <CardTitle
                  className={`flex items-center gap-2 ${styles.text.cardTitle}`}
                >
                  <Settings
                    className={`text-blue-600 ${styles.input.iconSize}`}
                  />
                  API 配置
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.spacing.content}>
                {/* OpenAI Endpoint Configuration */}
                <ConfigItem
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
                />

                {/* OpenAI API Key Configuration */}
                <ConfigItem
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
                    setOpenaiApiKeyModified(false);
                    toast.success("推理服务密钥已恢复默认值");
                  }}
                  onSave={async () => {
                    const isLocal = isLocalEndpoint(endpointValue);
                    if (!apiKeyValue && !isLocal)
                      return toast.error("请输入推理服务密钥");
                    // 空值在本地端点时将使用默认密钥（如 'ollama'）
                    await setOpenaiApiKey(apiKeyValue || undefined);
                    setOpenaiApiKeyModified(false);
                    toast.success(
                      isLocal
                        ? "已保存（本地模型可留空）"
                        : "推理服务密钥已更新"
                    );
                  }}
                />

                {/* OpenAI Model Name Configuration */}
                <ConfigItem
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
                />
              </CardContent>
            </Card>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
