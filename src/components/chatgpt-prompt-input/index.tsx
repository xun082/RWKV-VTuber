import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BarChart3, RotateCcw, Trash2, Volume2, VolumeX } from "lucide-react";
import { useSpeakApi } from "../../stores/useSpeakApi.ts";
import { toast } from "sonner";
// Dialog removed

type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean;
  }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
// Popover removed
// Dialog components removed

// --- SVG Icon Components ---
// Removed Plus and Settings icons
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {" "}
    <path
      d="M12 5.25L12 18.75"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
    <path
      d="M18.75 12L12 5.25L5.25 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
  </svg>
);
// XIcon removed
// Removed tool-related icons
// NEW: MicIcon
const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {" "}
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>{" "}
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>{" "}
    <line x1="12" y1="19" x2="12" y2="23"></line>{" "}
  </svg>
);

// Tools list removed

interface ChatActionsProps {
  disabled: boolean;
  messagesLength: number;
  usedToken?: number;
  onUpdateMemory: () => void;
  onClearChat: () => void;
}

interface PromptBoxProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange" | "onSubmit"
  > {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  loading?: boolean;
  allowSpeech?: {
    recording: boolean;
    onRecordingChange: (recording: boolean) => void;
  };
  header?: React.ReactNode;
  chatActions?: ChatActionsProps;
}

// --- The Final, Self-Contained PromptBox Component ---
export const PromptBox = React.forwardRef<HTMLDivElement, PromptBoxProps>(
  (
    {
      className,
      value: externalValue,
      onChange,
      onSubmit,
      disabled,
      loading,
      allowSpeech,
      header,
      chatActions,
      ...props
    },
    ref
  ) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [internalValue, setInternalValue] = React.useState("");
    // tool state removed
    const [isComposing, setIsComposing] = React.useState(false);

    // Chat actions logic
    const speak = useSpeakApi((state) => state.speak);
    const currentSpeakApi = useSpeakApi((state) => state.currentSpeakApi);
    const speakApiList = useSpeakApi((state) => state.speakApiList);
    const setSpeakApi = useSpeakApi((state) => state.setSpeakApi);

    const isSpeechEnabled = speak && currentSpeakApi !== "关闭";
    const hasMessages = chatActions ? chatActions.messagesLength > 0 : false;
    const isActionsDisabled = chatActions
      ? chatActions.disabled || !hasMessages
      : false;

    const toggleSpeech = async () => {
      try {
        if (isSpeechEnabled) {
          await setSpeakApi("关闭");
          toast.success("语音播放已关闭");
        } else {
          const availableService = speakApiList.find((name) => name !== "关闭");
          if (availableService) {
            await setSpeakApi(availableService);
            toast.success(`语音播放已开启 (${availableService})`);
          } else {
            toast.warning("没有可用的语音服务");
          }
        }
      } catch (error) {
        console.error("切换语音服务失败:", error);
        toast.error("切换语音服务失败");
      }
    };

    // Use external value if provided, otherwise use internal state
    const value = externalValue !== undefined ? externalValue : internalValue;
    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (externalValue === undefined) {
        setInternalValue(newValue);
      }
      if (onChange) {
        onChange(newValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        if (!disabled && !loading && value.trim() && onSubmit) {
          onSubmit();
        }
      }
    };

    const handleSubmit = () => {
      if (!disabled && !loading && value.trim() && onSubmit) {
        onSubmit();
      }
    };
    const hasValue = value.trim().length > 0;

    return (
      <div ref={ref} className="w-full">
        {header && <div className="mb-2">{header}</div>}

        <div
          className={cn(
            "flex flex-col rounded-2xl p-3 shadow-lg transition-all duration-300 bg-white/95 dark:bg-gray-800/95 border border-gray-200/40 dark:border-gray-700/40 cursor-text hover:shadow-xl hover:border-blue-300/70 dark:hover:border-blue-600/70 focus-within:border-blue-400/90 dark:focus-within:border-blue-500/90 focus-within:shadow-xl focus-within:shadow-blue-500/20 backdrop-blur-sm ring-1 ring-white/20 dark:ring-gray-700/20",
            className
          )}
        >
          {/* Image attach and preview removed */}

          <textarea
            ref={internalTextareaRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={props.placeholder || "Message..."}
            disabled={disabled}
            className="custom-scrollbar w-full resize-none border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none min-h-10 text-base leading-relaxed p-1 font-medium"
            {...props}
          />

          {/* 底部操作区域 - 微信风格 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100/60 dark:border-gray-700/60 mt-2">
            <TooltipProvider delayDuration={100}>
              {/* 左侧操作按钮 */}
              <div className="flex items-center gap-1">
                {chatActions && hasMessages && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={isActionsDisabled}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-purple-200 dark:hover:border-purple-700/50"
                        >
                          <Trash2 size={14} />
                          <span>更新记忆</span>
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            确认更新记忆
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            您确定要立即更新记忆吗？这将把当前对话保存到记忆中并清空当前对话。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                          <AlertDialogCancel className="rounded-xl">
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={chatActions.onUpdateMemory}
                            className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                          >
                            确定
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={isActionsDisabled}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-red-200 dark:hover:border-red-700/50"
                        >
                          <RotateCcw size={14} />
                          <span>清除对话</span>
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                            确认清除对话
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            您确定要清除当前对话吗？此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                          <AlertDialogCancel className="rounded-xl">
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={chatActions.onClearChat}
                            className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                          >
                            确定
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {/* 语音开关按钮 */}
                <button
                  onClick={toggleSpeech}
                  disabled={disabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent ${
                    isSpeechEnabled
                      ? "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-700/50"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600/50"
                  }`}
                  title={
                    isSpeechEnabled
                      ? `语音播放已开启 (${currentSpeakApi})`
                      : "语音播放已关闭"
                  }
                >
                  {isSpeechEnabled ? (
                    <Volume2 size={14} />
                  ) : (
                    <VolumeX size={14} />
                  )}
                  <span>{isSpeechEnabled ? "语音开启" : "语音关闭"}</span>
                </button>

                {/* Token统计 */}
                {chatActions &&
                  typeof chatActions.usedToken === "number" &&
                  chatActions.usedToken > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          disabled={disabled}
                          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-blue-200 dark:hover:border-blue-700/50"
                        >
                          <BarChart3 size={14} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/60 dark:border-gray-700/60">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                          <p className="text-sm font-medium">
                            上次词元用量:{" "}
                            <span className="text-blue-600 dark:text-blue-400">
                              {chatActions.usedToken}
                            </span>
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
              </div>

              {/* 右侧按钮 */}
              <div className="flex items-center gap-2">
                {allowSpeech && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          allowSpeech.onRecordingChange(!allowSpeech.recording)
                        }
                        disabled={disabled}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none hover:scale-105 active:scale-95 border",
                          allowSpeech.recording
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse border-red-400"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                        )}
                      >
                        <MicIcon className="h-4 w-4" />
                        <span className="sr-only">Record voice</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" showArrow={true}>
                      <p>
                        {allowSpeech.recording
                          ? "Stop recording"
                          : "Record voice"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={disabled || loading || !hasValue}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-700/40 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none hover:scale-105 active:scale-95 border border-blue-500/20"
                    >
                      {loading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <SendIcon className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {loading ? "Processing..." : "Send message"}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>{loading ? "Processing..." : "Send"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  }
);
PromptBox.displayName = "PromptBox";
