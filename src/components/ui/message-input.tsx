import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mic, MicOff, Send } from 'lucide-react'
import type React from 'react'
import { forwardRef, useRef, useState } from 'react'

interface MessageInputProps {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
	disabled?: boolean
	loading?: boolean
	placeholder?: string
	allowSpeech?: {
		recording: boolean
		onRecordingChange: (recording: boolean) => void
	}
	header?: React.ReactNode
}

export const MessageInput = forwardRef<HTMLDivElement, MessageInputProps>(
	(
		{
			value,
			onChange,
			onSubmit,
			disabled,
			loading,
			placeholder,
			allowSpeech,
			header,
		},
		ref,
	) => {
		const textareaRef = useRef<HTMLTextAreaElement>(null)
		const [isComposing, setIsComposing] = useState(false)

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
				e.preventDefault()
				if (!disabled && !loading && value.trim()) {
					onSubmit()
				}
			}
		}

		const handleSubmit = () => {
			if (!disabled && !loading && value.trim()) {
				onSubmit()
			}
		}

		return (
			<div ref={ref} className='w-full'>
				{header && <div className='mb-2'>{header}</div>}

				<div className='flex items-end gap-2 p-3 border rounded-lg bg-background'>
					<Textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => setIsComposing(true)}
						onCompositionEnd={() => setIsComposing(false)}
						placeholder={placeholder || '输入消息...'}
						disabled={disabled}
						className='min-h-[40px] max-h-[120px] resize-none'
						rows={1}
					/>

					<div className='flex flex-col gap-1'>
						{allowSpeech && (
							<Button
								type='button'
								variant={allowSpeech.recording ? 'destructive' : 'outline'}
								size='icon'
								onClick={() =>
									allowSpeech.onRecordingChange(!allowSpeech.recording)
								}
								disabled={disabled}
								className='h-8 w-8'
							>
								{allowSpeech.recording ? (
									<MicOff className='h-4 w-4' />
								) : (
									<Mic className='h-4 w-4' />
								)}
							</Button>
						)}

						<Button
							type='button'
							onClick={handleSubmit}
							disabled={disabled || loading || !value.trim()}
							size='icon'
							className='h-8 w-8'
						>
							<Send className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</div>
		)
	},
)

MessageInput.displayName = 'MessageInput'
