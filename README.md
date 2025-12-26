# RWKV-VTuber

一个基于 RWKV 模型的智能 VTuber 助手，具有长时记忆和自我概念。通过 Live2D 技术提供沉浸式交互体验，支持多种 AI 模型、语音合成、语音识别和记忆管理功能。

![示意图](./readme/intro.png)

## ✨ 核心特性

- 🧠 **智能记忆系统** - 基于向量检索的长时记忆，支持用户画像、自我概念和对话总结
- 🎭 **Live2D 角色** - 内置多个精美 Live2D 模型，支持表情、动作和语音同步
- 🎤 **语音交互** - 支持多种 TTS/STT 服务，实现真正的语音对话
- 🌐 **多平台支持** - 同时支持 Web 端和桌面端（Electron）
- ⚡ **高性能** - 优化的上下文管理，3000 tokens 内完成推理
- 🔧 **高度可配置** - 所有服务均可自定义配置，无需修改代码
- 🔄 **自动更新** - 桌面版支持从 GitHub Release 自动更新，保持应用最新

## 🚀 快速开始

### 在线体验

访问在线版本，配置 API 密钥即可开始使用：

1. 注册 [DeepSeek](https://deepseek.com) 或其他兼容 OpenAI 的服务
2. 获取 API Key
3. 在应用中配置推理服务

### 本地部署

```bash
# 克隆项目
git clone https://github.com/your-username/RWKV-VTuber.git
cd RWKV-VTuber

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev:web         # Web 端
pnpm electron:dev    # 桌面端 (Electron)

# 构建生产版本
pnpm build:web           # Web 端输出到 /dist-web
pnpm electron:build:all  # 桌面端所有平台
pnpm electron:build:mac  # 仅 macOS
pnpm electron:build:win  # 仅 Windows
pnpm electron:build:linux # 仅 Linux
```

## 📋 功能模块

| 模块         | 支持的服务          | 说明                             |
| ------------ | ------------------- | -------------------------------- |
| **推理模型** | OpenAI 兼容服务     | 支持 DeepSeek、Ollama、OpenAI 等 |
| **嵌入模型** | Jina Embeddings v3  | 用于记忆向量化和检索             |
| **语音合成** | F5 TTS、Fish Speech | 支持多种 TTS 服务                |
| **语音识别** | Web Speech API      | 浏览器内置 STT 功能              |
| **Live2D**   | 内置模型库          | 8+ 个精美角色模型                |
| **记忆管理** | IndexedDB + S3      | 本地存储 + 云端备份              |
| **天气信息** | 和风天气 API        | 可选功能                         |
| **云存储**   | AWS S3 兼容         | 配置和记忆云端同步               |

## 🎮 内置 Live2D 模型

项目内置了多个精美的 Live2D 角色：

- **紫汐** (dark-boy) - 暗色系角色，支持多种表情和动作
- **守护灵小狗** (dog-boy-a/b) - 可爱的小狗角色，女仆装和初始版
- **英雄男孩** (hero-boy) - 经典英雄形象
- **基尼奇** (jiniqi) - 独特设计角色
- **兔兔** (rabbit-boy) - 萌系兔子角色
- **Tororo** - 经典 Live2D 角色
- **Hijiki** - 另一个经典角色
- **Evil Boy** - 暗黑系角色

每个模型都支持：

- 眨眼动画
- 口型同步
- 多种表情切换
- 物理效果
- 自定义动作

## 🧠 智能记忆系统

### 记忆类型

1. **短时记忆** - 当前对话的上下文
2. **长时记忆** - 跨对话的重要信息
3. **用户画像** - 对用户的个性化认知
4. **自我概念** - AI 对自己的认知和个性

### 记忆管理

- **智能摘要** - 自动生成对话总结
- **重要性评分** - 根据对话内容自动评分
- **标签系统** - 自动提取关键词标签
- **向量检索** - 基于语义相似度的记忆召回
- **云端备份** - 支持 S3 存储同步

## ⚙️ 配置说明

### 推理服务配置

```typescript
// 支持的配置项
{
  endpoint: "https://api.deepseek.com/v1",  // API 地址
  apiKey: "your-api-key",                   // API 密钥
  modelName: "deepseek-chat"                // 模型名称
}
```

### 语音服务配置

```typescript
// TTS 服务配置
{
  f5TtsEndpoint: "http://127.0.0.1:5010/api",
  fishSpeechEndpoint: "http://127.0.0.1:8080",
  webSpeechConfig: {
    voice: "Microsoft Huihui - Chinese (Simplified, PRC)",
    lang: "zh-CN",
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  }
}
```

### Live2D 配置

```typescript
// Live2D 模型配置
{
  defaultLive2d: "dark-boy",     // 默认模型
  live2dPositionX: 0,            // X 轴位置
  live2dPositionY: 0,           // Y 轴位置
  live2dScale: 1.0,             // 缩放比例
}
```

## 🔧 开发指南

### 项目结构

```tree
src/
├── components/          # React 组件
│   ├── chat/           # 聊天相关组件
│   ├── ui/             # 基础 UI 组件
│   └── Layout/         # 布局组件
├── hooks/              # 自定义 Hooks
│   ├── useChatOperations.ts    # 聊天操作
│   ├── useSmartMemory.ts       # 智能记忆
│   └── useContextManager.ts    # 上下文管理
├── lib/                # 工具库
│   ├── api/            # API 接口
│   ├── db/             # 数据库操作
│   └── prompts.ts      # 提示词模板
├── pages/              # 页面组件
│   ├── chat/           # 聊天页面
│   ├── config/         # 配置页面
│   └── memory/         # 记忆管理页面
└── stores/             # 状态管理
    ├── useChatApi.ts   # 聊天 API
    ├── useSpeakApi.ts  # 语音 API
    └── useLive2dApi.ts # Live2D API
```

### 环境变量

| 变量名                 | 默认值  | 说明             |
| ---------------------- | ------- | ---------------- |
| `VITE_DEBUG_COMPONENT` | `'off'` | 开启调试组件显示 |

## 🔄 自动更新（桌面版）

桌面版（Electron）支持从 GitHub Release 自动更新，让您的应用始终保持最新。

### 功能特性

- ✅ 应用启动时自动检查更新
- ✅ 发现新版本时智能提示
- ✅ 实时显示下载进度和速度
- ✅ 一键安装更新，无需手动操作
- ✅ 支持在设置页面手动检查更新

### 使用方法

1. **自动检查**：应用启动后自动检查 GitHub Release 上的新版本
2. **下载更新**：发现新版本时，点击通知中的"立即下载"按钮
3. **安装更新**：下载完成后，选择"立即重启安装"或退出时自动安装
4. **手动检查**：在"配置 → 服务配置 → 系统设置"中手动检查更新

详细使用指南请参阅 [AUTO_UPDATE_GUIDE.md](./AUTO_UPDATE_GUIDE.md)

### 开发者说明

发布新版本时，需要：

1. 使用 `npm run release:create` 更新版本号
2. 构建所有平台安装包：`npm run electron:build:all`
3. 推送标签：`npm run release:push`
4. 在 GitHub 创建 Release 并上传安装包

**重要**：请在 `package.json` 中配置正确的 GitHub 仓库信息：

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-github-username",
        "repo": "your-repo-name"
      }
    ]
  }
}
```

### 构建脚本

```bash
# 开发模式
pnpm dev:web           # Web 端开发
pnpm electron:dev      # 桌面端开发 (Electron)

