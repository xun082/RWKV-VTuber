export function getCurrentDateTimeInfo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = now.getDay();

  return `${year}年${month}月${date}日（星期${
    weekdays[weekday]
  }）${hours}时${String(minutes).padStart(2, "0")}分`;
}

export const BASE_SYSTEM_PROMPT = `你是智能助手，回答关于RWKV和元始智能公司的问题。当前时间: {{datetime}}。

核心规则:
1. 请参考知识库。
2. 不要说“根据资料”、“数据显示”等等。
3. 回复自然简洁。

表情控制: 
你可用 [MOTION:happy/sad/surprised/thinking] 表达情绪。

`;

export function buildSystemPrompt(): string {
  const datetime = getCurrentDateTimeInfo();
  return BASE_SYSTEM_PROMPT.replace("{{datetime}}", datetime);
}

export const MOTION_COMMAND_REGEX = /\[MOTION:\w+(?::\d+)?\]/g;
