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
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  ArrowUp,
  BarChart3,
  Mic,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import React from "react";

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
        "relative z-50 max-w-[280px] rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white px-3 py-2 text-xs font-medium shadow-xl backdrop-blur-sm border border-gray-700/50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 cursor-default",
        className
      )}
      {...props}
    >
      {props.children}
      {showArrow && (
        <TooltipPrimitive.Arrow className="-my-px fill-gray-900/95 dark:fill-gray-800/95" />
      )}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface ChatActionsProps {
  disabled: boolean;
  messagesLength: number;
  usedToken?: number;
  onUpdateMemory: () => void;
  onClearChat: () => void;
  autoTTS: boolean;
  onToggleAutoTTS: () => void;
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
    const [isComposing, setIsComposing] = React.useState(false);
    const [showRecordingTip, setShowRecordingTip] = React.useState(false);

    const hasMessages = chatActions ? chatActions.messagesLength > 0 : false;
    const isActionsDisabled = chatActions
      ? chatActions.disabled || !hasMessages
      : false;

    const value = externalValue !== undefined ? externalValue : internalValue;

    // 监听录音状态变化，显示提示
    React.useEffect(() => {
      if (allowSpeech?.recording) {
        setShowRecordingTip(true);
      } else {
        // 延迟隐藏提示，让用户看到录音已停止
        const timer = setTimeout(() => {
          setShowRecordingTip(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [allowSpeech?.recording]);

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

        {/* 录音状态提示 */}
        {showRecordingTip && allowSpeech?.recording && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-linear-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-red-950/30 border border-red-200 dark:border-red-800/50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-2 h-2 bg-red-600 rounded-full"></div>
              </div>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                正在录音中...
              </span>
              <div className="flex items-center gap-0.5 ml-2">
                <div
                  className="w-1 h-2 bg-red-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1 h-3 bg-red-500 rounded-full animate-pulse"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-1 h-4 bg-red-500 rounded-full animate-pulse"
                  style={{ animationDelay: "300ms" }}
                ></div>
                <div
                  className="w-1 h-3 bg-red-500 rounded-full animate-pulse"
                  style={{ animationDelay: "450ms" }}
                ></div>
                <div
                  className="w-1 h-2 bg-red-500 rounded-full animate-pulse"
                  style={{ animationDelay: "600ms" }}
                ></div>
              </div>
            </div>
            <span className="text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
              再次点击停止
            </span>
          </div>
        )}

        <div
          className={cn(
            "group flex flex-col rounded-xl p-2.5 sm:p-3 shadow-md transition-all duration-300 cursor-text",
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
            "border border-gray-200/50 dark:border-gray-700/50",
            "hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-600/60",
            "focus-within:border-blue-500/70 dark:focus-within:border-blue-400/70",
            "focus-within:shadow-lg focus-within:shadow-blue-500/10 dark:focus-within:shadow-blue-400/10",
            "focus-within:ring-1 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20",
            allowSpeech?.recording &&
              "border-red-300 dark:border-red-700/70 ring-2 ring-red-500/20 dark:ring-red-400/20",
            className
          )}
        >
          <textarea
            ref={internalTextareaRef}
            rows={1}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={props.placeholder || "输入消息..."}
            disabled={disabled}
            className="custom-scrollbar w-full resize-none border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 focus-visible:outline-none min-h-7 text-sm leading-relaxed px-0.5 py-0.5 font-normal"
            {...props}
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-700/50 mt-2">
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {chatActions && hasMessages && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          disabled={isActionsDisabled}
                          className="cursor-pointer group/btn flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-linear-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600/50 hover:text-purple-700 dark:hover:text-purple-300 hover:shadow-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover/btn:rotate-12 pointer-events-none" />
                          <span className="hidden sm:inline pointer-events-none">
                            更新记忆
                          </span>
                          <span className="sm:hidden pointer-events-none">
                            记忆
                          </span>
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 shadow-2xl cursor-default">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                            确认更新记忆
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            您确定要立即更新记忆吗？这将把当前对话保存到记忆中并清空当前对话。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-3">
                          <AlertDialogCancel className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={chatActions.onUpdateMemory}
                            className="rounded-xl bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all cursor-pointer"
                          >
                            确定
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          disabled={isActionsDisabled}
                          className="cursor-pointer group/btn flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-linear-to-r hover:from-red-50 hover:to-orange-50 dark:hover:from-red-950/30 dark:hover:to-orange-950/30 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600/50 hover:text-red-700 dark:hover:text-red-300 hover:shadow-sm"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover/btn:-rotate-180 pointer-events-none" />
                          <span className="hidden sm:inline pointer-events-none">
                            清除对话
                          </span>
                          <span className="sm:hidden pointer-events-none">
                            清除
                          </span>
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 shadow-2xl cursor-default">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-bold bg-linear-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                            确认清除对话
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            清空当前界面显示的聊天记录，让界面更清爽。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-3">
                          <AlertDialogCancel className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={chatActions.onClearChat}
                            className="rounded-xl bg-linear-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all cursor-pointer"
                          >
                            确定
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {chatActions && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={chatActions.onToggleAutoTTS}
                        disabled={disabled}
                        className={cn(
                          "cursor-pointer group/btn flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 border hover:shadow-sm",
                          chatActions.autoTTS
                            ? "text-emerald-700 dark:text-emerald-300 bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-300 dark:border-emerald-700/50 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/40 dark:hover:to-green-900/40"
                            : "text-gray-700 dark:text-gray-300 bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        {chatActions.autoTTS ? (
                          <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover/btn:scale-110 pointer-events-none" />
                        ) : (
                          <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover/btn:scale-110 pointer-events-none" />
                        )}
                        <span className="hidden sm:inline pointer-events-none">
                          {chatActions.autoTTS ? "自动播放" : "手动播放"}
                        </span>
                        <span className="sm:hidden pointer-events-none">
                          {chatActions.autoTTS ? "自动" : "手动"}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" showArrow={true}>
                      <p>
                        {chatActions.autoTTS
                          ? "AI回复时自动播放语音"
                          : "AI回复时不自动播放语音"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {chatActions &&
                  typeof chatActions.usedToken === "number" &&
                  chatActions.usedToken > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          disabled={disabled}
                          className="cursor-pointer flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-gray-600 dark:text-gray-400 bg-transparent hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm"
                        >
                          <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="rounded-xl bg-white dark:bg-gray-900 backdrop-blur-xl border-gray-200 dark:border-gray-700 shadow-xl cursor-default">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-linear-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            上次词元用量:{" "}
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {chatActions.usedToken}
                            </span>
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
              </div>

              <div className="flex items-center gap-1.5">
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
                          "group/mic flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 disabled:opacity-40 disabled:cursor-not-allowed",
                          allowSpeech.recording
                            ? "bg-linear-to-br from-red-500 via-red-600 to-rose-600 text-white shadow-lg shadow-red-500/40 animate-pulse border border-red-400 dark:border-red-400 scale-105"
                            : "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-linear-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:ring-blue-500/30"
                        )}
                      >
                        <Mic
                          className={cn(
                            "cursor-pointer h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                            allowSpeech.recording
                              ? "scale-110"
                              : "group-hover/mic:scale-110"
                          )}
                        />
                        <span className="sr-only">
                          {allowSpeech.recording ? "停止录音" : "开始录音"}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" showArrow={true}>
                      <p>
                        {allowSpeech.recording
                          ? "点击停止录音"
                          : "点击开始语音输入"}
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
                      className={cn(
                        "group/send flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed border",
                        disabled || loading || !hasValue
                          ? "bg-linear-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-500 border-gray-300 dark:border-gray-700 opacity-50"
                          : "bg-linear-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-700/40 border-blue-400 dark:border-blue-500 hover:scale-105 active:scale-95"
                      )}
                    >
                      {loading ? (
                        <div className="relative">
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/send:-translate-y-0.5 group-active/send:translate-y-0" />
                      )}
                      <span className="sr-only">
                        {loading ? "发送中..." : "发送消息"}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>{loading ? "发送中..." : "发送 (Enter)"}</p>
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
