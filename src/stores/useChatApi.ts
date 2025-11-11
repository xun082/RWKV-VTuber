import { create } from "zustand";
import { get, set } from "../lib/utils.ts";

export interface QAItem {
  id: string;
  question: string;
  answer: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type API = {
  // 硅基流动配置
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  modelName: string;
  setModelName: (name: string) => Promise<void>;
  usedToken: number;
  setUsedToken: (token: number) => Promise<void>;

  // 聊天API
  chat: (messages: ChatMessage[]) => Promise<AsyncIterable<string>>;
  testConnection: () => Promise<boolean>;

  // Live2D motion integration
  setMotionProcessor: (processor: (content: string) => void) => void;
  processAIResponse: (content: string) => void;

  // Knowledge base integration
  knowledgeBase: QAItem[];
  loadKnowledgeBase: () => void;
  getKnowledgeBasePrompt: () => string;
  getSystemPrompt: () => string;
};

// 硅基流动配置
const SILICONFLOW_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";
const SILICONFLOW_MODEL = "deepseek-ai/DeepSeek-V3";
const KNOWLEDGE_BASE_STORAGE_KEY = "knowledge_base_qa";

const localUsedToken = await get("last_used_token");
const defaultUsedToken = localUsedToken ? Number(localUsedToken) : -1;
const defaultApiKey = ((await get("openai_api_key")) as string) || "";
const defaultModelName =
  ((await get("openai_model_name")) as string) || SILICONFLOW_MODEL;

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
    apiKey: defaultApiKey,
    modelName: defaultModelName,
    usedToken: defaultUsedToken,

    setApiKey: async (key) => {
      setState({ apiKey: key });
      await set("openai_api_key", key);
    },

    setModelName: async (name) => {
      setState({ modelName: name });
      await set("openai_model_name", name);
    },

    setUsedToken: async (token) => {
      setState({ usedToken: token });
      await set("last_used_token", token);
    },

    // 硅基流动聊天API
    chat: async (messages: ChatMessage[]) => {
      const { apiKey, modelName } = getState();

      const response = await fetch(SILICONFLOW_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `硅基流动 API 错误: ${response.status} ${response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();

      return {
        async *[Symbol.asyncIterator]() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter((line) => line.trim());

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") return;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      yield content;
                    }
                  } catch (e) {
                    console.warn("解析流数据失败:", e);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        },
      };
    },

    testConnection: async () => {
      const { apiKey, modelName } = getState();

      try {
        const response = await fetch(SILICONFLOW_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 10,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error("硅基流动连接测试失败:", error);
        return false;
      }
    },

    // Live2D motion integration
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
