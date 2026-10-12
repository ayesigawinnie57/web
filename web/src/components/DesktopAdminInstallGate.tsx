import { useEffect, useState } from 'react'
import { Download, MonitorDown, X } from 'lucide-react'
import { LOGO } from '../lib/api'
import { promptToInstall, subscribeToInstallPrompt } from '../lib/pwaInstall'

export default function DesktopAdminInstallGate() {
  const [installAvailable, setInstallAvailable] = useState(false)
  const [showInstallSteps, setShowInstallSteps] = useState(false)
  const [installAccepted, setInstallAccepted] = useState(false)

  useEffect(() => subscribeToInstallPrompt(prompt => setInstallAvailable(!!prompt)), [])

  const installApp = async () => {
    if (!installAvailable) {
      setShowInstallSteps(value => !value)
      return
    }

    const outcome = await promptToInstall()
    if (outcome === 'accepted') setInstallAccepted(true)
    else setShowInstallSteps(true)
  }

  return (
    <main className="min-h-screen bg-[#F4F7F8] flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg text-center">
        <img src={LOGO} alt="Majo Gadgets" className="h-14 w-auto mx-auto object-contain" />
        <div className="mt-10 mx-auto w-16 h-16 rounded-full bg-[#E7F7EF] flex items-center justify-center">
          <MonitorDown className="w-8 h-8 text-[#12824C]" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-[#071A2B]">Install Majo Gadgets to continue</h1>
        <p className="mt-3 text-sm leading-6 text-[#536471]">
          Admin accounts must use the desktop app. Install it, then launch Majo Gadgets from your desktop or apps menu.
        </p>
        {installAccepted ? (
          <p role="status" className="mt-6 rounded-lg border border-[#B7E4C7] bg-white px-4 py-3 text-sm font-semibold text-[#12824C]">
            Installation accepted. Open Majo Gadgets from your desktop to continue.
          </p>
        ) : (
          <button
            onClick={installApp}
            className="mt-7 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-[#071A2B] text-white text-sm font-bold hover:bg-[#12344A] transition-colors"
          >
            {installAvailable ? <Download className="w-4 h-4" /> : <MonitorDown className="w-4 h-4" />}
            {installAvailable ? 'Install desktop app' : 'Show install steps'}
          </button>
        )}
        {showInstallSteps && !installAccepted && (
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