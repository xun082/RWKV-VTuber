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

export type ChatApiType = "volcano" | "rwkv-local";

type API = {
  // 服务类型配置
  chatApiType: ChatApiType;
  setChatApiType: (type: ChatApiType) => Promise<void>;

  // 火山引擎配置
  volcanoApiKey: string;
  setVolcanoApiKey: (key: string) => Promise<void>;
  volcanoEndpoint: string;
  setVolcanoEndpoint: (endpoint: string) => Promise<void>;
  volcanoModel: string;
  setVolcanoModel: (model: string) => Promise<void>;
  usedToken: number;
  setUsedToken: (token: number) => Promise<void>;

  // 本地模型配置（OpenAI 兼容）
  rwkvEndpoint: string;
  setRwkvEndpoint: (endpoint: string) => Promise<void>;

  // 聊天API
  chat: (
    messages: ChatMessage[],
    signal?: AbortSignal,
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

  // Link metadata extraction
  extractLinkMetadata: (html: string, url: string) => Promise<{
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  }>;
};

// 火山引擎配置
const DEFAULT_VOLCANO_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const DEFAULT_VOLCANO_MODEL = "ep-20260204163225-8jdxs";
const KNOWLEDGE_BASE_STORAGE_KEY = "knowledge_base_qa";

const localUsedToken = await get("last_used_token");
const defaultUsedToken = localUsedToken ? Number(localUsedToken) : -1;
const defaultVolcanoApiKey = ((await get("volcano_api_key")) as string) || "";
const defaultVolcanoEndpoint = ((await get("volcano_endpoint")) as string) || DEFAULT_VOLCANO_ENDPOINT;
const defaultVolcanoModel = ((await get("volcano_model")) as string) || DEFAULT_VOLCANO_MODEL;
const defaultChatApiType =
  ((await get("chat_api_type")) as ChatApiType) || "volcano";
const defaultRwkvEndpoint =
  ((await get("rwkv_endpoint")) as string) ||
  "http://192.168.0.18:8000/v1/chat/completions";

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
    volcanoApiKey: defaultVolcanoApiKey,
    volcanoEndpoint: defaultVolcanoEndpoint,
    volcanoModel: defaultVolcanoModel,
    usedToken: defaultUsedToken,
    rwkvEndpoint: defaultRwkvEndpoint,

    setChatApiType: async (type) => {
      setState({ chatApiType: type });
      await set("chat_api_type", type);
    },

    setVolcanoApiKey: async (key) => {
      setState({ volcanoApiKey: key });
      await set("volcano_api_key", key);
    },

    setVolcanoEndpoint: async (endpoint) => {
      setState({ volcanoEndpoint: endpoint });
      await set("volcano_endpoint", endpoint);
    },

    setVolcanoModel: async (model) => {
      setState({ volcanoModel: model });
      await set("volcano_model", model);
    },

    setUsedToken: async (token) => {
      setState({ usedToken: token });
      await set("last_used_token", token);
    },

    setRwkvEndpoint: async (endpoint) => {
      setState({ rwkvEndpoint: endpoint });
      await set("rwkv_endpoint", endpoint);
    },

    // 聊天API（支持火山引擎和本地 OpenAI 兼容模型）
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
            model: "Qwen/Qwen3-8B",
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(
            `服务错误: ${response.status} ${response.statusText}`,
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

      // 火山引擎聊天API（默认）
      const { volcanoApiKey, volcanoEndpoint, volcanoModel } = getState();

      const response = await fetch(volcanoEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${volcanoApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: volcanoModel,
          messages,
          stream: true,
          temperature: 1,
          top_p: 0.5,
          presence_penalty: 0,
          frequency_penalty: 0.05,
          thinking: { type: "disabled" },
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
      const { chatApiType, volcanoApiKey, volcanoEndpoint, volcanoModel, rwkvEndpoint } = getState();

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
          // 测试火山引擎服务
          const response = await fetch(volcanoEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${volcanoApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: volcanoModel,
              messages: [{ role: "user", content: "hi" }],
              temperature: 1,
              top_p: 0.5,
              thinking: { type: "disabled" },
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

    // 使用AI从HTML中提取链接元数据
    extractLinkMetadata: async (html: string, url: string) => {
      const { chat } = getState();

      // 提取HTML的前10000个字符，包含head和部分body，足够获取元数据
      const truncatedHtml = html.slice(0, 10000);

      const extractionPrompt = `请从以下HTML内容中提取网页的元数据信息。

目标URL: ${url}

HTML内容:
\`\`\`html
${truncatedHtml}
\`\`\`

请提取以下信息（优先查找meta标签，如og:title, og:description, og:image等）：
1. title: 网页标题
2. description: 网页描述
3. image: 网页预览图片的完整URL
4. siteName: 网站名称

要求：
- 必须返回纯JSON格式，不要有任何其他文字
- 如果某个字段找不到，返回null
- image字段必须是完整的URL（如果是相对路径，需要基于目标URL转换为绝对路径）
- JSON格式如下：
{
  "title": "标题",
  "description": "描述",
  "image": "图片URL",
  "siteName": "网站名称"
}`;

      try {
        const messages: ChatMessage[] = [
          {
            role: "user",
            content: extractionPrompt,
          },
        ];

        let fullResponse = "";
        const stream = await chat(messages);

        for await (const chunk of stream) {
          fullResponse += chunk;
        }

        // 提取JSON内容（去除可能的markdown代码块标记）
        let jsonStr = fullResponse.trim();
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith("```")) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const metadata = JSON.parse(jsonStr);

        // 处理相对URL
        if (metadata.image && !metadata.image.startsWith("http")) {
          try {
            const baseUrl = new URL(url);
            metadata.image = new URL(metadata.image, baseUrl.origin).href;
          } catch (e) {
            console.warn("处理图片URL失败:", e);
          }
        }

        return {
          title: metadata.title || undefined,
          description: metadata.description || undefined,
          image: metadata.image || undefined,
          siteName: metadata.siteName || undefined,
        };
      } catch (error) {
        console.error("AI提取元数据失败:", error);
        // 返回基本信息作为降级方案
        return {
          title: new URL(url).hostname,
        };
      }
    },
  };
});
