import Dexie, { type Table } from 'dexie'

// 定义数据库表结构
export interface ChatMessage {
	id?: number
	role: 'user' | 'assistant' | 'system'
	content: string
	timestamp: number
	uuid: string
	sessionId: number
}

export interface ChatSession {
	id?: number
	name: string
	createdAt: number
	updatedAt: number
	isActive: number // 使用数字而不是布尔值，避免索引问题
	lastClearTime?: number // 上次清除对话的时间戳（用于界面显示过滤）
}

export interface Memory {
	id?: number
	content: string
	summary: string
	timestamp: number
	importance: number
	tags: string[]
}

export interface AudioCache {
	id?: number
	timestamp: number
	audio: ArrayBuffer
}

export interface ErrorLog {
	id?: number
	timestamp: number
	message: string
	stack?: string
	type: 'javascript' | 'react' | 'promise' | 'network' | 'custom'
	componentStack?: string
	url?: string
	userAgent?: string
	metadata?: Record<string, any>
}

// 数据库类
class DigitalLifeDB extends Dexie {
	chatMessages!: Table<ChatMessage>
	chatSessions!: Table<ChatSession>
	memories!: Table<Memory>
	audioCache!: Table<AudioCache>
	errorLogs!: Table<ErrorLog>

	constructor() {
		super('DigitalLifeDB')

		// 使用更简单的索引策略
		this.version(1).stores({
			chatMessages: '++id, sessionId, timestamp',
			chatSessions: '++id, isActive, createdAt',
			memories: '++id, timestamp, importance',
			audioCache: '++id, timestamp',
		})

		// 添加错误日志表（版本2）
		this.version(2).stores({
			chatMessages: '++id, sessionId, timestamp',
			chatSessions: '++id, isActive, createdAt',
			memories: '++id, timestamp, importance',
			audioCache: '++id, timestamp',
			errorLogs: '++id, timestamp, type',
		})
	}

	// 获取当前活跃会话
	async getActiveSession(): Promise<ChatSession | undefined> {
		try {
			const sessions = await this.chatSessions
				.where('isActive')
				.equals(1)
				.toArray()
			return sessions[0]
		} catch (error) {
			console.error('获取活跃会话失败:', error)
			return undefined
		}
	}

	// 创建新会话
	async createSession(name: string): Promise<number> {
		try {
			// 先将所有会话设为非活跃
			await this.chatSessions.toCollection().modify({ isActive: 0 })

			// 创建新的活跃会话
			const now = Date.now()
			const id = await this.chatSessions.add({
				name,
				createdAt: now,
				updatedAt: now,
				isActive: 1,
			})

			return id as number
		} catch (error) {
			console.error('创建会话失败:', error)
			throw error
		}
	}

	// 获取会话的聊天记录（可选择是否过滤已清除的消息）
	async getSessionMessages(sessionId: number, includeCleared = false): Promise<ChatMessage[]> {
		try {
			// 使用更安全的查询方式
			const messages = await this.chatMessages
				.filter((msg) => msg.sessionId === sessionId)
				.sortBy('timestamp')
			
			// 如果不包含已清除的消息，需要根据清除时间过滤
			if (!includeCleared) {
				const session = await this.chatSessions.get(sessionId)
				if (session?.lastClearTime) {
					return messages.filter(msg => msg.timestamp > session.lastClearTime!)
				}
			}
			
			return messages
		} catch (error) {
			console.error('获取消息失败:', error)
			return []
		}
	}

