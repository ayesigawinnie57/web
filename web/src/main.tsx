import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const PRELOAD_RELOAD_KEY = 'majo-preload-reload'

window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) {
    sessionStorage.removeItem(PRELOAD_RELOAD_KEY)
    return
  }

  sessionStorage.setItem(PRELOAD_RELOAD_KEY, 'true')
  const url = new URL(window.location.href)
  url.searchParams.set('_preload', Date.now().toString())
  window.location.replace(url)
})

window.addEventListener('load', () => {
  sessionStorage.removeItem(PRELOAD_RELOAD_KEY)
}, { once: true })

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => undefined)
  }, { once: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
