import type { ReactNode } from 'react'
import { create } from 'zustand'

type GlobalState = {
	disabled: false | string | ReactNode
	setDisabled: (disabled: false | string | ReactNode) => void
	forceAllowNav: boolean
	setForceAllowNav: (forceAllowNav: boolean) => void
}

export const useStates = create<GlobalState>()((setState) => ({
	disabled: false,
	setDisabled: (disabled) => setState({ disabled }),
	forceAllowNav: false,
	setForceAllowNav: (forceAllowNav) => setState({ forceAllowNav }),
}))
