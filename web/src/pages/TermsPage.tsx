import { Link } from 'react-router-dom'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const sections = [
  {
    title: '1. Acceptance of terms',
    text:
      'By accessing and using Majo Gadgets, you agree to these Terms and Conditions and any additional policies posted on the platform. If you do not agree, please do not use the website or mobile app.',
  },
  {
    title: '2. Orders and purchases',
    text:
      'All products listed on the platform are subject to availability. We reserve the right to refuse, cancel, or limit any order at our discretion. Prices, product descriptions, and delivery information may be updated without notice.',
  },
  {
    title: '3. Payment and confirmation',
    text:
      'Orders must be paid in accordance with the payment method selected at checkout. We may require confirmation before processing an order, especially for mobile money, bank transfer, or any payment method requiring manual verification.',
  },
  {
    title: '4. Delivery and fulfillment',
    text:
      'Delivery timelines are estimates and may vary depending on location, product availability, and external factors beyond our control. Once an order has been dispatched, delivery remains subject to the courier or delivery partner timeline.',
  },
  {
    title: '5. Returns and refunds',
    text:
      'Returns are accepted where the product is damaged, incorrect, or not as described. Refunds or replacements may be issued according to our return policy and after review of the returned item or proof provided by the customer.',
  },
  {
    title: '6. Product information',
    text:
      'We make every effort to provide accurate product details, images, and pricing. However, we do not guarantee that all information is error-free, complete, or current at all times. Product availability is subject to change.',
  },
  {
    title: '7. User responsibilities',
    text:
      'Customers are responsible for providing accurate delivery details, contact information, and any relevant instructions for order fulfillment. Any false, misleading, or incomplete information may delay processing or delivery.',
  },
  {
    title: '8. Account security',
    text:
      'Users are responsible for safeguarding their account credentials. You agree to notify us immediately if you suspect unauthorized use of your account.',
  },
  {
    title: '9. Intellectual property',
    text:
      'All content on Majo Gadgets, including text, product images, branding, and design, is protected by intellectual property laws and may not be copied, reproduced, distributed, or used without prior written permission.',
  },
  {
    title: '10. Limitation of liability',
    text:
      'Majo Gadgets shall not be liable for indirect, incidental, or consequential damages arising from the use of the platform, including delays, losses, or issues caused by third-party delivery services, outages, or circumstances beyond our reasonable control.',
  },
  {
    title: '11. Changes to terms',
    text:
      'We may update these Terms and Conditions from time to time. Continued use of the platform after updates means you accept the revised terms.',
  },
  {
    title: '12. Contact us',
    text:
      'If you have questions about these Terms and Conditions, please contact us via WhatsApp at 0794448439 or through the support channels available on the website.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="w-full max-w-none px-4 pt-[150px] pb-8 md:px-8 md:pt-[156px] md:pb-10 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[28px] bg-gradient-to-r from-[#071A2B] via-[#0F2B43] to-[#1E3A8A] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
              <ShieldCheck size={14} />
              Legal
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Terms and Conditions</h1>
            <p className="mt-3 max-w-3xl text-[14px] md:text-[16px] text-slate-200">
              Please read these terms carefully before using Majo Gadgets products and services.
            </p>
          </section>

          <section className="mt-8 bg-white border border-[#E2E8F0] rounded-[28px] px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-8">
              {sections.map(section => (
                <div key={section.title} className="border-b border-[#E2E8F0] pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-[18px] md:text-[20px] font-extrabold text-[#071A2B] mb-3">{section.title}</h2>
                  <p className="text-[15px] leading-8 text-[#475569]">{section.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
              <p className="flex items-center gap-2 text-[15px] font-bold text-[#071A2B]">
                <CheckCircle2 size={16} className="text-green-600" />
                Agreement confirmation
              </p>
              <p className="mt-3 text-[15px] leading-8 text-[#334155]">
                By using our platform, you confirm that you understand and agree to these terms. If you need clarification, please contact support before placing an order.
              </p>
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
