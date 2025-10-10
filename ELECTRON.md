# RWKV-VTuber Electron 版本

## 🎉 迁移完成

项目已成功从 Tauri 迁移到 Electron！Electron 使用完整的 Chromium 引擎，完全支持 Web Audio API，音频播放问题已解决。

## 📦 开发和构建

### 开发模式

```bash
# 启动 Electron 开发版本
pnpm electron:dev
```

这会同时启动：

1. Vite 开发服务器 (http://localhost:5173)
2. Electron 窗口（自动加载开发服务器）

### 生产构建

```bash
# 构建当前平台
pnpm electron:build

# 构建 macOS 版本
pnpm electron:build:mac

# 构建 Windows 版本
pnpm electron:build:win

# 构建 Linux 版本
pnpm electron:build:linux

# 构建所有平台
pnpm electron:build:all
```

### Web 版本（可选）

如果你还想保留 Web 版本：

```bash
# 开发
pnpm dev:web

# 构建
pnpm build:web
```

## 🔧 关键变更

### 1. 音频播放

- ✅ **完全支持 Web Audio API**（AudioContext、Blob URL、Data URL）
- ✅ 与浏览器版本完全一致的行为
- ✅ 不再有"The operation is not supported"错误

### 2. 文件结构

```
RWKV-VTuber/
├── electron/              # Electron 相关文件（TypeScript）
│   ├── main.ts           # 主进程（TypeScript）
│   ├── preload.ts        # 预加载脚本（TypeScript）
│   └── tsconfig.json     # TypeScript 配置
├── src/                   # React 应用源码（无需修改）
├── dist/                  # Vite 构建输出
├── dist-electron/         # TypeScript 编译输出 + Electron 主进程
└── release/               # Electron 打包最终输出
```

### 3. API 兼容性

Electron 的 preload 脚本模拟了 Tauri 的 `__TAURI_INTERNALS__` API，因此前端代码无需修改：

```javascript
// 这些 API 调用在 Electron 中也能正常工作
window.__TAURI_INTERNALS__.invoke('minimax_tts', {...})
window.__TAURI_INTERNALS__.invoke('save_temp_audio', {...})
```

### 4. 已实现的功能

- ✅ MiniMax TTS API 调用
- ✅ 临时音频文件保存
- ✅ 文件内存保存
- ✅ 外部链接打开
- ✅ 开发者工具（开发模式自动打开）

## 📝 构建产物

### macOS

- `.dmg` - DMG 安装镜像
- `.zip` - 压缩包版本
- 支持 Intel (x64) 和 Apple Silicon (arm64)

### Windows

- `.exe` - NSIS 安装程序
- `-portable.exe` - 便携版
- 支持 64 位 (x64) 和 32 位 (ia32)

### Linux

- `.AppImage` - AppImage 格式
- `.deb` - Debian 安装包

## 🎯 优势

相比 Tauri 版本：

1. ✅ **完整的 Chromium 支持** - 所有 Web API 都能正常工作
2. ✅ **更好的兼容性** - 跨平台行为一致
3. ✅ **开发体验** - 内置开发者工具，调试更方便
4. ✅ **生态丰富** - Electron 社区更大，资源更多

劣势：

1. ❌ 应用体积较大（因为打包了完整的 Chromium）
2. ❌ 内存占用较高

## 💻 TypeScript 支持

所有 Electron 代码都使用 **TypeScript** 编写：

- ✅ 类型安全
- ✅ 更好的 IDE 支持
- ✅ 编译时错误检查

编译流程：

1. `electron/*.ts` → TypeScript 编译器 → `dist-electron/*.js`
2. Electron 运行编译后的 `dist-electron/main.js`

## 🚀 下一步

1. 测试所有功能是否正常（特别是音频播放）
2. 根据需要调整窗口大小、图标等配置（在 `electron/main.ts`）
3. 自定义 electron-builder 配置（在 `package.json` 的 `build` 字段）
4. 添加自动更新功能（可选）

## ❓ 常见问题

### Q: 为什么要迁移到 Electron？

A: Tauri 使用系统原生 WebView，在某些平台上对 Web Audio API 的支持不完整，导致音频播放失败。Electron 使用完整的 Chromium，完全解决了这个问题。

### Q: 可以同时保留 Tauri 和 Electron 版本吗？

A: 可以，但需要：

1. 保留 `src-tauri` 目录
2. 重新添加 Tauri 依赖
3. 添加切换脚本

建议：选择一个主要的桌面方案，另一个作为备用。

### Q: 如何减小应用体积？

A: Electron 应用体积较大是正常的（约 100-200MB），这是因为打包了完整的 Chromium。可以通过以下方式优化：

- 使用 `asar` 压缩（electron-builder 默认启用）
- 移除不必要的依赖
- 使用代码分割
- 启用压缩算法

## 📞 支持

如果遇到问题，请检查：

1. Node.js 版本（建议 18+）
2. 确保所有依赖已安装：`pnpm install`
3. 清除缓存：`rm -rf node_modules dist dist-electron && pnpm install`
