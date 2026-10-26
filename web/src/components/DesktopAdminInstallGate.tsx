import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { isPwaInstalled, promptToInstall, subscribeToInstalledState, subscribeToInstallPrompt } from '../lib/pwaInstall'

export default function DesktopAdminInstallGate() {
  const [installAvailable, setInstallAvailable] = useState(false)
  const [showInstallSteps, setShowInstallSteps] = useState(false)
  const [appInstalled, setAppInstalled] = useState(isPwaInstalled)

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
      setShowInstallSteps(value => !value)
      return
    }

    const outcome = await promptToInstall()
    if (outcome === 'accepted') {
      window.location.assign('web+majo://admin')
      return
    }
    setShowInstallSteps(true)
  }

  return (
    <main className="min-h-screen bg-[#F4F7F8] flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-2xl text-center">
        <img
          src="/OG.png"
          alt="Majo Gadgets app shown on desktop and mobile"
          className="w-full rounded-lg border border-[#D8E1E5] shadow-sm"
        />
        <h1 className="mt-6 text-2xl font-extrabold text-[#071A2B]">Install Majo Gadgets to continue</h1>
        <p className="mt-3 text-sm leading-6 text-[#536471]">
          Install the Majo Gadgets web app on this desktop, then open it from your desktop or apps menu to access the portal.
        </p>
        {appInstalled ? (
          <>
            <a
              href="web+majo://admin"
              className="mt-6 block rounded-lg border border-[#B7E4C7] bg-white px-4 py-3 text-sm font-semibold text-[#12824C] hover:bg-[#F3FBF6] hover:underline"
            >
              Majo Gadgets is installed. Click here to open the app.
            </a>
            <p className="mt-3 text-xs leading-5 text-[#64748B]">
              If your browser asks, allow Majo Gadgets to open. If nothing happens, launch it from your desktop or apps menu.
            </p>
          </>
        ) : (
          <button
            onClick={installApp}
            className="mt-7 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-[#071A2B] text-white text-sm font-bold hover:bg-[#12344A] transition-colors"
          >
            <Download className="w-4 h-4" />
            {installAvailable ? 'Install desktop app' : 'Show install steps'}
          </button>
        )}
        {showInstallSteps && !appInstalled && (
          <div className="mt-5 rounded-lg border border-[#D8E1E5] bg-white p-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#071A2B]">Install from your browser</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#536471]">
                  In Chrome or Edge, use the install icon in the address bar or choose “Install Majo Gadgets” from the browser menu. In Safari, choose File, then Add to Dock.
                </p>
              </div>
              <button onClick={() => setShowInstallSteps(false)} aria-label="Close install steps" className="p-1 text-[#64748B] hover:text-[#071A2B]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}