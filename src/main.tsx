import 'openai/shims/web'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './tailwind.css'
import { router } from './routes/index.tsx'

const root = document.getElementById('root')
if (!root) {
	throw new Error('Root element not found')
}

createRoot(root).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
