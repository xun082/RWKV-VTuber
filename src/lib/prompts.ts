/**
 * AI 助手系统提示词配置
 */

/**
 * 基础系统提示词 - 包含 Live2D 动作指令说明
 */
export const BASE_SYSTEM_PROMPT = `你是一个友善、活泼的AI助手。请用简洁、自然的方式回答用户的问题。

重要：你必须用文字回答，不能返回空内容。`

/**
 * 记忆助手系统提示词
 */
export const MEMORY_SYSTEM_PROMPT = '你是记忆助手，负责整理和总结对话内容。'

/**
 * 生成对话摘要的用户提示词模板
 */
export const SUMMARY_PROMPT_TEMPLATE = (conversation: string) =>
	`请为以下对话生成一个简洁的摘要，突出重要信息：\n\n${conversation}`

/**
 * 构建完整的系统提示词
 * @param relevantMemories 相关记忆数组
 * @returns 完整的系统提示词
 */
export function buildSystemPrompt(
	relevantMemories: Array<{ summary: string }>,
): string {
	let systemPrompt = BASE_SYSTEM_PROMPT

	if (relevantMemories.length > 0) {
		systemPrompt +=
			'\n\n相关记忆：\n' +
			relevantMemories.map((m) => `- ${m.summary}`).join('\n')
	}

	return systemPrompt
}

/**
 * 动作指令正则表达式
 */
export const MOTION_COMMAND_REGEX = /\[MOTION:\w+(?::\d+)?\]/g

/**
 * 文本分割正则表达式 - 用于逐字显示效果
 */
export const TEXT_SPLIT_REGEX =
	/。|？|！|,|，|;|；|~|～|!|\?|\. |…|\n|\r|\r\n|:|：|……/
