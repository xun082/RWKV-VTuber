import { useState } from "react";
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
import { Save, RotateCcw, User, Bot, Brain, Info } from "lucide-react";
import { useResponsive } from "../../hooks/useResponsive";

export default function MemoryPage() {
  const { screenType, isMobile } = useResponsive();
  const [userName, setUserName] = useState("用户");
  const [selfName, setSelfName] = useState("小助手");
  const [memoryAboutSelf, setMemoryAboutSelf] = useState("");
  const [memoryAboutUser, setMemoryAboutUser] = useState("");

  const handleSave = () => {
    // 在简化版本中，这些设置只是本地状态
    toast.success("设置已保存（本地会话有效）");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div
        className={`
        flex-1 overflow-y-auto scroll-smooth
        ${
          isMobile
            ? "px-2 py-3"
            : screenType === "tablet"
            ? "px-3 py-4"
            : "px-4 py-5"
        }
      `}
      >
        <div
          className={`
          mx-auto space-y-4
          ${screenType === "mobile" ? "max-w-full" : ""}
          ${screenType === "tablet" ? "max-w-full" : ""}
          ${screenType === "desktop-sm" ? "max-w-full" : ""}
          ${screenType === "desktop-md" ? "max-w-full" : ""}
          ${screenType === "desktop-lg" ? "max-w-full" : ""}
        `}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className={`
              font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent
              ${
                isMobile
                  ? "text-xl"
                  : screenType === "tablet"
                  ? "text-2xl"
                  : "text-3xl"
              }
            `}
            >
              记忆管理
            </h1>
            <p
              className={`
              text-muted-foreground
              ${
                isMobile
                  ? "text-xs"
                  : screenType === "tablet"
                  ? "text-sm"
                  : "text-base"
              }
            `}
            >
              配置用户和助手的个性化设置
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader
              className={`${
                isMobile
                  ? "p-3 pb-2"
                  : screenType === "tablet"
                  ? "p-4 pb-3"
                  : "p-6 pb-4"
              }`}
            >
              <CardTitle
                className={`
                flex items-center gap-2
                ${
                  isMobile
                    ? "text-base"
                    : screenType === "tablet"
                    ? "text-lg"
                    : "text-xl"
                }
              `}
              >
                <Brain
                  className={`text-blue-600 ${
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  }`}
                />
                基础设置
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`${
                isMobile
                  ? "p-3 space-y-3"
                  : screenType === "tablet"
                  ? "p-4 space-y-4"
                  : "p-6 space-y-6"
              }`}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className={`${
                  isMobile
                    ? "space-y-3"
                    : screenType === "tablet"
                    ? "space-y-4"
                    : "space-y-6"
                }`}
              >
                {/* Basic Info Section */}
                <div
                  className={`
                   grid ${
                     isMobile
                       ? "gap-3"
                       : screenType === "tablet"
                       ? "gap-4"
                       : "gap-6"
                   }
                   ${
                     screenType === "desktop-md" || screenType === "desktop-lg"
                       ? "grid-cols-2"
                       : "grid-cols-1"
                   }
                 `}
                >
                  {/* User Name */}
                  <div className={`${isMobile ? "space-y-2" : "space-y-3"}`}>
                    <Label
                      htmlFor="userName"
                      className={`font-semibold flex items-center gap-2 ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
                    >
                      <User className="h-4 w-4 text-green-600" />
                      用户名称
                    </Label>
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="请输入用户名称"
                      className={`
                    border-2 focus:border-green-500 transition-colors
                    ${isMobile ? "h-10 text-sm" : "h-11"}
                  `}
                    />
                  </div>

                  {/* Assistant Name */}
                  <div className={`${isMobile ? "space-y-2" : "space-y-3"}`}>
                    <Label
                      htmlFor="selfName"
                      className={`font-semibold flex items-center gap-2 ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
                    >
                      <Bot className="h-4 w-4 text-blue-600" />
                      助手名称
                    </Label>
                    <Input
                      id="selfName"
                      value={selfName}
                      onChange={(e) => setSelfName(e.target.value)}
                      placeholder="请输入助手名称"
                      className={`
                    border-2 focus:border-blue-500 transition-colors
                    ${isMobile ? "h-10 text-sm" : "h-11"}
                  `}
                    />
                  </div>
                </div>

                {/* Memory Section */}
                <div
                  className={`${
                    isMobile
                      ? "space-y-3"
                      : screenType === "tablet"
                      ? "space-y-4"
                      : "space-y-6"
                  }`}
                >
                  <h3
                    className={`
                    font-semibold text-gray-800 border-b border-gray-200 pb-2
                    ${
                      isMobile
                        ? "text-sm"
                        : screenType === "tablet"
                        ? "text-base"
                        : "text-lg"
                    }
                  `}
                  >
                    记忆配置
                  </h3>

                  <div
                    className={`
                     grid ${
                       isMobile
                         ? "gap-3"
                         : screenType === "tablet"
                         ? "gap-4"
                         : "gap-6"
                     }
                     grid-cols-1
                   `}
                  >
                    {/* Memory About Self */}
                    <div className={`${isMobile ? "space-y-2" : "space-y-3"}`}>
                      <Label
                        htmlFor="memoryAboutSelf"
                        className={`font-semibold flex items-center gap-2 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        <Bot className="h-4 w-4 text-purple-600" />
                        关于助手的记忆
                      </Label>
                      <Textarea
                        id="memoryAboutSelf"
                        value={memoryAboutSelf}
                        onChange={(e) => setMemoryAboutSelf(e.target.value)}
                        placeholder="描述助手的特点、性格等..."
                        rows={isMobile ? 4 : 5}
                        className={`
                      border-2 focus:border-purple-500 transition-colors resize-none
                      ${isMobile ? "text-sm" : ""}
                    `}
                      />
                    </div>

                    {/* Memory About User */}
                    <div className={`${isMobile ? "space-y-2" : "space-y-3"}`}>
                      <Label
                        htmlFor="memoryAboutUser"
                        className={`font-semibold flex items-center gap-2 ${
                          isMobile ? "text-xs" : "text-sm"
                        }`}
                      >
                        <User className="h-4 w-4 text-orange-600" />
                        关于用户的记忆
                      </Label>
                      <Textarea
                        id="memoryAboutUser"
                        value={memoryAboutUser}
                        onChange={(e) => setMemoryAboutUser(e.target.value)}
                        placeholder="记录用户的偏好、特点等..."
                        rows={isMobile ? 4 : 5}
                        className={`
                      border-2 focus:border-orange-500 transition-colors resize-none
                      ${isMobile ? "text-sm" : ""}
                    `}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className={`
                  flex gap-4 pt-6 border-t border-gray-200
                  ${isMobile ? "flex-col" : "flex-col sm:flex-row"}
                `}
                >
                  <Button
                    type="submit"
                    className={`
                      flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200
                      ${isMobile ? "h-11" : "h-12"}
                    `}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`
                      flex-1 border-2 hover:bg-gray-50 font-semibold transition-all duration-200
                      ${isMobile ? "h-11" : "h-12"}
                    `}
                    onClick={() => {
                      setUserName("用户");
                      setSelfName("小助手");
                      setMemoryAboutSelf("");
                      setMemoryAboutUser("");
                      toast.success("已重置为默认值");
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    重置
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent
              className={`${
                isMobile ? "p-3" : screenType === "tablet" ? "p-4" : "p-6"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`bg-blue-100 rounded-full ${
                    isMobile ? "p-1.5" : "p-2"
                  }`}
                >
                  <Info
                    className={`text-blue-600 ${
                      isMobile ? "h-4 w-4" : "h-5 w-5"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <h4
                    className={`font-semibold text-gray-800 ${
                      isMobile
                        ? "text-xs"
                        : screenType === "tablet"
                        ? "text-sm"
                        : "text-base"
                    }`}
                  >
                    使用说明
                  </h4>
                  <p
                    className={`text-gray-600 leading-relaxed ${
                      isMobile
                        ? "text-xs"
                        : screenType === "tablet"
                        ? "text-xs"
                        : "text-sm"
                    }`}
                  >
                    这些设置会立即生效并影响后续对话。若需要长期保存或跨设备同步，可在记忆管理中通过导出/导入完成备份与迁移。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