# 生产构建
pnpm build:web              # Web 端构建
pnpm electron:build         # 桌面端构建（当前平台）

# 多平台构建
pnpm electron:build:mac     # macOS (x64 + arm64)
pnpm electron:build:win     # Windows (x64)
pnpm electron:build:linux   # Linux (x64)
pnpm electron:build:all     # 所有平台
```

## 📚 API 文档

### 记忆管理 API

```typescript
// 添加记忆
await db.addMemory({
  content: "对话内容",
  summary: "智能摘要",
  timestamp: Date.now(),
  importance: 5,
  tags: ["标签1", "标签2"],
});

// 搜索相关记忆
const memories = await searchRelevantMemories(query, maxResults);

// 更新用户画像
await updateUserProfile(conversationSummary);
```

### Live2D 控制 API

```typescript
// 加载模型
const model = await live2d.loadModel("dark-boy");

// 播放动画
model.playMotion("Idle");

// 设置表情
model.setExpression("happy");

// 口型同步
model.syncLipSync(audioData);
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Live2D](https://www.live2d.com/) - 2D 角色动画技术
- [L2D](https://github.com/hacxy/l2d) - Live2D Web 渲染库
- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [electron-updater](https://www.electron.build/auto-update) - 自动更新功能
- [React](https://react.dev/) - 前端框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/your-username/RWKV-VTuber/issues)
2. 创建新的 Issue
3. 参与讨论

---

**RWKV-VTuber** - 让 AI 角色更加生动有趣！ 🎭✨

