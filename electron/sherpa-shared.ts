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

  // 开始加载模块
  console.log("[Sherpa-Shared] 开始加载 sherpa-onnx 模块...");
  loadPromise = (async () => {
    try {
      // 尝试多种导入方式
      const loaded = await import("sherpa-onnx" as any);

      console.log("[Sherpa-Shared] 模块加载完成，检查导出内容...");
      console.log(
        "[Sherpa-Shared] loaded.default 类型:",
        typeof loaded.default
      );
      console.log("[Sherpa-Shared] loaded 本身类型:", typeof loaded);
      console.log(
        "[Sherpa-Shared] loaded 的 keys:",
        Object.keys(loaded).slice(0, 20).join(", ")
      );

      // 尝试 1: 使用 default export
      if (loaded.default && typeof loaded.default === "object") {
        sherpa_onnx_instance = loaded.default;
        console.log("[Sherpa-Shared] 使用 loaded.default");
      }
      // 尝试 2: 直接使用 loaded（可能是 CommonJS 模块）
      else if (
        typeof loaded.createOfflineTts === "function" ||
        typeof loaded.createOnlineRecognizer === "function"
      ) {
        sherpa_onnx_instance = loaded;
        console.log("[Sherpa-Shared] 直接使用 loaded（CommonJS 风格）");
      }
      // 尝试 3: 可能需要 .default.default（某些打包工具的怪异行为）
      else if (loaded.default?.default) {
        sherpa_onnx_instance = loaded.default.default;
        console.log("[Sherpa-Shared] 使用 loaded.default.default");
      }
      // 尝试 4: 最后的尝试
      else {
        console.warn("[Sherpa-Shared] 未找到标准导出，尝试使用整个模块");
        sherpa_onnx_instance = loaded;
      }

      if (!sherpa_onnx_instance) {
        throw new Error("sherpa-onnx 模块为空");
      }

      // 详细的方法检查
      const allKeys = Object.keys(sherpa_onnx_instance);
      const functionKeys = allKeys.filter(
        (k) => typeof sherpa_onnx_instance[k] === "function"
      );

      console.log("[Sherpa-Shared] ✅ sherpa-onnx 模块加载成功");
      console.log(
        "[Sherpa-Shared] 模块类型:",
        sherpa_onnx_instance.constructor?.name || typeof sherpa_onnx_instance
      );
      console.log("[Sherpa-Shared] 总共有", allKeys.length, "个属性");
      console.log("[Sherpa-Shared] 其中", functionKeys.length, "个是函数");
      console.log("[Sherpa-Shared] 函数列表:", functionKeys.join(", "));

      // 关键方法检查
      console.log(
        "[Sherpa-Shared] createOfflineTts 存在?",
        typeof sherpa_onnx_instance.createOfflineTts === "function"
      );
      console.log(
        "[Sherpa-Shared] createOnlineRecognizer 存在?",
        typeof sherpa_onnx_instance.createOnlineRecognizer === "function"
      );

      return sherpa_onnx_instance;
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || String(error);
      console.error("[Sherpa-Shared] ❌ 模块加载失败:", errorMsg);
      console.error("[Sherpa-Shared] 错误对象:", error);
      if (error?.stack) {
        console.error("[Sherpa-Shared] 错误堆栈:", error.stack);
      }
      loadPromise = null;
      throw new Error(`Sherpa-ONNX 模块加载失败: ${errorMsg}`);
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
