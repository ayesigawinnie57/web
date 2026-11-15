import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import {
  isPwaInstalled,
  promptToInstall,
  subscribeToInstalledState,
  subscribeToInstallPrompt,
} from '../lib/pwaInstall'

export default function PwaInstallButton() {
  const [installAvailable, setInstallAvailable] = useState(false)
  const [appInstalled, setAppInstalled] = useState(isPwaInstalled)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    const unsubscribePrompt = subscribeToInstallPrompt(prompt => setInstallAvailable(!!prompt))
    const unsubscribeInstalled = subscribeToInstalledState(setAppInstalled)
    return () => {
      unsubscribePrompt()
      unsubscribeInstalled()
    }
  }, [])

  const installApp = async () => {
    if (!installAvailable) {
      setShowInstructions(value => !value)
      return
    }

    const outcome = await promptToInstall()
    if (outcome !== 'accepted') setShowInstructions(true)
  }

  if (appInstalled) return null

  return (
    <div className="relative shrink-0">
      <button
        onClick={installApp}
        aria-label="Install Majo Gadgets app"
        aria-expanded={showInstructions}
        aria-controls="portal-install-instructions"
        title="Install Majo Gadgets"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-2 text-[11px] font-semibold text-white/85 hover:bg-white/10 sm:px-3"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {showInstructions && !installAvailable && (
        <div
          id="portal-install-instructions"
          role="dialog"
          aria-label="Install Majo Gadgets"
          className="absolute right-0 top-full z-50 mt-3 w-72 rounded-lg border border-[#E2E8F0] bg-white p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#071A2B]">Install Majo Gadgets</p>
              <p className="mt-1.5 text-xs leading-5 text-[#64748B]">
                Use your browser menu to install the app or add it to your dock. Installing is optional; you can keep using this browser.
              </p>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              aria-label="Close install instructions"
              className="p-1 text-[#64748B] hover:text-[#071A2B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
