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

  // 本地 RWKV 配置
  rwkvEndpoint: string;
  setRwkvEndpoint: (endpoint: string) => Promise<void>;
  rwkvPassword: string;
  setRwkvPassword: (password: string) => Promise<void>;

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
const defaultRwkvPassword = ((await get("rwkv_password")) as string) || "";

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
    rwkvPassword: defaultRwkvPassword,

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

    setRwkvPassword: async (password) => {
      setState({ rwkvPassword: password });
      await set("rwkv_password", password);
    },

    // 聊天API（支持硅基流动和本地 RWKV）
    chat: async (messages: ChatMessage[], signal?: AbortSignal) => {
      const { chatApiType, rwkvEndpoint, rwkvPassword } = getState();

      // 根据服务类型选择不同的 API
      if (chatApiType === "rwkv-local") {
        // 本地 RWKV 服务 - 使用阅读理解模式
        // 将 system 提示词和对话历史合并到 user 消息中
        let systemPrompt = "";
        const conversationHistory: string[] = [];
        let userQuestion = "";

        // 找到最后一个 user 消息作为当前问题
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === "user") {
            userQuestion = messages[i].content;
            break;
          }
        }

        // 分离 system 提示词和历史对话（排除最后一个 user 消息）
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.role === "system") {
            systemPrompt = msg.content;
          } else if (msg.role === "user" && i < messages.length - 1) {
            // 不是最后一个 user 消息，作为历史对话
            conversationHistory.push(`用户: ${msg.content}`);
          } else if (msg.role === "assistant") {
            conversationHistory.push(`助手: ${msg.content}`);
          }
        }

        // 清理多余空格的辅助函数
        const cleanSpaces = (text: string): string => {
          return text
            .replace(/[ \t]+/g, " ") // 将多个连续空格和制表符替换为单个空格
            .replace(/\n[ \t]+/g, "\n") // 删除换行后的空格和制表符
            .replace(/[ \t]+\n/g, "\n") // 删除换行前的空格和制表符
            .replace(/\n{3,}/g, "\n\n") // 将多个连续换行替换为两个换行
            .replace(/[ \t]+$/gm, "") // 删除每行末尾的空格
            .trim(); // 删除首尾空格
        };

        // 构建阅读理解格式的 user 消息
        let materialContent = "";
        if (systemPrompt) {
          materialContent += cleanSpaces(systemPrompt);
        }
        if (conversationHistory.length > 0) {
          if (materialContent) materialContent += "\n\n";
          materialContent +=
            "对话历史:\n" +
            conversationHistory.map((msg) => cleanSpaces(msg)).join("\n");
        }

        // 清理用户问题
        const cleanedQuestion = cleanSpaces(userQuestion || "请回答");

        // 构建最终的用户消息：系统提示词 + 问题
        const finalUserContent = materialContent
          ? `${materialContent}\n\nUser: ${cleanedQuestion}\n\nAssistant:<think></think>`
          : `User: ${cleanedQuestion}\n\nAssistant:<think></think>`;

        // 构建内容数组（只需要 1 个）
        const contents = [finalUserContent];

        // 本地 RWKV 服务
        const response = await fetch(rwkvEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: contents,
            max_tokens: 2048,
            temperature: 0.8,
            top_k: 1,
            top_p: 0.5,
            stream: true,
            enable_think: false,
            password: rwkvPassword,
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
                  } else {
                    // 如果不是 SSE 格式，尝试直接解析为 JSON
                    try {
                      const json = JSON.parse(line);
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
                      // 忽略解析错误
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
      const { chatApiType, apiKey, modelName, rwkvEndpoint, rwkvPassword } =
        getState();

      try {
        if (chatApiType === "rwkv-local") {
          // 测试本地 RWKV 服务（使用并发模型格式）
          const response = await fetch(rwkvEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: ["User: hi\n\nAssistant:<think></think>"],
              max_tokens: 10,
              temperature: 0.8,
              top_k: 1,
              top_p: 0.5,
              stream: false,
              enable_think: false,
              password: rwkvPassword,
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

      if (!knowledgeBase || knowledgeBase.length === 0) {
        return `知识库空。说:"抱歉,知识库未配置。"`;
      }

      const knowledgeContent = knowledgeBase
        .map(
          (item, index) =>
            `Q${index + 1}:${item.question} A${index + 1}:${item.answer}`
        )
        .join(" ");

      return `知识库:${knowledgeContent} 规则:语义匹配,找到输出原答案,不加"数据来源""需要了解"等标注,没找到说"不在知识范围"`;
    },
  };
});
