import type { ReactNode } from 'react'
import { create } from 'zustand'

type TtsPlaybackState = 'idle' | 'playing' | 'paused'

type GlobalState = {
	disabled: false | string | ReactNode
	setDisabled: (disabled: false | string | ReactNode) => void
	forceAllowNav: boolean
	setForceAllowNav: (forceAllowNav: boolean) => void
	ttsPlaybackState: TtsPlaybackState
	setTtsPlaybackState: (state: TtsPlaybackState) => void
	ttsActiveMessageId: string | null
	setTtsActiveMessageId: (
		id: string | null | ((prev: string | null) => string | null),
	) => void
	ttsPausedMessageIds: string[]
	addTtsPausedMessageId: (id: string) => void
	removeTtsPausedMessageId: (id: string) => void
	clearAllPausedMessages: () => void
	ttsProgress: Record<string, number>
	setTtsProgress: (id: string, seconds: number) => void
	clearTtsProgress: (id: string) => void
	clearAllTtsProgress: () => void
	ttsLoadingMessageId: string | null
	setTtsLoadingMessageId: (
		id: string | null | ((prev: string | null) => string | null),
	) => void
}

export const useStates = create<GlobalState>()((setState) => ({
	disabled: false,
	setDisabled: (disabled) => setState({ disabled }),
	forceAllowNav: false,
	setForceAllowNav: (forceAllowNav) => setState({ forceAllowNav }),
	ttsPlaybackState: 'idle',
	setTtsPlaybackState: (ttsPlaybackState) => setState({ ttsPlaybackState }),
	ttsActiveMessageId: null,
	setTtsActiveMessageId: (ttsActiveMessageId) =>
		setState((state) => ({
			ttsActiveMessageId:
				typeof ttsActiveMessageId === 'function'
					? ttsActiveMessageId(state.ttsActiveMessageId)
					: ttsActiveMessageId,
		})),
	ttsPausedMessageIds: [],
	addTtsPausedMessageId: (id) =>
		setState((state) => {
			// 如果已经在列表中，不重复添加
			if (state.ttsPausedMessageIds.includes(id)) {
				console.log(`[useStates] 消息 ${id.slice(0, 8)} 已在暂停列表中`)
				return state
			}
			const newPausedIds = [...state.ttsPausedMessageIds, id]
			console.log(`[useStates] ✅ 添加暂停消息 ${id.slice(0, 8)}, 新列表:`, newPausedIds.map(i => i.slice(0, 8)))
			return { ttsPausedMessageIds: newPausedIds }
		}),
	removeTtsPausedMessageId: (id) =>
		setState((state) => {
			const newPausedIds = state.ttsPausedMessageIds.filter(pausedId => pausedId !== id)
			console.log(`[useStates] ✅ 移除暂停消息 ${id.slice(0, 8)}, 新列表:`, newPausedIds.map(i => i.slice(0, 8)))
			return { ttsPausedMessageIds: newPausedIds }
		}),
	clearAllPausedMessages: () => {
		console.log(`[useStates] 清空所有暂停消息`)
		return setState({ ttsPausedMessageIds: [] })
	},
	ttsProgress: {},
	setTtsProgress: (id, seconds) =>
		setState((state) => ({
			ttsProgress: { ...state.ttsProgress, [id]: Math.max(seconds, 0) },
		})),
	clearTtsProgress: (id) =>
		setState((state) => {
			const next = { ...state.ttsProgress }
			delete next[id]
			return { ttsProgress: next }
		}),
	clearAllTtsProgress: () => setState({ ttsProgress: {} }),
	ttsLoadingMessageId: null,
	setTtsLoadingMessageId: (ttsLoadingMessageId) =>
		setState((state) => ({
			ttsLoadingMessageId:
				typeof ttsLoadingMessageId === 'function'
					? ttsLoadingMessageId(state.ttsLoadingMessageId)
					: ttsLoadingMessageId,
		})),
}))
