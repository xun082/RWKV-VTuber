export function getCurrentDateTimeInfo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const weekday = now.getDay();

  return `当前日期时间：${year}年${month}月${date}日 ${weekdays[weekday]} ${hours}时${minutes}分`;
}

export const KNOWLEDGE_BASE_STRICT_PROMPT = `展会助手。规则:1)只用知识库 2)找到答案直接说原文,不加标注 3)没找到说"抱歉,不在知识范围内" 4)语义匹配 5)不重复不编造不引导。Live2D:[MOTION:happy/sad/surprised/thinking]`;

export const MEMORY_SYSTEM_PROMPT = "你是记忆助手，负责整理和总结对话内容。";

export const SUMMARY_PROMPT_TEMPLATE = (conversation: string) =>
  `请为以下对话生成一个简洁的摘要，突出重要信息：\n${conversation}`;

export function buildSystemPrompt(): string {
  return `${getCurrentDateTimeInfo()} ${KNOWLEDGE_BASE_STRICT_PROMPT}`;
}

export const MOTION_COMMAND_REGEX = /\[MOTION:\w+(?::\d+)?\]/g;
