/**
 * Sherpa-ONNX 共享模块
 * 确保 TTS 和 ASR 使用同一个 sherpa-onnx 实例
 */

let sherpa_onnx_instance: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * 获取共享的 Sherpa-ONNX 实例（单例）
 */
export async function getSharedSherpaONNX(): Promise<any> {
  // 如果已经加载，直接返回
  if (sherpa_onnx_instance) {
    console.log("[Sherpa-Shared] 返回已加载的模块实例");
    return sherpa_onnx_instance;
  }

  // 如果正在加载，等待加载完成
  if (loadPromise) {
    console.log("[Sherpa-Shared] 等待模块加载完成...");
    return loadPromise;
  }

  // 开始加载模块（匹配参考代码 asr.js 的 ESM 方式）
  console.log("[Sherpa-Shared] 开始加载 sherpa-onnx 模块...");
  loadPromise = (async () => {
    try {
      // 使用 ES module 默认导入（完全匹配参考代码 asr.js）
      // import sherpa_onnx from "sherpa-onnx"
      const loaded = await import("sherpa-onnx" as any);
      sherpa_onnx_instance = loaded.default;

      if (!sherpa_onnx_instance) {
        console.error("[Sherpa-Shared] loaded.default 为空，尝试使用整个模块");
        sherpa_onnx_instance = loaded;
      }

      if (!sherpa_onnx_instance) {
        throw new Error("sherpa-onnx 模块为空");
      }

      console.log("[Sherpa-Shared] ✅ sherpa-onnx 模块加载成功");
      console.log(
        "[Sherpa-Shared] 模块类型:",
        sherpa_onnx_instance.constructor?.name || typeof sherpa_onnx_instance
      );
      console.log(
        "[Sherpa-Shared] 可用方法:",
        Object.keys(sherpa_onnx_instance)
          .filter((k) => typeof sherpa_onnx_instance[k] === "function")
          .slice(0, 15)
          .join(", ")
      );

      return sherpa_onnx_instance;
    } catch (error: any) {
      console.error("[Sherpa-Shared] ❌ 模块加载失败:", error.message);
      console.error("[Sherpa-Shared] 错误堆栈:", error.stack);
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * 检查模块是否已加载
 */
export function isSherpaONNXLoaded(): boolean {
  return sherpa_onnx_instance !== null;
}
