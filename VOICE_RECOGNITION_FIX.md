# 语音识别修复说明

## 问题描述
Electron 应用中使用浏览器语音识别 API 时，出现 "语音识别错误: network" 错误。

## 根本原因
Electron 应用需要明确配置和授予麦克风权限，而不像普通浏览器那样会自动处理权限请求。

## 修复内容

### 1. Electron 主进程权限配置 (`electron/main.ts`)

#### 添加了权限请求处理器
```typescript
session.defaultSession.setPermissionRequestHandler(
  (webContents, permission, callback) => {
    // 自动授予麦克风、摄像头和媒体设备访问权限
    const allowedPermissions = [
      "media",
      "microphone",
      "audioCapture",
      "videoCapture",
    ];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  }
);
```

#### 添加了权限检查处理器
```typescript
session.defaultSession.setPermissionCheckHandler(
  (webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = [
      "media",
      "microphone",
      "audioCapture",
      "videoCapture",
    ];
    
    return allowedPermissions.includes(permission);
  }
);
```

### 2. 改进语音识别错误处理 (`src/lib/api/shared/api.listen.ts`)

#### 增强错误信息
为不同的错误类型提供详细的错误信息：
- `network`: 网络连接错误，包含麦克风权限检查提示
- `not-allowed` / `permission-denied`: 麦克风权限被拒绝
- `no-speech`: 未检测到语音输入
- `audio-capture`: 无法捕获音频
- `aborted`: 语音识别被中止

#### 增强测试函数
添加详细的诊断日志：
- 检查浏览器支持
- 检查媒体设备 API 可用性
- 输出音频设备信息
- 提供针对不同错误类型的详细提示

## 使用说明

### 开发模式
```bash
pnpm run electron:dev
```

### 生产构建
```bash
# macOS
pnpm run electron:build:mac

# Windows
pnpm run electron:build:win

# Linux
pnpm run electron:build:linux
```

## 重要提示

### macOS 系统权限
在 macOS 上，首次使用时系统会弹出权限请求对话框，请：
1. 允许应用访问麦克风
2. 如果不小心拒绝了，可以在"系统设置 > 隐私与安全性 > 麦克风"中手动开启

### Windows 系统权限
在 Windows 上，确保：
1. 系统设置中允许应用访问麦克风
2. Windows 隐私设置中麦克风开关已开启

### 网络要求
Chrome 的语音识别 API 依赖于 Google 服务器：
- 需要稳定的网络连接
- 在中国大陆可能需要特殊网络配置
- 确保防火墙不阻止相关连接

## 调试方法

### 查看权限请求日志
打开开发者工具（开发模式下自动打开），查看控制台中的日志：
```
🔍 开始语音识别测试...
✅ 浏览器支持语音识别 API
🎤 请求麦克风权限...
[Electron] 权限请求: media
[Electron] ✅ 授予权限: media
✅ 麦克风权限已授予
📊 音频轨道数量: 1
🎵 音频设备: [设备名称]
✅ 语音识别测试通过
```

### 常见问题排查

1. **仍然提示 "network" 错误**
   - 检查系统级别的麦克风权限是否已授予
   - 重启应用
   - 检查麦克风是否被其他应用占用

2. **权限对话框不出现**
   - 检查系统设置中的隐私权限
   - 尝试重置应用权限

3. **麦克风工作但识别失败**
   - 检查网络连接
   - 确认可以访问 Google 服务
   - 查看控制台是否有其他错误信息

## 技术细节

### Web Speech API
项目使用浏览器原生的 Web Speech API：
- API: `window.SpeechRecognition` 或 `window.webkitSpeechRecognition`
- 依赖: Google Cloud Speech-to-Text
- 支持: Chrome, Edge (Chromium 核心)

### Electron 权限模型
Electron 应用需要两层权限：
1. **应用级别**: 通过 `setPermissionRequestHandler` 控制
2. **系统级别**: 操作系统的隐私设置

## 更新日期
2025-01-09

## 相关文件
- `electron/main.ts` - Electron 主进程配置
- `src/lib/api/shared/api.listen.ts` - 语音识别 API 实现
- `dist-electron/main.js` - 编译后的主进程文件


