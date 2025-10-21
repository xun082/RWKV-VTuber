// Electron 专用的 Sherpa-ONNX Paraformer 语音识别
// 使用本地 Sherpa-ONNX 模型

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

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // 写入音频数据（Float32 转 Int16）
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// 使用 AudioContext 录制原始音频（16kHz 单声道 PCM）
const listen_sherpa: ListenApi = (callback) => {
  let audioContext: AudioContext | null = null;
  let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let stream: MediaStream | null = null;
  let isRecording = false;
  let audioBuffers: Float32Array[] = [];

  const { promise, resolve, reject } = Promise.withResolvers<string>();

  const stopRecordingAndTranscribe = async () => {
    if (!isRecording || !audioContext) {
      return;
    }

    isRecording = false;

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

      // 转换为 16kHz 单声道 WAV
      const wavBlob = createWavBlob(combinedBuffer, 16000);

      // 调用 Sherpa-ONNX
      const transcript = await transcribeWithSherpa(wavBlob);

      if (callback && transcript.trim()) {
        callback(transcript);
      }

      resolve(transcript);
    } catch (error) {
      reject(error);
    } finally {
      // 清理资源
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
        // 获取麦克风权限（16kHz 单声道）
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // 创建 AudioContext（16kHz）
        audioContext = new AudioContext({ sampleRate: 16000 });
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        // 创建 ScriptProcessor 收集音频数据
        const bufferSize = 4096;
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessor.onaudioprocess = (event) => {
          if (isRecording) {
            const inputData = event.inputBuffer.getChannelData(0);
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
      } catch (error) {
        reject(error);
      }
    },
    stop: () => {
      stopRecordingAndTranscribe();
    },
  };
};

// 调用本地 Sherpa-ONNX 进行转录
async function transcribeWithSherpa(audioBlob: Blob): Promise<string> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioData = Array.from(new Uint8Array(arrayBuffer));

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error("Electron API 未就绪");
    }

    const result = await electronAPI.invoke("sherpa_transcribe", {
      audioData,
      language: "zh",
    });

    if (!result || !result.transcript) {
      throw new Error("Sherpa-ONNX 未返回转录结果");
    }

    return result.transcript.trim();
  } catch (error) {
    console.error("❌ Sherpa-ONNX 语音识别失败:", error);
    throw new Error(
      '本地语音识别不可用。请在配置中切换到"浏览器语音识别"，或使用文字输入。'
    );
  }
}

// 测试函数
const test_sherpa: ListenApiTest = async () => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch (error) {
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
    name: "sherpa",
    api: (_params: undefined) => ({
      api: listen_sherpa,
      test: test_sherpa,
    }),
  },
];
