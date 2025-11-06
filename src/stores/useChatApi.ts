import OpenAI from "openai";
import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

type API = {
  chat: ChatApi;
  testChat: ChatApiTest;
  openaiEndpoint: string;
  setOpenaiEndpoint: (url?: string) => Promise<void>;
  openaiApiKey: string;
  setOpenaiApiKey: (key?: string) => Promise<void>;
  openaiModelName: string;
  setOpenaiModelName: (name?: string) => Promise<void>;
  usedToken: number; // -1 means unknown
  setUsedToken: (token: number | undefined) => Promise<void>;

  // Live2D motion integration
  setMotionProcessor: (processor: (content: string) => void) => void;
  processAIResponse: (content: string) => void;

  // Knowledge base integration
  knowledgeBase: QAItem[];
  loadKnowledgeBase: () => void;
  getKnowledgeBasePrompt: () => string;
  getSystemPrompt: () => string;
};

const DEFAULT_OPENAI_ENDPOINT = "https://api.siliconflow.cn/v1/";
const DEFAULT_OPENAI_API_KEY = "";
const DEFAULT_OPENAI_MODEL_NAME = "deepseek-ai/DeepSeek-V3";
const KNOWLEDGE_BASE_STORAGE_KEY = "knowledge_base_qa";

const localUsedToken = await get("last_used_token");
const defaultUsedToken = localUsedToken ? Number(localUsedToken) : -1;
const defaultOpenaiEndpoint: string =
  ((await get("openai_endpoint")) as string) ?? DEFAULT_OPENAI_ENDPOINT;
const defaultOpenaiApiKey: string =
  ((await get("openai_api_key")) as string) ?? DEFAULT_OPENAI_API_KEY;
const defaultOpenaiModelName: string =
  ((await get("openai_model_name")) as string) ?? DEFAULT_OPENAI_MODEL_NAME;
const defaultChatApi = new OpenAI({
  baseURL: defaultOpenaiEndpoint,
  apiKey: defaultOpenaiApiKey,
  dangerouslyAllowBrowser: true,
});

export const useChatApi = create<API>()((setState, getState) => {
  let motionProcessor: ((content: string) => void) | null = null;

  // Load knowledge base from localStorage
  const loadKnowledgeBaseFromStorage = (): QAItem[] => {
    try {
      const stored = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as QAItem[];
      }
    } catch (error) {
      console.error("加载知识库失败:", error);
    }
    return [];
  };

  return {
    chat: defaultChatApi,
    usedToken: defaultUsedToken,
    setUsedToken: async (token) => {
      setState({ usedToken: token });
      await set("last_used_token", token ?? -1);
      return;
    },
    openaiEndpoint: defaultOpenaiEndpoint,
    setOpenaiEndpoint: async (url) => {
      const { openaiApiKey } = getState();
      const v = url || DEFAULT_OPENAI_ENDPOINT;
      setState({
        openaiEndpoint: v,
        chat: new OpenAI({
          baseURL: v,
          apiKey: openaiApiKey,
          dangerouslyAllowBrowser: true,
        }),
      });
      await set("openai_endpoint", v);
      sessionStorage.removeItem("openai_chat_test");
      return;
    },
    openaiApiKey: defaultOpenaiApiKey,
    setOpenaiApiKey: async (key) => {
      const { openaiEndpoint } = getState();
      const v = key !== undefined ? key : DEFAULT_OPENAI_API_KEY;
      setState({
        openaiApiKey: v,
        chat: new OpenAI({
          baseURL: openaiEndpoint,
          apiKey: v,
          dangerouslyAllowBrowser: true,
        }),
      });
      await set("openai_api_key", v);
      sessionStorage.removeItem("openai_chat_test");
      return;
    },
    openaiModelName: defaultOpenaiModelName,
    setOpenaiModelName: async (name) => {
      const v = name || DEFAULT_OPENAI_MODEL_NAME;
      setState({ openaiModelName: v });
      await set("openai_model_name", v);
      sessionStorage.removeItem("openai_chat_test");
      return;
    },
    testChat: async () => {
      if (sessionStorage.getItem("openai_chat_test") === "ok") {
        return true;
      }
      const { chat } = getState();
      await chat.models.list().catch((err) => {
        if (err.message === "Connection error.") {
          throw new Error("推理模型未启动");
        }
        throw err;
      });
      sessionStorage.setItem("openai_chat_test", "ok");
      return true;
    },

    // Analyze AI response content and trigger Live2D motions
    setMotionProcessor: (processor: (content: string) => void) => {
      motionProcessor = processor;
    },
    processAIResponse: (content: string) => {
      if (motionProcessor) {
        motionProcessor(content);
      }
    },

    // Knowledge base management
    knowledgeBase: loadKnowledgeBaseFromStorage(),

    loadKnowledgeBase: () => {
      const knowledgeBase = loadKnowledgeBaseFromStorage();
      setState({ knowledgeBase });
    },

    getKnowledgeBasePrompt: () => {
      const { knowledgeBase } = getState();
      if (!knowledgeBase || knowledgeBase.length === 0) return "";

      const qaContent = knowledgeBase
        .map(
          (item, index) =>
            `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`
        )
        .join("\n");

      return `以下是问答知识库:\n${qaContent}`;
    },

    getSystemPrompt: () => {
      const { knowledgeBase } = getState();
      const knowledgePrompt = getState().getKnowledgeBasePrompt();
      const basePrompt = `你是展会问答机器人。1)匹配到知识库答案直接输出，不额外发挥 2)无匹配说"抱歉，我不知道这个问题，你可以询问我其他在场的同事呢" 3)可用[MOTION:动作名]如[MOTION:happy]`;

      if (knowledgeBase && knowledgeBase.length > 0) {
        return `${knowledgePrompt}\n${basePrompt}`;
      }
      return `${basePrompt}\n知识库为空`;
    },
  };
});
