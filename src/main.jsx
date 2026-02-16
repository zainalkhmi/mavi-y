import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import App from './App.jsx'

import { LanguageProvider } from './contexts/LanguageContext'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const knownBenignChannelClosedMessage =
    'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMessage = String(event?.reason?.message || event?.reason || '')
    if (reasonMessage.includes(knownBenignChannelClosedMessage)) {
      // Usually caused by browser extensions/runtime channel behavior.
      // Keep console noise down while preserving other real rejections.
      event.preventDefault()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
