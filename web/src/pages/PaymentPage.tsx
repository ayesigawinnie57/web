import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CreditCard, MessageCircleMore, ShieldCheck } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="rounded-[28px] bg-gradient-to-r from-[#071A2B] via-[#0F2B43] to-[#1E3A8A] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
            <CreditCard size={14} />
            Payment Information
          </div>
          <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Complete your payment</h1>
          <p className="mt-3 max-w-2xl text-[14px] md:text-[16px] text-slate-200">
            Please use the payment details below to complete your order. Once payment is sent, contact our support team to confirm the transaction.
          </p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <ShieldCheck className="text-[#1E3A8A]" size={22} />
              <h2 className="text-[20px] font-extrabold text-[#071A2B]">Payment details</h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Account name</p>
                <p className="mt-2 text-[18px] font-black text-[#071A2B]">Majo Gadgets</p>
              </div>

              <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Payment method</p>
                <p className="mt-2 text-[18px] font-black text-[#071A2B]">Mobile Money / Bank Transfer</p>
              </div>

              <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Reference to include</p>
                <p className="mt-2 text-[18px] font-black text-[#071A2B]">Your full name and order number</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5">
              <p className="text-[13px] leading-7 text-[#334155]">
                Please send the payment proof after making the transfer. Include your order number so we can confirm and process your order quickly.
              </p>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 md:p-7">
            <div className="flex items-center gap-3">
              <MessageCircleMore className="text-[#25D366]" size={22} />
              <h2 className="text-[20px] font-extrabold text-[#071A2B]">Contact support</h2>
            </div>

            <div className="mt-5 rounded-2xl border border-[#BAE6FD] bg-[#E0F2FE] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1E3A8A]">WhatsApp</p>
              <p className="mt-2 text-[18px] font-black text-[#071A2B]">Majo Gadgets Support</p>
              <p className="mt-1 text-[15px] text-[#334155]">0794448439</p>
            </div>

            <a
              href="https://wa.me/256794448439?text=Hello%20Majo%20Gadgets%20Support%2C%20I%20want%20to%20confirm%20payment%20for%20my%20order."
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#1ebc5f]"
            >
              Chat on WhatsApp
              <ArrowRight size={15} />
            </a>

            <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="flex items-center gap-2 text-[13px] font-bold text-[#071A2B]">
                <CheckCircle2 size={16} className="text-green-600" />
                Step after payment
              </p>
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-[#475569]">
                <li>• Send the payment proof on WhatsApp.</li>
                <li>• Share your order number and full name.</li>
                <li>• Our team will confirm the transaction.</li>
              </ul>
            </div>
          </aside>
        </section>

        <div className="mt-8 text-center">
          <Link to="/checkout" className="inline-flex items-center justify-center rounded-xl bg-[#071A2B] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]">
            Go back to checkout
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
