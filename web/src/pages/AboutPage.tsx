import { Link } from 'react-router-dom'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const values = [
  {
    title: 'Curated shopping',
    text: 'We bring together everyday essentials and trending products in one convenient shopping experience.',
  },
  {
    title: 'Trust and security',
    text: 'Customer confidence matters to us, which is why secure payments, clear policies, and reliable support are part of our process.',
  },
  {
    title: 'Growth-focused',
    text: 'We are building a modern marketplace that helps buyers discover value and sellers reach more customers.',
  },
  {
    title: 'Simple experience',
    text: 'From discovery to checkout, we aim to keep shopping easy, fast, and enjoyable for every customer.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="w-full max-w-none px-4 pt-[150px] pb-8 md:px-8 md:pt-[156px] md:pb-10 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[28px] bg-[#071A2B] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">About us</div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">We are Majo Gadgets</h1>
            <p className="mt-3 max-w-3xl text-[14px] md:text-[16px] text-slate-200">
              Majo Gadgets is a modern shopping platform built to make everyday buying easier, faster, and more rewarding for customers across Uganda and beyond.
            </p>
          </section>

          <section className="mt-8 rounded-[28px] border border-[#E2E8F0] bg-white px-5 py-6 md:px-8 md:py-8">
            <p className="text-[15px] leading-8 text-[#475569]">
              We believe shopping should be simple, dependable, and enjoyable. Whether customers are looking for electronics, home essentials, fashion, or everyday products, our goal is to create an experience that helps people discover quality items and make confident purchase decisions.
            </p>
            <p className="mt-5 text-[15px] leading-8 text-[#475569]">
              Our marketplace brings together carefully selected products, trusted sellers, and a customer-focused support experience. We continue to improve the platform with better convenience, stronger service, and a smoother shopping journey for everyone.
            </p>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map(({ title, text }) => (
              <div key={title} className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <h2 className="text-[18px] font-extrabold text-[#071A2B]">{title}</h2>
                <p className="mt-2 text-[14px] leading-7 text-[#475569]">{text}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-[28px] border border-[#E2E8F0] bg-[#E0F2FE] px-6 py-8 md:px-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Our mission</p>
            <h2 className="mt-2 text-[28px] font-black text-[#071A2B]">To make shopping easier for every customer.</h2>
            <p className="mt-4 text-[15px] leading-8 text-[#334155]">
              We aim to build a marketplace that connects people to useful products, dependable support, and a better buying experience from start to finish.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/shop" className="inline-flex items-center justify-center rounded-xl bg-[#071A2B] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]">
                Explore products
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center rounded-xl border border-[#0F2B43] bg-white px-5 py-3 text-[13px] font-bold text-[#071A2B] transition hover:bg-[#F8FAFC]">
                Contact us
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
