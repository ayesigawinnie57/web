export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALLED_KEY = 'majo-pwa-installed'
let deferredPrompt: InstallPromptEvent | null = null
const promptListeners = new Set<(prompt: InstallPromptEvent | null) => void>()
const installedListeners = new Set<(installed: boolean) => void>()

function publishPrompt(prompt: InstallPromptEvent | null) {
  promptListeners.forEach(listener => listener(prompt))
}

function publishInstalled(installed: boolean) {
  installedListeners.forEach(listener => listener(installed))
}

function markInstalled() {
  localStorage.setItem(INSTALLED_KEY, 'true')
  publishInstalled(true)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    localStorage.removeItem(INSTALLED_KEY)
    publishInstalled(false)
    deferredPrompt = event as InstallPromptEvent
    publishPrompt(deferredPrompt)
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    publishPrompt(null)
    markInstalled()
  })
  window.addEventListener('storage', event => {
    if (event.key === INSTALLED_KEY) publishInstalled(event.newValue === 'true')
  })
}

export function subscribeToInstallPrompt(listener: (prompt: InstallPromptEvent | null) => void) {
  promptListeners.add(listener)
  listener(deferredPrompt)
  return () => {
    promptListeners.delete(listener)
  }
}

export function isPwaInstalled() {
  try {
    return localStorage.getItem(INSTALLED_KEY) === 'true'
      || window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export function subscribeToInstalledState(listener: (installed: boolean) => void) {
  installedListeners.add(listener)
  listener(isPwaInstalled())
  return () => {
    installedListeners.delete(listener)
  }
}

export async function promptToInstall() {
  if (!deferredPrompt) return null

  const prompt = deferredPrompt
  deferredPrompt = null
  publishPrompt(null)
  await prompt.prompt()
  const outcome = (await prompt.userChoice).outcome
  if (outcome === 'accepted') markInstalled()
  return outcome
}

export function requiresDesktopInstall() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return !isMobile && !isStandalone
}