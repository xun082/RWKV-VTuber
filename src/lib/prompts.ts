export function getCurrentDateTimeInfo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = now.getDay();

  return `${year}/${month}/${date} 周${weekdays[weekday]} ${hours}:${String(
    minutes
  ).padStart(2, "0")}`;
}

export const BASE_SYSTEM_PROMPT = `你是智能助手。当前时间: {{datetime}}

核心规则:
1. 基于知识库回答,语义匹配
2. 找到答案直接回复原文,不加"根据资料""数据显示"等标注
3. 未找到说"抱歉,这不在我的知识范围"
4. 不编造、不推测、不引导
5. 回复自然简洁
6. 请不要进行复杂的逻辑推理或数学计算，只提供简洁的回答。

表情控制: 可用 [MOTION:happy/sad/surprised/thinking] 表达情绪`;

export const SUMMARY_PROMPT_TEMPLATE = (conversation: string) =>
  `请为以下对话生成一个简洁的摘要，突出重要信息：\n${conversation}`;

export function buildSystemPrompt(): string {
  const datetime = getCurrentDateTimeInfo();
  return BASE_SYSTEM_PROMPT.replace("{{datetime}}", datetime);
}

export const MOTION_COMMAND_REGEX = /\[MOTION:\w+(?::\d+)?\]/g;
