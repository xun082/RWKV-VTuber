# Sherpa-ONNX 模型配置指南

## 📥 下载模型

RWKV-VTuber 使用 Sherpa-ONNX Paraformer 进行离线中文语音识别。为了减小安装包体积，模型文件需要用户自行下载。

### 下载地址

**推荐：INT8 量化模型（更小更快）**

- 下载地址：[sherpa-onnx-paraformer-zh-2024-03-09.tar.bz2](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-2024-03-09.tar.bz2)
- 大小：约 70MB
- 解压后需要的文件：
  - `model.int8.onnx` - INT8 量化模型
  - `tokens.txt` - 词表文件

**可选：完整模型（更高精度）**

- 同样的下载地址，解压后使用 `model.onnx`
- 大小：约 220MB

## 📁 文件放置

### Windows 用户

1. 下载并解压模型文件
2. 在应用程序所在目录创建 `sherpa` 文件夹
3. 将 `model.int8.onnx` 和 `tokens.txt` 放入 `sherpa` 文件夹

```
RWKV-VTuber/
├── RWKV-VTuber.exe
└── sherpa/
    ├── model.int8.onnx
    └── tokens.txt
```

### macOS 用户

1. 下载并解压模型文件
2. 在项目根目录创建 `sherpa` 文件夹
3. 将 `model.int8.onnx` 和 `tokens.txt` 放入 `sherpa` 文件夹

```
RWKV-VTuber/
├── package.json
└── sherpa/
    ├── model.int8.onnx
    └── tokens.txt
```

## ⚙️ 配置路径

1. 启动应用程序
2. 进入 **语音服务配置** 页面
3. 选择 **sherpa** 语音识别服务
4. 配置模型路径：
   - **模型文件路径**：`sherpa/model.int8.onnx`（相对路径）或完整路径
   - **词表文件路径**：`sherpa/tokens.txt`（相对路径）或完整路径
   - **线程数**：建议 2-4（根据 CPU 性能调整）
5. 点击 **保存配置**

## 🚀 使用提示

- **首次使用**：模型加载需要几秒钟，请耐心等待
- **性能优化**：INT8 模型比完整模型快 2-3 倍，精度略有下降但日常使用足够
- **线程数**：
  - 2 线程：适合大多数情况
  - 4 线程：如果 CPU 核心数 ≥4，可以提高速度
  - 8 线程：仅适合高性能 CPU
- **路径格式**：
  - 相对路径：`sherpa/model.int8.onnx`
  - 绝对路径（Windows）：`C:/Users/YourName/Documents/sherpa/model.int8.onnx`
  - 绝对路径（macOS）：`/Users/YourName/Documents/sherpa/model.int8.onnx`

## ❓ 常见问题

### Q: 提示"模型文件不存在"

A: 请检查：

1. 文件路径是否正确
2. 文件名是否正确（区分大小写）
3. 是否已经下载并解压模型文件

### Q: 识别速度慢

A: 尝试：

1. 使用 INT8 量化模型
2. 减少线程数到 2
3. 检查 CPU 占用率

### Q: 识别准确率低

A: 尝试：

1. 使用完整模型 `model.onnx`
2. 确保麦克风音质良好
3. 在安静环境中使用

## 📚 更多信息

- [Sherpa-ONNX 官方文档](https://k2-fsa.github.io/sherpa/onnx/index.html)
- [更多中文模型](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)
- [项目 GitHub](https://github.com/leafyee/RWKV-VTuber)
