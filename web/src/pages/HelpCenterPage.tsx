import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleHelp, CreditCard, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const quickLinks = [
  {
    title: 'Shipping & delivery',
    description: 'Track delivery times, shipping costs, and order updates.',
    icon: Truck,
    to: '/shop',
  },
  {
    title: 'Returns & refunds',
    description: 'Request a return, check your status, and review the policy.',
    icon: PackageCheck,
    to: '/returns',
  },
  {
    title: 'Payments',
    description: 'Learn about checkout options, payment confirmation, and order issues.',
    icon: CreditCard,
    to: '/checkout',
  },
  {
    title: 'Account help',
    description: 'Manage your account, saved items, and order history.',
    icon: ShieldCheck,
    to: '/account',
  },
]

const faqs = [
  {
    category: 'Orders',
    question: 'How do I track my order?',
    answer:
      'Once your payment is confirmed, you will receive an order update in the app and on your order details page. You can track the current status from your account at any time.',
  },
  {
    category: 'Shipping',
    question: 'How long does delivery take?',
    answer:
      'Delivery times vary by location and product availability. Most orders are dispatched quickly, and the shipping status is available in your account once the item has been dispatched.',
  },
  {
    category: 'Returns',
    question: 'Can I return a damaged or wrong item?',
    answer:
      'Yes. If your product arrives damaged, defective, or incorrect, submit a return request from the Returns page and include the order number and a brief reason. We will review it and guide you to the next step.',
  },
  {
    category: 'Payments',
    question: 'What payment methods are available?',
    answer:
      'We support secure card payments and other checkout options available in the app. If you have trouble completing payment, contact support with your order number and a screenshot of the error.',
  },
  {
    category: 'Account',
    question: 'How do I update my account information?',
    answer:
      'You can update your profile details from the account page after logging in. This includes your contact information and saved preferences for orders and notifications.',
  },
  {
    category: 'General',
    question: 'Can I sell my products on Majo Gadgets?',
    answer:
      'Yes. Use the Become a Trader option from the site footer or the seller flow to apply and begin listing your products once your account is approved.',
  },
]

export default function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = ['All', ...new Set(faqs.map(item => item.category))]

  const filteredFaqs = useMemo(() => {
    const term = query.trim().toLowerCase()
    return faqs.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      const matchesQuery =
        term.length === 0 ||
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      return matchesCategory && matchesQuery
    })
  }, [query, selectedCategory])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <section className="rounded-[28px] bg-gradient-to-r from-[#071A2B] via-[#0F2B43] to-[#1E3A8A] px-6 py-8 md:px-10 md:py-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
            <CircleHelp size={14} />
            Help Center
          </div>

          <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Need a quick answer?</h1>
          <p className="mt-3 max-w-2xl text-[14px] md:text-[16px] text-slate-200">
            Find the most common answers about orders, delivery, returns, and account support.
          </p>

          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <Search size={18} className="text-slate-300" />
            <input
              type="text"
              placeholder="Search help topics"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full bg-transparent text-[14px] text-white placeholder:text-slate-300 outline-none"
              aria-label="Search help topics"
            />
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ title, description, icon: Icon, to }) => (
            <Link
              key={title}
              to={to}
              className="group rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#1E3A8A]">
                <Icon size={18} />
              </div>
              <h2 className="mt-4 text-[16px] font-extrabold text-[#071A2B]">{title}</h2>
              <p className="mt-2 text-[13px] leading-6 text-[#64748B]">{description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#1E3A8A]">
                Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-10 rounded-[28px] border border-[#E2E8F0] bg-white p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-3 py-2 text-[12px] font-bold uppercase tracking-[0.08em] transition ${
                  selectedCategory === category
                    ? 'bg-[#071A2B] text-white'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map(item => (
                <details key={item.question} className="group rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <summary className="cursor-pointer list-none text-[15px] font-bold text-[#071A2B]">
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.question}</span>
                      <span className="text-[#64748B] transition-transform group-open:rotate-180">⌄</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-[13px] leading-6 text-[#475569]">{item.answer}</p>
                </details>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center">
                <p className="text-[15px] font-bold text-[#071A2B]">No results found</p>
                <p className="mt-1 text-[13px] text-[#64748B]">Try a different keyword or select another topic.</p>
              </div>
            )}
          </div>
        </section>

        <section id="contact" className="mt-10 rounded-[28px] border border-[#E2E8F0] bg-[#E0F2FE] px-6 py-8 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Need more help?</p>
              <h2 className="mt-2 text-2xl font-black text-[#071A2B]">Still have a question?</h2>
            </div>
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-xl bg-[#071A2B] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]"
            >
              Visit your account
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-[#BAE6FD] bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1E3A8A]">WhatsApp support</p>
              <p className="mt-1 text-[15px] font-extrabold text-[#071A2B]">Majo Gadgets Support</p>
              <p className="text-[13px] text-[#334155]">0794448439</p>
            </div>

            <a
              href="https://wa.me/256794448439?text=Hello%20Majo%20Gadgets%20Support%2C%20I%20need%20help.%20"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#1ebc5f]"
            >
              Chat on WhatsApp
            </a>
          </div>

          <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#334155]">
            For order-specific support, include your order number and the issue you are experiencing. You can also reach out through WhatsApp or through your order details page.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
