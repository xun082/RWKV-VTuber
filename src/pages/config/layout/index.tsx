import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// SliderControl already imports base Slider; keep page lean
import { Slider } from "@/components/ui/slider";
import {
  Image,
  RotateCcw,
  User,
  Move,
  Maximize2,
  Minimize2,
  Settings,
  Upload,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import React from "react";
import { toBase64 } from "../../../lib/utils.ts";
import { useLive2dApi } from "../../../stores/useLive2dApi.ts";
import { useResponsive } from "../../../hooks/useResponsive";

export default function ConfigLayoutPage() {
  const { screenType, isMobile } = useResponsive();
  const {
    setLoadLive2d,
    live2dList,
    live2dName,
    setBackground,
    isFullScreen,
    setIsFullScreen,
    live2dPositionY,
    setLive2dPositionY,
    live2dPositionX,
    setLive2dPositionX,
    live2dScale,
    setLive2dScale,
  } = useLive2dApi();

  const selfName = "小助手";

  // 响应式样式工具函数
  const getSpacing = () => ({
    container: isMobile
      ? "px-2 py-3"
      : screenType === "tablet"
      ? "px-3 py-4"
      : "px-4 py-5",
    card: isMobile
      ? "p-3 pb-2"
      : screenType === "tablet"
      ? "p-4 pb-3"
      : "p-6 pb-4",
    content: isMobile
      ? "p-3 space-y-3"
      : screenType === "tablet"
      ? "p-4 space-y-4"
      : "p-6 space-y-6",
    section: isMobile
      ? "space-y-3"
      : screenType === "tablet"
      ? "space-y-4"
      : "space-y-6",
    item: isMobile ? "space-y-2" : "space-y-3",
    control: isMobile
      ? "space-y-2"
      : screenType === "tablet"
      ? "space-y-3"
      : "space-y-4",
  });

  const getTextSize = () => ({
    title: isMobile
      ? "text-xl"
      : screenType === "tablet"
      ? "text-2xl"
      : "text-3xl",
    subtitle: isMobile
      ? "text-xs"
      : screenType === "tablet"
      ? "text-sm"
      : "text-base",
    cardTitle: isMobile
      ? "text-base"
      : screenType === "tablet"
      ? "text-lg"
      : "text-xl",
    sectionTitle: isMobile ? "text-base" : "text-lg",
    label: isMobile ? "text-xs" : "text-sm",
  });

  const getInputSize = () => ({
    height: isMobile ? "h-10" : "h-11",
    iconSize: isMobile ? "h-4 w-4" : "h-5 w-5",
  });

  const styles = {
    spacing: getSpacing(),
    text: getTextSize(),
    input: getInputSize(),
  } as const;

  // 可复用的标签组件
  const SectionTitle = ({
    icon: Icon,
    children,
    color = "text-gray-800",
  }: {
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    children: React.ReactNode;
    color?: string;
  }) => (
    <h3
      className={`font-semibold ${color} border-b border-gray-200 pb-2 ${styles.text.sectionTitle}`}
    >
      {Icon && <Icon className="inline-block w-4 h-4 mr-2" />}
      {children}
    </h3>
  );

  const ConfigLabel = ({
    icon: Icon,
    children,
    color = "text-gray-600",
  }: {
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    children: React.ReactNode;
    color?: string;
  }) => (
    <Label
      className={`font-semibold flex items-center gap-2 ${styles.text.label}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${color}`} />}
      {children}
    </Label>
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/bmp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(
        "不支持的文件格式，请选择 JPG、PNG、WebP、BMP、GIF 或 SVG 格式的图片"
      );
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过 10MB");
      return;
    }

    try {
      const base64 = toBase64(await file.arrayBuffer());
      await setBackground(`data:${file.type};base64,${base64}`);
      toast.success("背景设置成功");
    } catch (e) {
      toast.error(`背景设置失败: ${e instanceof Error ? e.message : e}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`flex-1 overflow-y-auto scroll-smooth ${styles.spacing.container}`}
      >
        <div className="mx-auto space-y-4 max-w-full">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${styles.text.title}`}
            >
              布局配置
            </h1>
            <p className={`text-muted-foreground ${styles.text.subtitle}`}>
              自定义聊天形象和界面布局设置
            </p>
          </div>

          {/* Main Configuration Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className={styles.spacing.card}>
              <CardTitle
                className={`flex items-center gap-2 ${styles.text.cardTitle}`}
              >
                <Settings
                  className={`text-blue-600 ${styles.input.iconSize}`}
                />
                基础配置
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.spacing.content}>
              {/* Character Selection */}
              <div className={styles.spacing.item}>
                <ConfigLabel icon={User} color="text-green-600">
                  聊天形象
                </ConfigLabel>
                <Select value={live2dName} onValueChange={setLoadLive2d}>
                  <SelectTrigger
                    className={`border-2 focus:border-green-500 transition-colors ${styles.input.height}`}
                  >
                    <SelectValue placeholder="选择聊天形象" />
                  </SelectTrigger>
                  <SelectContent>
                    {live2dList.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name.replace("{name}", selfName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Position and Scale Section */}
              <div className={styles.spacing.section}>
                <SectionTitle>位置与缩放</SectionTitle>

                <div className="grid gap-6 grid-cols-1">
                  {/* Vertical Position */}
                  <div className={styles.spacing.control}>
                    <ConfigLabel icon={Move} color="text-blue-600">
                      模型垂直位置
                      {live2dPositionY === 0
                        ? ""
                        : ` [${
                            live2dPositionY > 0
                              ? `向下偏移${live2dPositionY}像素`
                              : `向上偏移${-live2dPositionY}像素`
                          }]`}
                    </ConfigLabel>
                    <Slider
                      id="position-y"
                      value={[live2dPositionY]}
                      onValueChange={(v) => setLive2dPositionY(v[0])}
                      onValueCommit={(v) => setLive2dPositionY(v[0])}
                      min={-300}
                      max={300}
                      step={5}
                      color="blue"
                      showLabels
                      leftLabel={"向上 300px"}
                      rightLabel={"向下 300px"}
                      currentValue={`${live2dPositionY}px`}
                    />
                  </div>

                  {/* Horizontal Position */}
                  <div className={styles.spacing.control}>
                    <ConfigLabel icon={Move} color="text-purple-600">
                      模型水平位置
                      {live2dPositionX === 0
                        ? ""
                        : ` [${
                            live2dPositionX > 0
                              ? `向右偏移${live2dPositionX}像素`
                              : `向左偏移${-live2dPositionX}像素`
                          }]`}
                    </ConfigLabel>
                    <Slider
                      id="position-x"
                      value={[live2dPositionX]}
                      onValueChange={(v) => setLive2dPositionX(v[0])}
                      onValueCommit={(v) => setLive2dPositionX(v[0])}
                      min={-600}
                      max={600}
                      step={10}
                      color="purple"
                      showLabels
                      leftLabel={"向左 600px"}
                      rightLabel={"向右 600px"}
                      currentValue={`${live2dPositionX}px`}
                    />
                  </div>
                </div>

                {/* Scale */}
                <div className={styles.spacing.control}>
                  <ConfigLabel icon={Maximize2} color="text-orange-600">
                    模型缩放
                    {live2dScale === 1
                      ? ""
                      : ` [${(live2dScale * 100).toFixed(0)}%]`}
                  </ConfigLabel>
                  <Slider
                    id="scale"
                    value={[live2dScale]}
                    onValueChange={(v) => setLive2dScale(v[0])}
                    onValueCommit={(v) => setLive2dScale(v[0])}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    color="orange"
                    showLabels
                    leftLabel={"50%"}
                    rightLabel={"300%"}
                    currentValue={`${(live2dScale * 100).toFixed(0)}%`}
                  />
                </div>
              </div>

              {/* Background Section */}
              <div className={styles.spacing.section}>
                <SectionTitle>背景设置</SectionTitle>

                <div className={styles.spacing.control}>
                  {/* Background Upload */}
                  <div className="space-y-3">
                    <ConfigLabel icon={Upload} color="text-indigo-600">
                      背景图片
                    </ConfigLabel>
                    <div className="w-full">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="background-upload"
                      />
                      <Label
                        htmlFor="background-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 mb-4 text-gray-500 transition-colors" />
                          <p className="mb-2 text-sm text-gray-600">
                            <span className="font-semibold">点击上传</span>{" "}
                            或拖拽文件到此处
                          </p>
                          <p className="text-xs text-gray-500">
                            JPG, PNG, WebP, BMP, GIF, SVG (最大 10MB)
                          </p>
                        </div>
                      </Label>
                    </div>
                  </div>

                  {/* Reset Background Button */}
                  <Button
                    variant="outline"
                    className="w-full h-11 border-2 hover:bg-gray-50 font-semibold transition-all duration-200"
                    onClick={async () => {
                      await setBackground();
                      toast.success("已恢复默认背景");
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    恢复默认背景
                  </Button>

                  {/* Background Display Area */}
                  <div className="space-y-3">
                    <ConfigLabel icon={Monitor} color="text-teal-600">
                      背景图片显示区域
                    </ConfigLabel>
                    <Select
                      value={isFullScreen.toString()}
                      onValueChange={(value: string) =>
                        setIsFullScreen(value === "true")
                      }
                    >
                      <SelectTrigger
                        className={`border-2 focus:border-teal-500 transition-colors ${styles.input.height}`}
                      >
                        <SelectValue placeholder="选择显示区域" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">
                          <div className="flex items-center gap-2">
                            <Maximize2 className="h-4 w-4" />
                            全屏
                          </div>
                        </SelectItem>
                        <SelectItem value="false">
                          <div className="flex items-center gap-2">
                            <Minimize2 className="h-4 w-4" />
                            模型区域
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
