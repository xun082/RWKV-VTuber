/**
 * IPC 处理器模块
 */
import { ipcMain } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { transcribe, reloadConfig, initRecognizer } from "./sherpa-asr.js";
import { generateSpeech, type SherpaTTSGenerateArgs } from "./sherpa-tts.js";
import {
  downloadTTSModel,
  checkTTSModel,
  downloadASRModel,
  checkASRModel,
  type ModelType,
} from "./model-downloader.js";
import { getTTSModelsDir, getASRModelsDir } from "./paths.js";

/**
 * 注册所有 IPC 处理器
 */
export function registerIPCHandlers(): void {
  // 保存内存
  ipcMain.handle(
    "save_memory",
    async (_event, args: { path: string; data: string }) => {
      await fs.writeFile(args.path, args.data, "utf-8");
      return { success: true, path: args.path };
    }
  );

  // 保存临时音频
  ipcMain.handle(
    "save_temp_audio",
    async (_event, args: { audioData: number[] }) => {
      return args.audioData;
    }
  );

  // MiniMax TTS
  ipcMain.handle("minimax_tts", async (_event, params: any) => {
    const {
      apiKey,
      groupId,
      model,
      text,
      voiceId,
      speed,
      volume,
      pitch,
      sampleRate,
      audioFormat,
    } = params;

    const response = await fetch("https://api.minimaxi.com/v1/t2a_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        GroupId: groupId,
      },
      body: JSON.stringify({
        model,
        text,
        voice_setting: { voice_id: voiceId, speed, vol: volume, pitch },
        audio_setting: {
          sample_rate: sampleRate,
          bitrate: 128000,
          format: audioFormat || "wav",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API 错误 ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const audioBase64 = data.data?.audio;

    if (!audioBase64) {
      throw new Error("响应中未找到音频数据");
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    return { audio: Array.from(audioBuffer) };
  });

  // Sherpa-ONNX ASR 语音识别
  ipcMain.handle(
    "sherpa_transcribe",
    async (_event, args: { audioData: number[] }) => {
      try {
        const transcript = await transcribe(args.audioData);
        return { transcript };
      } catch (error: any) {
        // 如果识别器未初始化，尝试用默认路径初始化一次
        if (error.message.includes("未初始化")) {
          console.log("[IPC] 识别器未初始化，尝试使用默认路径初始化...");
          const asrModelsDir = getASRModelsDir();
          const modelBasePath = path.join(
            asrModelsDir,
            "sherpa-onnx-streaming-paraformer-bilingual-zh-en"
          );

          const initialized = initRecognizer(
            path.join(modelBasePath, "encoder.int8.onnx"),
            path.join(modelBasePath, "decoder.int8.onnx"),
            path.join(modelBasePath, "tokens.txt")
          );

          if (initialized) {
            console.log("[IPC] 使用默认路径初始化成功，重试识别...");
            const transcript = await transcribe(args.audioData);
            return { transcript };
          }
        }
        throw error;
      }
    }
  );

  // Sherpa-ONNX ASR 重新加载配置（流式识别器）
  ipcMain.handle(
    "sherpa_reload_config",
    async (
      _event,
      args: {
        encoderPath: string;
        decoderPath: string;
        tokensPath: string;
      }
    ) => {
      reloadConfig(args.encoderPath, args.decoderPath, args.tokensPath);
      return { success: true };
    }
  );

  // Sherpa-ONNX TTS 语音合成
  ipcMain.handle(
    "sherpa_tts_generate",
    async (_event, args: SherpaTTSGenerateArgs) => {
      return await generateSpeech(args);
    }
  );

  // 下载 TTS 模型（使用跨平台路径）
  ipcMain.handle(
    "download_tts_model",
    async (event, args: { modelType: ModelType }) => {
      const modelsDir = getTTSModelsDir();

      const modelPath = await downloadTTSModel(
        args.modelType,
        modelsDir,
        (progress) => {
          event.sender.send("download_progress", progress);
        }
      );

      return { success: true, path: modelPath };
    }
  );

  // 检查 TTS 模型（使用跨平台路径）
  ipcMain.handle(
    "check_tts_model",
    async (_event, args: { modelType: ModelType }) => {
      const modelsDir = getTTSModelsDir();
      return checkTTSModel(args.modelType, modelsDir);
    }
  );

  // 下载 ASR 模型（使用跨平台路径）
  ipcMain.handle("download_asr_model", async (event) => {
    const modelsDir = getASRModelsDir();

    const modelPath = await downloadASRModel(modelsDir, (progress) => {
      event.sender.send("download_progress", progress);
    });

    return { success: true, path: modelPath };
  });

  // 检查 ASR 模型（使用跨平台路径）
  ipcMain.handle("check_asr_model", async () => {
    const modelsDir = getASRModelsDir();
    return checkASRModel(modelsDir);
  });
}
