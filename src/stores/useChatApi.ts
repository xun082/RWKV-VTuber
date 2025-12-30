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

export type ChatApiType = "siliconflow" | "rwkv-local";

type API = {
  // 服务类型配置
  chatApiType: ChatApiType;
  setChatApiType: (type: ChatApiType) => Promise<void>;

  // 硅基流动配置
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  modelName: string;
  setModelName: (name: string) => Promise<void>;
  usedToken: number;
  setUsedToken: (token: number) => Promise<void>;

  // 本地模型配置（OpenAI 兼容）
  rwkvEndpoint: string;
  setRwkvEndpoint: (endpoint: string) => Promise<void>;

  // 聊天API
  chat: (
    messages: ChatMessage[],
    signal?: AbortSignal
  ) => Promise<AsyncIterable<string>>;
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
// 硬编码的API密钥
const HARDCODED_API_KEY = "sk-akaemjzequsiwfzyfpijamrnsuvvfeicsbtsqnzqshfvxexv";

const localUsedToken = await get("last_used_token");
const defaultUsedToken = localUsedToken ? Number(localUsedToken) : -1;
const defaultApiKey = HARDCODED_API_KEY;
const defaultModelName = SILICONFLOW_MODEL;
const defaultChatApiType =
  ((await get("chat_api_type")) as ChatApiType) || "siliconflow";
const defaultRwkvEndpoint =
  ((await get("rwkv_endpoint")) as string) ||
  "http://192.168.0.12:8000/v1/chat/completions";

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
    chatApiType: defaultChatApiType,
    apiKey: defaultApiKey,
    modelName: defaultModelName,
    usedToken: defaultUsedToken,
    rwkvEndpoint: defaultRwkvEndpoint,

    setChatApiType: async (type) => {
      setState({ chatApiType: type });
      await set("chat_api_type", type);
    },

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

    setRwkvEndpoint: async (endpoint) => {
      setState({ rwkvEndpoint: endpoint });
      await set("rwkv_endpoint", endpoint);
    },

    // 聊天API（支持硅基流动和本地 OpenAI 兼容模型）
    chat: async (messages: ChatMessage[], signal?: AbortSignal) => {
      const { chatApiType, rwkvEndpoint } = getState();

      // 根据服务类型选择不同的 API
      if (chatApiType === "rwkv-local") {
        // 本地 OpenAI 兼容服务
        const response = await fetch(rwkvEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            stream: true,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(
            `服务错误: ${response.status} ${response.statusText}`
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
                  if (line.trim() === "") continue;

                  // 处理 SSE 格式的数据
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6); // 移除 "data: " 前缀
                    if (data === "[DONE]") return;

                    try {
                      const json = JSON.parse(data);
                      if (
                        json.choices &&
                        json.choices[0] &&
                        json.choices[0].delta
                      ) {
                        const content = json.choices[0].delta.content;
                        if (content) {
                          yield content;
                        }
                      }
                    } catch (e) {
                      // 如果不是 JSON，忽略
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
      }

      // 硅基流动聊天API（默认）
      const { apiKey: apiKeyForFetch, modelName: modelNameForFetch } =
        getState();

      const response = await fetch(SILICONFLOW_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKeyForFetch}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelNameForFetch,
          messages,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`服务错误: ${response.status} ${response.statusText}`);
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
      const { chatApiType, apiKey, modelName, rwkvEndpoint } = getState();

      try {
        if (chatApiType === "rwkv-local") {
          // 测试本地 OpenAI 兼容服务
          const response = await fetch(rwkvEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: "hi" }],
              max_tokens: 10,
            }),
          });

          return response.ok;
        } else {
          // 测试硅基流动服务
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
        }
      } catch (error) {
        console.error("连接测试失败:", error);
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

      // 格式优化: 使用更紧凑的格式
      const qaContent = knowledgeBase
        .map((item) => `${item.question}\n${item.answer}`)
        .join("\n");

      return `知识库:\n${qaContent}`;
    },

    getSystemPrompt: () => {
      const { knowledgeBase } = getState();

      if (!knowledgeBase || knowledgeBase.length === 0) {
        return "";
      }

      // 使用更紧凑的单行格式，节省 token
      const knowledgeContent = knowledgeBase
        .map((item) => `Q：${item.question}\nA：${item.answer}\n`)
        .join("\n");

      return `知识库:\n${knowledgeContent}`;
    },
  };
});
