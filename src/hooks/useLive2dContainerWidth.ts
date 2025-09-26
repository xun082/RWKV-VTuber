import { type RefObject, useEffect } from 'react'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import { useLive2dApi } from '../stores/useLive2dApi'
import { useIsMobile } from './useIsMobile'

export function useLive2dContainerWidth(
	leftPanelRef: RefObject<ImperativePanelHandle | null>,
) {
	const isMobile = useIsMobile()
	const isFullScreen = useLive2dApi((state) => state.isFullScreen)

	// 更新 Live2D 容器宽度的函数
	const updateLive2dContainerWidth = () => {
		const bg = document.getElementById('back-container')
		const l2d = document.getElementById('live2d-container')

		if (!bg || !l2d) {
			console.error('容器加载失败')
			return
		}

		if (isFullScreen) {
			bg.style.width = '100dvw'
			l2d.style.width = '100dvw'
			// 全屏模式下确保不会被截取
			bg.style.overflow = 'visible'
			l2d.style.overflow = 'visible'
		} else if (isMobile) {
			bg.style.width = '0'
			l2d.style.width = '0'
		} else {
			// 在桌面模式下，获取左侧面板的实际宽度
			const leftPanel = leftPanelRef.current
			if (leftPanel) {
				const size = leftPanel.getSize()
				const leftWidth = `${size}%`
				bg.style.width = leftWidth
				l2d.style.width = leftWidth
				// 确保容器不会裁剪内容
				bg.style.overflow = 'visible'
				l2d.style.overflow = 'visible'
			}
		}
	}

	// 布局调整
	useEffect(() => {
		updateLive2dContainerWidth()
	}, [isMobile, isFullScreen])

	// 监听面板大小变化
	useEffect(() => {
		if (isMobile || isFullScreen) return

		const handleResize = () => {
			updateLive2dContainerWidth()
		}

		// 使用 MutationObserver 监听 DOM 变化
		const observer = new MutationObserver(handleResize)
		const targetNode = document.body
		observer.observe(targetNode, {
			attributes: true,
			childList: true,
			subtree: true,
			attributeFilter: ['style'],
		})

		return () => {
			observer.disconnect()
		}
	}, [isMobile, isFullScreen])

	return { updateLive2dContainerWidth }
}
