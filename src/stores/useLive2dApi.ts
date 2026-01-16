import type { Model } from "l2d";
import { create } from "zustand";
import { cleanupLive2d } from "../lib/api/shared/api.live2d.ts";
import { get, live2dList, set } from "../lib/utils.ts";

// ==================== 常量定义 ====================
// 直接使用路径而不是 import，确保能获取最新的文件
const DEFAULT_BACKGROUND = "/back.jpg";
const DEFAULT_LIVE2D_NAME = "Tororo";
const DEFAULT_POSITION = 0;
const DEFAULT_SCALE = 1.0;

const STORAGE_KEYS = {
  BACKGROUND: "background_image",
  DEFAULT_LIVE2D: "default_live2d",
  IS_FULLSCREEN: "is_full_screen",
  POSITION_X: "live2d_position_x",
  POSITION_Y: "live2d_position_y",
  SCALE: "live2d_scale",
} as const;

const DOM_IDS = {
  MESSAGE: "live2d-message",
  TIMER_KEY: "hide-live2d-message-timer",
} as const;

const TIPS_OPACITY = {
  VISIBLE: "0.9",
  HIDDEN: "0",
} as const;

// ==================== 类型定义 ====================
type Live2dAPI = {
  // Live2D 模型相关
  live2d: Model | null;
  live2dList: string[];
  live2dName: string;
  live2dOpen: boolean;
  setLive2dOpen: (open: boolean) => Promise<void>;
  _loadLive2d: () => Promise<Model>;
  setLoadLive2d: (name: string) => Promise<void>;

  // 位置和缩放
  live2dPositionX: number;
  live2dPositionY: number;
  live2dScale: number;
  setLive2dPositionX: (position: number) => Promise<void>;
  setLive2dPositionY: (position: number) => Promise<void>;
  setLive2dScale: (scale: number) => Promise<void>;

  // 提示消息
  showTips: () => void;
  hideTips: (inSeconds?: number) => void;
  setTips: (tips: string) => void;

  // 背景和全屏
  background: string;
  setBackground: (background?: string) => Promise<void>;
  isFullScreen: boolean;
  setIsFullScreen: (isFullScreen: boolean) => Promise<void>;
};

// ==================== 工具函数 ====================
/**
 * 从存储中获取数字值
 */
const getNumberFromStorage = async (
  key: string,
  defaultValue: number,
  parser: (value: string) => number = Number.parseFloat
): Promise<number> => {
  const value = await get(key);
  return value ? parser(value as string) : defaultValue;
};

/**
 * 从存储中获取布尔值
 */
const getBooleanFromStorage = async (
  key: string,
  defaultValue = false
): Promise<boolean> => {
  const value = await get(key);
  return value === "true" ? true : value === "false" ? false : defaultValue;
};

/**
 * 获取 Live2D 消息元素
 */
const getLive2dMessageElement = (): HTMLElement | null => {
  return document.getElementById(DOM_IDS.MESSAGE);
};

/**
 * 清除隐藏定时器
 */
const clearHideTimer = (): void => {
  const timer = sessionStorage.getItem(DOM_IDS.TIMER_KEY);
  if (timer) {
    clearTimeout(Number.parseInt(timer));
    sessionStorage.removeItem(DOM_IDS.TIMER_KEY);
  }
};

/**
 * 设置元素透明度
 */
const setElementOpacity = (element: HTMLElement, opacity: string): void => {
  element.style.opacity = opacity;
};

// ==================== 初始化默认值 ====================
/**
 * 异步初始化默认配置
 */
const initializeDefaults = async () => {
  const background = (await get(STORAGE_KEYS.BACKGROUND)) || DEFAULT_BACKGROUND;
  const localLive2d = await get(STORAGE_KEYS.DEFAULT_LIVE2D);

  // 优先使用用户保存的模型；否则默认选择 Tororo；最后降级到列表第一个
  const defaultLive2d =
    live2dList.find(({ name }) => name === localLive2d) ??
    live2dList.find(({ name }) => name === DEFAULT_LIVE2D_NAME) ??
    live2dList[0];

  const isFullScreen = await getBooleanFromStorage(STORAGE_KEYS.IS_FULLSCREEN);
  const positionX = await getNumberFromStorage(
    STORAGE_KEYS.POSITION_X,
    DEFAULT_POSITION,
    Number.parseInt
  );
  const positionY = await getNumberFromStorage(
    STORAGE_KEYS.POSITION_Y,
    DEFAULT_POSITION,
    Number.parseInt
  );
  const scale = await getNumberFromStorage(STORAGE_KEYS.SCALE, DEFAULT_SCALE);

  return {
    background,
    defaultLive2d,
    isFullScreen,
    positionX,
    positionY,
    scale,
  };
};

