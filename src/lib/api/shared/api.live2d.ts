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

const rabbitBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/rabbit-boy/兔兔【新.model3.json",
    scale: 0.35,
    // motionSync: '/live2d/example.motionsync.json'
    // 语音同步嘴形, 需要配合修改 <MessageBox /> / <ChatSimple /> 组件, 未来版本可能会支持
    // <MessageBox /> 的使用示例:
    // onClick={async () => {
    //   const audioBuffer = await (new AudioContext().decodeAudioData(audio!.buffer))
    //   live2d?.speak(audioBuffer)
    // }}
  });
  return model;
};

const dogBoyA = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/dog-boy-a/鱼香天天卷版权所有XIAOPmaiddress.model3.json",
    scale: 0.25,
  });
  return model;
};

const dogBoyB = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/dog-boy-b/鱼香天天卷版权所有守护灵小狗初始版.model3.json",
    scale: 0.28,
  });
  return model;
};

const evilBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/evil-boy/no4.新（基础）.model3.json",
    scale: 0.22,
  });
  return model;
};

const darkBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/dark-boy/紫汐.model3.json",
    scale: 0.25,
    position: [0, -50], // 稍微向下调整位置，确保头部完全显示
  });
  return model;
};

const hijiki = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/hijiki/runtime/hijiki.model3.json",
    scale: 0.25,
  });
  return model;
};

const tororo = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/tororo/runtime/tororo.model3.json",
    scale: 0.25,
  });
  return model;
};

const jiniqi = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/jiniqi/基尼奇.model3.json",
    scale: 0.22,
    position: [0, -30], // 向下调整位置，确保头部完全显示
  });
  return model;
};

const heroBoy = async () => {
  const l2d = getLive2d();
  const model = await l2d.create({
    path: "/live2d/hero-boy/live1.model3.json",
    scale: 0.25,
    position: [0, -40], // 向下调整位置，确保头部完全显示
  });
  return model;
};

export const live2dList: Live2dList = [
  { name: "兔兔{name}", load: rabbitBoy },
  { name: "狗狗{name} (日常版)", load: dogBoyB },
  { name: "狗狗{name} (女仆版)", load: dogBoyA },
  { name: "恶魔{name}", load: evilBoy },
  { name: "紫色{name}", load: darkBoy },
  { name: "勇者{name}", load: heroBoy },
  { name: "基尼奇", load: jiniqi },
  { name: "Hijiki", load: hijiki },
  { name: "Tororo", load: tororo },
];
