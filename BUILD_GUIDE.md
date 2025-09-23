# 🏗️ 构建指南

## 📋 概述

本项目支持跨平台构建，可以在不同操作系统上生成 macOS 和 Windows 的安装包。

## 🛠️ 本地开发构建

### macOS 构建

```bash
# 构建 macOS 版本（在 macOS 上）
pnpm run build:tauri
```

### 跨平台构建

由于平台限制，需要使用 GitHub Actions 来生成所有平台的构建包：

- macOS 只能在 macOS 环境构建
- Windows 只能在 Windows 环境构建

## 🚀 GitHub Actions 构建

### 主要工作流

#### 1. **完整发布构建** (`build-release.yml`)

**触发方式**：

- 推送到 `main` 分支
- 创建 `v*.*.*` 标签
- 手动触发（workflow_dispatch）

**生成内容**：

- macOS DMG 文件（ARM64 + x64）
- Windows 安装包（MSI + EXE）
- 自动创建 GitHub Release
- 生成校验和文件

#### 2. **测试构建** (`test-build.yml`)

**触发方式**：手动触发，可选择平台

**使用场景**：

- 测试构建流程
- 快速验证特定平台
- 调试构建问题

### 🎯 如何触发构建

#### 方法一：创建发布版本

```bash
# 自动创建版本标签和发布
npm run release:create
npm run release:push
```

#### 方法二：手动标签

```bash
# 手动创建标签
git tag v2.0.3
git push origin v2.0.3
```

#### 方法三：手动触发

1. 打开 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build Release" 或 "Test Build"
4. 点击 "Run workflow"

## 📦 构建输出

### macOS 输出文件

- `digital-life_版本号_mac_arm64.dmg` - Apple Silicon 版本
- `digital-life_版本号_mac_x64.dmg` - Intel 版本

### Windows 输出文件

- `digital-life_版本号_windows_x64.msi` - MSI 安装包（推荐）
- `digital-life_版本号_windows_x64.exe` - EXE 安装程序

### 校验文件

- `SHA256SUMS.txt` - 所有文件的校验和

## 🔧 配置说明

### 签名配置

- **开发环境**：使用临时签名 (`signingIdentity: "-"`)
- **CI 环境**：自动处理不同平台的签名需求
- **生产环境**：支持 Apple 开发者证书（可选）

### 关键文件

- `src-tauri/tauri.conf.json` - Tauri 应用配置
- `.github/workflows/build-release.yml` - 主构建流程
- `.github/workflows/test-build.yml` - 测试构建流程

## 🚨 常见问题

### macOS "应用已损坏" 问题

如果 macOS 提示应用已损坏，运行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/digital-life.app
```

### Windows SmartScreen 警告

这是正常现象，选择 "更多信息" → "仍要运行"

### 构建失败

1. 检查 GitHub Actions 日志
2. 确认依赖版本兼容性
3. 验证 `tauri.conf.json` 配置

## 📚 相关文档

- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [发布管理](./CHANGELOG.md)

## 🎯 快速开始

1. **本地测试**：`pnpm run build:tauri`
2. **CI 测试**：手动触发 "Test Build" 工作流
3. **发布版本**：`npm run release:create && npm run release:push`

构建成功后，所有平台的安装包都会在 GitHub Releases 中自动发布！🎉
