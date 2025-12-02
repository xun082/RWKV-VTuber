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
}))
