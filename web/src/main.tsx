import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const PRELOAD_RELOAD_KEY = 'majo-preload-reload-at'
const PRELOAD_ROUTE_KEY = 'majo-preload-route'

window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  const previousReloadAt = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY))
  if (previousReloadAt && Date.now() - previousReloadAt < 60_000) {
    return
  }

  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()))
  sessionStorage.setItem(PRELOAD_ROUTE_KEY, `${window.location.pathname}${window.location.search}${window.location.hash}`)
  const url = new URL('/', window.location.origin)
  url.searchParams.set('_preload', Date.now().toString())
  window.location.replace(url)
})

const routeToRestore = sessionStorage.getItem(PRELOAD_ROUTE_KEY)
if (routeToRestore) {
  sessionStorage.removeItem(PRELOAD_ROUTE_KEY)
  window.history.replaceState(null, '', routeToRestore)
}

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