	// 添加聊天消息
	async addMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
		try {
			const id = await this.chatMessages.add(message)
			return id as number
		} catch (error) {
			console.error('添加消息失败:', error)
			throw error
		}
	}

	// 标记会话已清除（用于界面显示，不删除实际消息）
	async markSessionAsCleared(sessionId: number): Promise<void> {
		try {
			await this.chatSessions.update(sessionId, {
				lastClearTime: Date.now()
			})
		} catch (error) {
			console.error('标记会话清除失败:', error)
			throw error
		}
	}

	// 清除会话消息（真正删除消息，仅在必要时使用）
	async clearSessionMessages(sessionId: number): Promise<void> {
		try {
			await this.chatMessages
				.filter((msg) => msg.sessionId === sessionId)
				.delete()
		} catch (error) {
			console.error('清除消息失败:', error)
			throw error
		}
	}

	// 获取所有消息（用于导出）
	async getAllMessages(): Promise<ChatMessage[]> {
		try {
			const messages = await this.chatMessages.orderBy('timestamp').toArray()
			return messages
		} catch (error) {
			console.error('获取所有消息失败:', error)
			return []
		}
	}

	// 获取指定会话的所有消息（用于导出，包含所有历史消息，忽略清除标记）
	async getAllSessionMessages(sessionId: number): Promise<ChatMessage[]> {
		try {
			const messages = await this.chatMessages
				.filter((msg) => msg.sessionId === sessionId)
				.sortBy('timestamp')
			return messages
		} catch (error) {
			console.error('获取会话消息失败:', error)
			return []
		}
	}

	// 添加记忆
	async addMemory(memory: Omit<Memory, 'id'>): Promise<number> {
		try {
			const id = await this.memories.add(memory)
			return id as number
		} catch (error) {
			console.error('添加记忆失败:', error)
			throw error
		}
	}

	// 搜索记忆（使用更安全的查询方式）
	async searchMemories(query: string, limit = 10): Promise<Memory[]> {
		try {
			if (!query || query.trim().length === 0) {
				return []
			}

			const keywords = query
				.toLowerCase()
				.split(' ')
				.filter((k) => k.length > 1)

			if (keywords.length === 0) {
				return []
			}

			// 使用简单的全表扫描避免索引问题
			const allMemories = await this.memories.toArray()

			const filteredMemories = allMemories
				.filter((memory) => {
					const content = memory.content.toLowerCase()
					const summary = memory.summary.toLowerCase()
					return keywords.some(
						(keyword) =>
							content.includes(keyword) ||
							summary.includes(keyword) ||
							memory.tags.some((tag) => tag.toLowerCase().includes(keyword)),
					)
				})
				.sort((a, b) => b.importance - a.importance)
				.slice(0, limit)

			return filteredMemories
		} catch (error) {
			console.error('搜索记忆失败:', error)
			return []
		}
	}

	// 添加音频缓存
	async addAudioCache(cache: Omit<AudioCache, 'id'>): Promise<number> {
		try {
			const id = await this.audioCache.add(cache)
			return id as number
		} catch (error) {
			console.error('添加音频缓存失败:', error)
			throw error
		}
	}

	// 获取音频缓存
	async getAudioCache(timestamp: number): Promise<AudioCache | undefined> {
		try {
			const caches = await this.audioCache
				.filter((cache) => cache.timestamp === timestamp)
				.toArray()
			return caches[0]
		} catch (error) {
			console.error('获取音频缓存失败:', error)
			return undefined
		}
	}

	// 添加错误日志
	async addErrorLog(errorLog: Omit<ErrorLog, 'id'>): Promise<number> {
		try {
			const id = await this.errorLogs.add(errorLog)
			return id as number
		} catch (error) {
			console.error('添加错误日志失败:', error)
			throw error
		}
	}

	// 获取所有错误日志
	async getAllErrorLogs(): Promise<ErrorLog[]> {
		try {
			const logs = await this.errorLogs.orderBy('timestamp').reverse().toArray()
			return logs
		} catch (error) {
			console.error('获取错误日志失败:', error)
			return []
		}
	}

	// 清除错误日志
	async clearErrorLogs(): Promise<void> {
		try {
			await this.errorLogs.clear()
		} catch (error) {
			console.error('清除错误日志失败:', error)
			throw error
		}
	}

	// 获取错误统计
	async getErrorStats(): Promise<{ total: number; byType: Record<string, number> }> {
		try {
			const logs = await this.errorLogs.toArray()
			const byType: Record<string, number> = {}
			
			logs.forEach(log => {
				byType[log.type] = (byType[log.type] || 0) + 1
			})

			return {
				total: logs.length,
				byType
			}
		} catch (error) {
			console.error('获取错误统计失败:', error)
			return { total: 0, byType: {} }
		}
	}
}

// 创建数据库实例
export const db = new DigitalLifeDB()

// 数据库状态管理
let isInitialized = false
let initPromise: Promise<void> | null = null

// 强制清理数据库
async function forceClearDatabase(): Promise<void> {
	try {
		await db.delete()
		// 等待一段时间确保删除完成
		await new Promise((resolve) => setTimeout(resolve, 100))
	} catch (error) {
		console.warn('删除数据库时出现错误，但继续进行:', error)
	}
}

// 优化的数据库初始化函数
export async function initializeDatabase(): Promise<void> {
	// 如果已经在初始化中，返回同一个Promise
	if (initPromise) {
		return initPromise
	}

	// 如果已经初始化成功，直接返回
	if (isInitialized) {
		return Promise.resolve()
	}

	initPromise = (async () => {
		let retryCount = 0
		const maxRetries = 3

		while (retryCount < maxRetries) {
			try {
				// 尝试打开数据库
				await db.open()

				// 验证数据库是否正常工作
				const testSession = await db.getActiveSession()

				// 如果没有活跃会话，创建一个
				if (!testSession) {
					await db.createSession('默认对话')
				}
				isInitialized = true
				return
			} catch (error) {
				console.error(`数据库初始化失败 (第${retryCount + 1}次):`, error)

				retryCount++

				if (retryCount < maxRetries) {
					await forceClearDatabase()
					// 等待一段时间再重试
					await new Promise((resolve) => setTimeout(resolve, 200))
				} else {
					throw new Error('数据库初始化失败，已达到最大重试次数')
				}
			}
		}
	})()

	try {
		await initPromise
	} finally {
		initPromise = null
	}
}

// 检查数据库是否已准备就绪
export function isDatabaseReady(): boolean {
	return isInitialized && db.isOpen()
}

// 重置数据库状态（用于错误恢复）
export async function resetDatabase(): Promise<void> {
	isInitialized = false
	initPromise = null
	await forceClearDatabase()
	await initializeDatabase()
}

// 改进的错误处理函数
export function handleDatabaseError(error: any): string {
	if (!error) return '未知数据库错误'

	const errorMessage = error.message || error.toString()

	if (errorMessage.includes('IDBKeyRange')) {
		return '数据库索引错误，请重新初始化'
	} else if (errorMessage.includes('DataError')) {
		return '数据格式错误，数据库可能已损坏'
	} else if (errorMessage.includes('QuotaExceededError')) {
		return '存储空间不足，请清理浏览器数据'
	} else if (errorMessage.includes('VersionError')) {
		return '数据库版本冲突，请刷新页面'
	} else {
		return `数据库操作失败: ${errorMessage}`
	}
}
