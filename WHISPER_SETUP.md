# Whisper 本地语音识别配置指南

本应用在 Electron 桌面端使用本地 Whisper 原生模块进行语音识别，无需联网，保护隐私。

## 项目已包含

✅ Whisper 原生模块：`electron/native/addon.node`（已编译）
❌ Whisper 模型文件：需要下载

## 安装步骤

### 1. 下载 Whisper 模型文件

从 Hugging Face 下载模型文件并放在 `electron/native/` 目录：

```bash
cd electron/native

# 下载基础模型（推荐，约140MB）
curl -L -o ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# 或者下载其他模型：
# tiny (75MB): https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin
# small (466MB): https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
# medium (1.5GB): https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
```

### 2. 目录结构

确保文件结构如下：

```
RWKV-VTuber/
├── electron/
│   └── native/
│       ├── addon.node        # ✅ 已包含（Whisper 原生模块）
│       └── ggml-base.bin     # ❌ 需要下载（模型文件）
├── dist-electron/
│   └── native/
│       ├── addon.node        # 编译后会复制到这里
│       └── ggml-base.bin     # 模型文件也需要在这里
```

## 支持的模型

| 模型 | 大小 | 内存 | 速度 | 准确度 |
|------|------|------|------|--------|
| tiny | 75 MB | ~390 MB | 最快 | 较低 |
| base | 142 MB | ~500 MB | 快 | 中等 |
| small | 466 MB | ~1.0 GB | 中等 | 好 |
| medium | 1.5 GB | ~2.6 GB | 慢 | 很好 |
| large | 2.9 GB | ~4.7 GB | 最慢 | 最好 |

**推荐使用 `base` 模型**，在速度和准确度之间取得良好平衡。

## 使用方法

1. 启动应用后，选择"Whisper 语音识别"
2. 点击麦克风按钮开始录音
3. 说完话后点击停止按钮
4. 等待转录完成（通常几秒钟）

## 故障排除

### 问题：找不到 Whisper 可执行文件

**解决方案：**
1. 检查 whisper 是否在 PATH 中：
   ```bash
   which whisper
   ```

2. 如果不在 PATH 中，将其添加到 PATH 或放在应用 resources 目录

### 问题：找不到模型文件

**解决方案：**
1. 确保已下载模型文件
2. 检查模型文件路径是否正确
3. 模型文件应命名为 `ggml-base.bin` 等

### 问题：转录速度很慢

**解决方案：**
1. 使用更小的模型（如 tiny 或 base）
2. 确保电脑有足够的内存
3. 缩短录音时长

### 问题：转录准确度不高

**解决方案：**
1. 使用更大的模型（如 medium 或 large）
2. 确保麦克风质量良好
3. 在安静的环境录音
4. 说话清晰

## 性能建议

- **日常使用**：base 模型（142MB）
- **快速识别**：tiny 模型（75MB）
- **高精度要求**：medium 模型（1.5GB）

## 更多信息

- Whisper.cpp GitHub: https://github.com/ggerganov/whisper.cpp
- OpenAI Whisper: https://github.com/openai/whisper
- 模型下载: https://huggingface.co/ggerganov/whisper.cpp

## 注意事项

1. 首次运行可能需要加载模型，会有几秒延迟
2. 录音时长建议不超过 30 秒，避免处理时间过长
3. 中文识别建议在启动时指定语言参数 `-l zh`
4. 模型文件较大，请确保有足够的磁盘空间