const defaults = await initializeDefaults();

// ==================== Store 定义 ====================
export const useLive2dApi = create<Live2dAPI>()((setState, getState) => ({
  // ==================== Live2D 模型管理 ====================
  live2d: null,
  live2dList: live2dList.map(({ name }) => name),
  live2dName: defaults.defaultLive2d.name,
  live2dOpen: false,
  _loadLive2d: defaults.defaultLive2d.load,

  /**
   * 打开或关闭 Live2D 显示
   */
  setLive2dOpen: async (open) => {
    if (open) {
      const { _loadLive2d } = getState();
      const model = await _loadLive2d();
      setState({ live2dOpen: true, live2d: model });
    } else {
      const { live2d } = getState();
      if (live2d) {
        live2d.destroy();
        cleanupLive2d();
      }
      setState({ live2dOpen: false, live2d: null });
    }
  },

  /**
   * 加载指定名称的 Live2D 模型
   */
  setLoadLive2d: async (name) => {
    const { live2dOpen, live2d } = getState();
    const item = live2dList.find((model) => model.name === name);

    if (!item) {
      console.error(`Live2D model "${name}" not found`);
      return;
    }

    // 清理旧模型
    if (live2d) {
      live2d.destroy();
      cleanupLive2d();
    }

    await set(STORAGE_KEYS.DEFAULT_LIVE2D, name);

    // 根据当前状态决定是否立即加载模型
    if (live2dOpen) {
      const model = await item.load();
      setState({ _loadLive2d: item.load, live2dName: name, live2d: model });
    } else {
      setState({ _loadLive2d: item.load, live2dName: name, live2d: null });
    }
  },

  // ==================== 位置和缩放管理 ====================
  live2dPositionX: defaults.positionX,
  live2dPositionY: defaults.positionY,
  live2dScale: defaults.scale,

  setLive2dPositionX: async (position) => {
    setState({ live2dPositionX: position });
    await set(STORAGE_KEYS.POSITION_X, position.toString());
  },

  setLive2dPositionY: async (position) => {
    setState({ live2dPositionY: position });
    await set(STORAGE_KEYS.POSITION_Y, position.toString());
  },

  setLive2dScale: async (scale) => {
    setState({ live2dScale: scale });
    await set(STORAGE_KEYS.SCALE, scale.toString());
  },

  // ==================== 提示消息管理 ====================
  /**
   * 显示提示消息
   */
  showTips: () => {
    clearHideTimer();
    const element = getLive2dMessageElement();
    if (element) {
      setElementOpacity(element, TIPS_OPACITY.VISIBLE);
    }
  },

  /**
   * 隐藏提示消息
   * @param inSeconds 延迟隐藏的秒数（可选）
   */
  hideTips: (inSeconds) => {
    clearHideTimer();
    const element = getLive2dMessageElement();

    if (!element) return;

    if (inSeconds) {
      const timerId = setTimeout(() => {
        setElementOpacity(element, TIPS_OPACITY.HIDDEN);
      }, inSeconds * 1000);
      sessionStorage.setItem(DOM_IDS.TIMER_KEY, timerId.toString());
    } else {
      setElementOpacity(element, TIPS_OPACITY.HIDDEN);
    }
  },

  /**
   * 设置提示消息内容
   */
  setTips: (tips) => {
    const element = getLive2dMessageElement();
    if (element) {
      element.innerText = tips;
    }
  },

  // ==================== 背景和全屏管理 ====================
  background: defaults.background as string,

  setBackground: async (background) => {
    const newBackground = background || DEFAULT_BACKGROUND;
    setState({ background: newBackground });
    await set(STORAGE_KEYS.BACKGROUND, newBackground);
  },

  isFullScreen: defaults.isFullScreen,

  setIsFullScreen: async (isFullScreen) => {
    setState({ isFullScreen });
    await set(STORAGE_KEYS.IS_FULLSCREEN, isFullScreen.toString());
  },
}));
