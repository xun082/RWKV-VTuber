// Electron 专用的 Whisper 语音识别
// 使用本地 Whisper 模型

// ListenApiList 类型已在全局 types.d.ts 中定义

export type ListenApi = (callback?: (text: string) => void) => {
  result: Promise<string>;
  start: () => void;
  stop: () => void;
};
export type ListenApiTest = () => Promise<boolean>;

// 创建 WAV 文件（16-bit PCM）
function createWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV 文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF"); // ChunkID
  view.setUint32(4, 36 + samples.length * 2, true); // ChunkSize
  writeString(8, "WAVE"); // Format
  writeString(12, "fmt "); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, "data"); // Subchunk2ID
  view.setUint32(40, samples.length * 2, true); // Subchunk2Size

  // 写入音频数据（Float32 转 Int16）
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i])); // 限制范围
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// 使用 AudioContext 录制原始音频（16kHz 单声道 PCM）
const listen_whisper: ListenApi = (callback) => {
  let audioContext: AudioContext | null = null;
  let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let stream: MediaStream | null = null;
  let isRecording = false;
  let audioBuffers: Float32Array[] = [];

  const { promise, resolve, reject } = Promise.withResolvers<string>();

  // 停止录音并发送到 Whisper API
  const stopRecordingAndTranscribe = async () => {
    if (!isRecording || !audioContext) {
      return;
    }

    isRecording = false;
    console.log("🎤 录音结束，开始转录...");

    try {
      // 合并所有音频缓冲区
      const totalLength = audioBuffers.reduce(
        (sum, buf) => sum + buf.length,
        0
      );
      const combinedBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const buf of audioBuffers) {
        combinedBuffer.set(buf, offset);
        offset += buf.length;
      }

      console.log(
        `📊 录制音频样本数: ${combinedBuffer.length}, 时长: ${(
          combinedBuffer.length / 16000
        ).toFixed(2)}s`
      );

      // 转换为 16kHz 单声道 WAV
      const wavBlob = createWavBlob(combinedBuffer, 16000);
      console.log(`📦 WAV 文件大小: ${wavBlob.size} bytes`);

      // 调用 Whisper API
      const transcript = await transcribeWithWhisper(wavBlob);
      console.log("✅ Whisper 转录成功:", transcript);

      if (callback && transcript.trim()) {
        callback(transcript);
      }

      resolve(transcript);
    } catch (error) {
      console.error("❌ Whisper 转录失败:", error);
      reject(error);
    } finally {
      // 清理
      if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
      }
      if (mediaStreamSource) {
        mediaStreamSource.disconnect();
        mediaStreamSource = null;
      }
      if (audioContext) {
        await audioContext.close();
        audioContext = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      audioBuffers = [];
    }
  };

  return {
    result: promise,
    start: async () => {
      try {
        console.log("🚀 启动 Whisper 语音识别...");

        // 获取麦克风权限（16kHz 单声道）
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        console.log("✅ 麦克风权限已获取");

        // 创建 AudioContext（16kHz）
        audioContext = new AudioContext({ sampleRate: 16000 });
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        // 创建 ScriptProcessor 收集音频数据
        const bufferSize = 4096;
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessor.onaudioprocess = (event) => {
          if (isRecording) {
            const inputData = event.inputBuffer.getChannelData(0);
            // 复制数据（避免被覆盖）
            const copy = new Float32Array(inputData.length);
            copy.set(inputData);
            audioBuffers.push(copy);
          }
        };

        // 连接音频节点
        mediaStreamSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        audioBuffers = [];
        isRecording = true;

        console.log("🎤 开始录音（16kHz 单声道）...");
      } catch (error) {
        console.error("❌ 启动录音失败:", error);
        reject(error);
      }
    },
    stop: () => {
      console.log("🛑 停止录音...");
      stopRecordingAndTranscribe();
    },
  };
};

// 调用本地 Whisper 进行转录
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  try {
    console.log("📤 发送音频到本地 Whisper...");

    // 将 Blob 转换为 ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioData = Array.from(new Uint8Array(arrayBuffer));

    console.log(`📊 音频数据大小: ${audioData.length} bytes`);

    // 通过 Electron IPC 调用本地 Whisper
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error("Electron API 未就绪");
    }

    const result = await electronAPI.invoke("whisper_transcribe", {
      audioData,
      language: "zh", // 中文（使用 ggml-small.bin 多语言模型）
    });

    console.log("✅ Whisper 转录结果:", result);

    if (!result || !result.transcript) {
      throw new Error("Whisper 未返回转录结果");
    }

    return result.transcript.trim();
  } catch (error) {
    console.error("Whisper 本地转录失败:", error);
    throw error;
  }
}

// 测试函数
const test_whisper: ListenApiTest = async () => {
  try {
    console.log("🧪 测试 Whisper 环境...");

    // 检查 Electron API
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      console.error("❌ Electron API 不可用");
      return false;
    }

    console.log("✅ Electron API 可用");

    // 检查麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    console.log("✅ 麦克风权限正常");

    // 检查音频设备
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    console.log(`🎤 找到 ${audioInputs.length} 个音频输入设备`);

    return true;
  } catch (error) {
    console.error("❌ Whisper 测试失败:", error);
    return false;
  }
};

// 导出 listenApiList（数组格式）
export const listenApiList: Array<{
  name: string;
  api: (_params: undefined) => {
    api: ListenApi;
    test?: ListenApiTest;
  };
}> = [
  {
    name: "whisper",
    api: (_params: undefined) => ({
      api: listen_whisper,
      test: test_whisper,
    }),
  },
];
