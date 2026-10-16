import { AlertCircle, X } from 'lucide-react'

export default function FlashSaleErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="flash-sale-error-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <h2 id="flash-sale-error-title" className="text-base font-extrabold text-[#071A2B]">Unable to save flash sale</h2>
            <p className="mt-2 break-words text-sm leading-6 text-[#536471]">{message}</p>
          </div>
          <button onClick={onClose} aria-label="Close error" className="p-1 text-[#64748B] hover:text-[#071A2B]"><X size={18} /></button>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-[#071A2B] px-4 py-2 text-sm font-bold text-white hover:bg-[#12344A]">Close</button>
        </div>
      </section>
    </div>
  )
}