// ListenApiList 类型已在全局 types.d.ts 中定义
// Electron 环境使用 electron/api.listen.ts 中的 Sherpa-ONNX 实现

export type ListenApi = (callback?: (text: string) => void) => {
  result: Promise<string>;
  start: () => void;
  stop: () => void;
};
export type ListenApiTest = () => Promise<boolean>;

// 空列表，Electron 环境使用专门的 Sherpa-ONNX 实现
export const listenApiList: ListenApiList = [];
