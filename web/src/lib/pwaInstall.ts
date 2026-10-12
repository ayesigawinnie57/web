export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredPrompt: InstallPromptEvent | null = null
const promptListeners = new Set<(prompt: InstallPromptEvent | null) => void>()

function publishPrompt(prompt: InstallPromptEvent | null) {
  promptListeners.forEach(listener => listener(prompt))
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    publishPrompt(deferredPrompt)
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    publishPrompt(null)
  })
}

export function subscribeToInstallPrompt(listener: (prompt: InstallPromptEvent | null) => void) {
  promptListeners.add(listener)
  listener(deferredPrompt)
  return () => {
    promptListeners.delete(listener)
  }
}

export async function promptToInstall() {
  if (!deferredPrompt) return null

  const prompt = deferredPrompt
  deferredPrompt = null
  publishPrompt(null)
  await prompt.prompt()
  return (await prompt.userChoice).outcome
}

export function requiresDesktopInstall() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return !isMobile && !isStandalone
}