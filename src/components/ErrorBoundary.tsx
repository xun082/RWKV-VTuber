import React, { Component, type ReactNode } from "react";
import { errorLogger } from "@/lib/error-logger";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React 错误边界组件
 * 捕获子组件树中的JavaScript错误，记录错误并显示降级UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到日志系统
    errorLogger.logReactError(error, errorInfo.componentStack ?? undefined);

    // 更新状态
    this.setState({
      errorInfo,
    });

    // 调用可选的错误回调
    this.props.onError?.(error, errorInfo);

    // 在开发环境输出详细错误信息
    if (import.meta.env.DEV) {
      console.error("React Error Boundary 捕获错误:", error);
      console.error("组件栈:", errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义的降级UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认的错误UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
            {/* 错误图标 */}
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* 错误标题 */}
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                抱歉，出现了一些问题
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                应用程序遇到了意外错误，错误已被记录
              </p>
            </div>

            {/* 错误详情（仅在开发环境显示） */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 space-y-2">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
                      查看堆栈跟踪
                    </summary>
                    <pre className="mt-2 text-[10px] overflow-auto max-h-40 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
              <Button onClick={this.handleReload} className="flex-1">
                刷新页面
              </Button>
            </div>

            {/* 提示信息 */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-500">
              如果问题持续存在，请在服务配置页面导出错误日志
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 简化版的错误边界（用于局部组件）
 */
export class LocalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorLogger.logReactError(error, errorInfo.componentStack ?? undefined);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                组件加载失败
              </p>
              {import.meta.env.DEV && this.state.error && (
                <p className="text-xs text-red-700 dark:text-red-300">
                  {this.state.error.message}
                </p>
              )}
              <Button
                onClick={this.handleReset}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                重试
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
