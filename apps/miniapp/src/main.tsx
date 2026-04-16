import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { initializeTelegramMiniApp } from './lib/telegramMiniApp.ts'
import './index.css'

// Initialize dark mode before first render
if (localStorage.getItem('turon-dark') === '1') {
  document.body.classList.add('dark');
}

initializeTelegramMiniApp()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <div className="tg-app-shell" data-tg-scroll-root>
        <App />
      </div>
    </ToastProvider>
  </React.StrictMode>,
)
