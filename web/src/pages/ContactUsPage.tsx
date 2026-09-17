import { Link } from 'react-router-dom'
import { MessageCircleMore, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const contactMethods = [
  {
    icon: Phone,
    label: 'Call or WhatsApp',
    value: '0794448439',
    href: 'https://wa.me/256794448439?text=Hello%20Majo%20Gadgets%20Support%2C%20I%20need%20help.%20',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'support@majogadgets.com',
    href: 'mailto:support@majogadgets.com',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Uganda',
    href: '#',
  },
]

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="w-full max-w-none px-4 pt-[150px] pb-8 md:px-8 md:pt-[156px] md:pb-10 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[28px] bg-[#071A2B] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
              <MessageCircleMore size={14} />
              Contact
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Contact Us</h1>
            <p className="mt-3 max-w-3xl text-[14px] md:text-[16px] text-slate-200">
              Reach out to our support team for order help, delivery questions, returns, and general customer assistance.
            </p>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            {contactMethods.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E0F2FE] text-[#1E3A8A]">
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
                {href === '#' ? (
                  <p className="mt-2 text-[18px] font-extrabold text-[#071A2B]">{value}</p>
                ) : (
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="mt-2 block text-[18px] font-extrabold text-[#071A2B] hover:text-[#1E3A8A]">
                    {value}
                  </a>
                )}
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-[28px] border border-[#E2E8F0] bg-white p-6 md:p-8">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">
              <ShieldCheck size={14} />
              Support hours
            </div>
            <h2 className="mt-3 text-[22px] font-black text-[#071A2B]">We’re here to help</h2>
            <p className="mt-3 text-[15px] leading-8 text-[#475569]">
              Our support team is available to assist with order updates, payment concerns, returns, delayed deliveries, and account-related questions. Please include your order number and a brief description of the issue so we can respond faster.
            </p>

            <div className="mt-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-5">
              <p className="text-[14px] font-bold text-[#071A2B]">WhatsApp support</p>
              <p className="mt-2 text-[14px] leading-7 text-[#475569]">
                For quick assistance, message us directly on WhatsApp at 0794448439 and we will guide you to the next step.
              </p>
              <a
                href="https://wa.me/256794448439?text=Hello%20Majo%20Gadgets%20Support%2C%20I%20need%20help.%20"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#25D366] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#1ebc5f]"
              >
                Chat on WhatsApp
              </a>
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link to="/help-center" className="inline-flex items-center justify-center rounded-xl bg-[#071A2B] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]">
              Back to Help Center
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
