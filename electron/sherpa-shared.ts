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
  if (sherpa_onnx_instance) {
    return sherpa_onnx_instance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  console.log("[Sherpa-ONNX] 加载模块...");
  loadPromise = (async () => {
    try {
      const loaded = await import("sherpa-onnx" as any);

      // 智能选择导出方式
      sherpa_onnx_instance = loaded.default?.createOfflineTts
        ? loaded.default
        : loaded.createOfflineTts
        ? loaded
        : loaded.default?.default?.createOfflineTts
        ? loaded.default.default
        : loaded.default;

      if (!sherpa_onnx_instance?.createOfflineTts) {
        throw new Error("sherpa-onnx 模块缺少 createOfflineTts 方法");
      }

      console.log("[Sherpa-ONNX] ✓ 模块加载成功");
      return sherpa_onnx_instance;
    } catch (error: any) {
      loadPromise = null;
      throw new Error(`Sherpa-ONNX 加载失败: ${error?.message || error}`);
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
