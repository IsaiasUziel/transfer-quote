import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { APP_CONFIG } from './config/app'

document.title = APP_CONFIG.name

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />
  </StrictMode>,
)
