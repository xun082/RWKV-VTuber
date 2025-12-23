import { db, type ErrorLog } from "./db/index";

/**
 * 错误日志服务
 * 负责捕捉和记录应用中的所有错误
 */
class ErrorLogger {
  private initialized = false;
  private maxLogs = 1000; // 最多保存1000条日志
  private logQueue: Array<Omit<ErrorLog, "id">> = [];
  private isProcessing = false;

  /**
   * 初始化错误日志系统
   */
  init() {
    if (this.initialized) return;

    // 捕捉全局JavaScript错误
    window.addEventListener("error", this.handleGlobalError);

    // 捕捉未处理的Promise拒绝
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection
    );

    this.initialized = true;
  }

  /**
   * 销毁错误日志系统
   */
  destroy() {
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection
    );
    this.initialized = false;
  }

  /**
   * 处理全局错误事件
   */
  private handleGlobalError = (event: ErrorEvent) => {
    event.preventDefault(); // 阻止默认的错误处理

    this.logError({
      type: "javascript",
      message: event.message,
      stack: event.error?.stack,
      url: event.filename,
      metadata: {
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  /**
   * 处理未捕获的Promise拒绝
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault(); // 阻止默认的错误处理

    const reason = event.reason;
    let message = "未处理的Promise拒绝";
    let stack: string | undefined;

    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack;
    } else if (typeof reason === "string") {
      message = reason;
    } else {
      message = JSON.stringify(reason);
    }

    this.logError({
      type: "promise",
      message,
      stack,
    });
  };

  /**
   * 记录React错误边界捕获的错误
   */
  logReactError(error: Error, componentStack?: string) {
    this.logError({
      type: "react",
      message: error.message,
      stack: error.stack,
      componentStack,
    });
  }

  /**
   * 记录网络错误
   */
  logNetworkError(url: string, error: Error | string) {
    this.logError({
      type: "network",
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "string" ? undefined : error.stack,
      url,
    });
  }

  /**
   * 记录自定义错误
   */
  logCustomError(message: string, metadata?: Record<string, any>) {
    this.logError({
      type: "custom",
      message,
      metadata,
    });
  }

  /**
   * 统一的错误记录方法
   */
  private logError(errorData: Partial<ErrorLog>) {
    const errorLog: Omit<ErrorLog, "id"> = {
      timestamp: Date.now(),
      message: errorData.message || "未知错误",
      type: errorData.type || "custom",
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      url: errorData.url || window.location.href,
      userAgent: navigator.userAgent,
      metadata: errorData.metadata,
    };

    // 添加到队列
    this.logQueue.push(errorLog);

    // 异步处理队列
    this.processQueue();

    // 在开发环境下也输出到控制台
    if (import.meta.env.DEV) {
      console.error("🔴 捕获错误:", errorLog);
    }
  }

  /**
   * 处理错误日志队列
   */
  private async processQueue() {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // 批量处理队列中的错误
      const logsToProcess = [...this.logQueue];
      this.logQueue = [];

      for (const log of logsToProcess) {
        try {
          await db.addErrorLog(log);
        } catch (error) {
          console.error("保存错误日志失败:", error);
          // 如果保存失败，重新加入队列（但不要无限重试）
          if (this.logQueue.length < 100) {
            this.logQueue.push(log);
          }
        }
      }

      // 检查是否需要清理旧日志
      await this.cleanupOldLogs();
    } finally {
      this.isProcessing = false;

      // 如果队列中还有日志，继续处理
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * 清理旧的错误日志
   */
  private async cleanupOldLogs() {
    try {
      const allLogs = await db.getAllErrorLogs();
      if (allLogs.length > this.maxLogs) {
        // 保留最新的maxLogs条，删除其他的
        const logsToKeep = allLogs.slice(0, this.maxLogs);
        const oldestTimestamp =
          logsToKeep[logsToKeep.length - 1]?.timestamp || 0;

        // 删除比这个时间戳更早的日志
        await db.errorLogs.where("timestamp").below(oldestTimestamp).delete();
      }
    } catch (error) {
      console.error("清理旧日志失败:", error);
    }
  }

  /**
   * 获取所有错误日志
   */
  async getAllLogs(): Promise<ErrorLog[]> {
    try {
      return await db.getAllErrorLogs();
    } catch (error) {
      console.error("获取错误日志失败:", error);
      return [];
    }
  }

  /**
   * 清除所有错误日志
   */
  async clearAllLogs(): Promise<void> {
    try {
      await db.clearErrorLogs();
    } catch (error) {
      console.error("清除错误日志失败:", error);
      throw error;
    }
  }

  /**
   * 获取错误统计
   */
  async getStats() {
    try {
      return await db.getErrorStats();
    } catch (error) {
      console.error("获取错误统计失败:", error);
      return { total: 0, byType: {} };
    }
  }

  /**
   * 导出错误日志为JSON
   */
  async exportToJSON(): Promise<string> {
    const logs = await this.getAllLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出错误日志为JSONL格式
   */
  async exportToJSONL(): Promise<string> {
    const logs = await this.getAllLogs();
    return logs.map((log) => JSON.stringify(log)).join("\n");
  }
}

// 创建单例
export const errorLogger = new ErrorLogger();
