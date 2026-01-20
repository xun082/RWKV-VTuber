import { init } from "l2d";

// 延迟初始化Live2D，避免重复实例
let live2d: ReturnType<typeof init> | null = null;

const getLive2d = () => {
  if (!live2d) {
    const canvas = document.getElementById("live2d") as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Live2D canvas element not found");
    }
    live2d = init(canvas);
  }
  return live2d;
};

// 清理Live2D实例的函数
export const cleanupLive2d = () => {
  if (live2d) {
    // 清理canvas内容
    const canvas = document.getElementById("live2d") as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    live2d = null;
  }
};

// 页面卸载时清理
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanupLive2d);
}

const darkBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "./live2d/dark-boy/紫汐.model3.json",
    scale: 0.25,
    position: [0, -50], // 稍微向下调整位置，确保头部完全显示
  });
  return model;
};

const hijiki = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "./live2d/hijiki/runtime/hijiki.model3.json",
    scale: 0.25,
  });
  return model;
};

const tororo = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "./live2d/tororo/runtime/tororo.model3.json",
    scale: 0.25,
  });
  return model;
};

const jiniqi = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "./live2d/jiniqi/基尼奇.model3.json",
    scale: 0.22,
    position: [0, -30], // 向下调整位置，确保头部完全显示
  });
  return model;
};

const heroBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "./live2d/hero-boy/live1.model3.json",
    scale: 0.25,
    position: [0, -40], // 向下调整位置，确保头部完全显示
  });
  return model;
};

export const live2dList: Live2dList = [
  { name: "紫色{name}", load: darkBoy },
  { name: "勇者{name}", load: heroBoy },
  { name: "基尼奇", load: jiniqi },
  { name: "Hijiki", load: hijiki },
  { name: "Tororo", load: tororo },
];
