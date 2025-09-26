import type { SpeakApiList } from "../../stores/useSpeakApi";
import { speak_minimax, test_minimax } from "./api.minimax-tts";

export const speakApiList: SpeakApiList = [
  {
    name: "MiniMax TTS",
    api: () => ({
      api: (text: string) => speak_minimax(text),
      test: () => test_minimax(),
    }),
  },
  {
    name: "关闭",
    api: null,
  },
];
