# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.2.1](https://github.com/xun082/RWKV-VTuber/compare/v1.2.0...v1.2.1) (2025-10-28)

## [1.0.0] - 2025-10-10

### 🎉 首个正式版本发布

#### ✨ 新功能

- **🎤 本地 Whisper 语音识别**

  - 集成 Whisper.cpp 原生模块，支持完全离线运行
  - 使用 ggml-small.bin 中文多语言模型 (487MB)
  - 支持中文及 99 种语言识别
  - 16kHz 单声道高质量音频录制
  - Apple Silicon GPU 加速支持

- **🖥️ Electron 桌面应用**

  - 跨平台支持：macOS、Windows、Linux
  - 原生性能，流畅体验
  - 自动化 CI/CD 构建和发布

- **💬 AI 对话系统**

  - 集成 RWKV 大语言模型
  - 支持多种 AI 服务提供商
  - 实时对话交互

- **🔊 TTS 文本转语音**

  - MiniMax TTS 集成
  - 多种语音引擎支持
  - 高质量语音合成

- **🎨 Live2D 虚拟形象**
  - Live2D 模型展示
  - 实时表情和动作
  - 自定义角色支持

#### 🔧 技术特性

- TypeScript 全栈开发
- React + Vite 前端架构
- Electron 桌面框架
- 模块化 API 设计
- 完善的错误处理

#### 📦 构建和部署

- GitHub Actions 自动化构建
- 三大平台安装包：
  - macOS Universal DMG
  - Windows x64 Setup
  - Linux x64 AppImage
- 自动生成 Release 和 Checksums

#### 🛠️ 优化和修复

- 完善的 Electron 权限管理
- 优化的网络配置
- 生产/开发环境资源路径自动适配
- 清理冗余代码和依赖

---

### 从 0.0.6 迁移

本版本将项目从 Tauri 迁移到 Electron，并完成了 Whisper 本地语音识别的集成。

主要变更：

- 移除 Tauri 相关代码和依赖
- 新增 Electron 桌面框架
- 集成本地 Whisper 语音识别
- 更新构建和部署流程
