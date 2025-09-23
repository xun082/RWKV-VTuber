import { Brain, Layers, Clock, Tag } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface MemoryIndicatorProps {
  contextInfo?: {
    messagesCount: number;
    memoriesCount: number;
    tokenEstimate: {
      total: number;
      history: number;
      memories: number;
      query: number;
    };
  } | null;
  conversationPattern?: {
    type: string;
    description: string;
    messageCount: number;
  } | null;
  className?: string;
}

export function MemoryIndicator({
  contextInfo,
  conversationPattern,
  className = "",
}: MemoryIndicatorProps) {
  if (!contextInfo && !conversationPattern) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card
        className={`p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200/50 dark:border-blue-700/50 ${className}`}
      >
        <div className="flex items-center gap-3 text-sm">
          {/* 智能记忆指示器 */}
          {contextInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">
                    {contextInfo.memoriesCount}
                  </span>
                  <span className="text-xs opacity-75">记忆</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>已加载 {contextInfo.memoriesCount} 条相关记忆</p>
                  <p className="text-xs opacity-75">
                    记忆占用: {contextInfo.tokenEstimate.memories} tokens
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 上下文消息指示器 */}
          {contextInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <Layers className="w-4 h-4" />
                  <span className="font-medium">
                    {contextInfo.messagesCount}
                  </span>
                  <span className="text-xs opacity-75">历史</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>上下文包含 {contextInfo.messagesCount} 条历史消息</p>
                  <p className="text-xs opacity-75">
                    历史占用: {contextInfo.tokenEstimate.history} tokens
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 对话模式指示器 */}
          {conversationPattern && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs gap-1 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400"
                >
                  <Tag className="w-3 h-3" />
                  {conversationPattern.description}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>对话类型: {conversationPattern.description}</p>
                  <p className="text-xs opacity-75">
                    消息总数: {conversationPattern.messageCount}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Token使用情况 */}
          {contextInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {Math.round(contextInfo.tokenEstimate.total)}
                  </span>
                  <span className="text-xs opacity-75">tokens</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>
                    总Token使用: {Math.round(contextInfo.tokenEstimate.total)}
                  </p>
                  <div className="text-xs opacity-75 space-y-0.5">
                    <div>
                      历史: {Math.round(contextInfo.tokenEstimate.history)}
                    </div>
                    <div>
                      记忆: {Math.round(contextInfo.tokenEstimate.memories)}
                    </div>
                    <div>
                      查询: {Math.round(contextInfo.tokenEstimate.query)}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </Card>
    </TooltipProvider>
  );
}
