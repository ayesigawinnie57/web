import { Link } from 'react-router-dom'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const sections = [
  {
    title: '1. Information we collect',
    text:
      'We may collect personal information such as your name, email address, phone number, delivery address, order details, payment information, account preferences, and browsing activity necessary to provide our services securely and efficiently.',
  },
  {
    title: '2. How we use your information',
    text:
      'We use your information to process orders, confirm payments, communicate with you about purchases, provide customer support, improve product recommendations, prevent fraud, and maintain the security of our platform.',
  },
  {
    title: '3. Sharing of information',
    text:
      'We do not sell your personal information. We may share information with trusted service providers who help us operate the website, process payments, deliver products, send notifications, or provide technical support, as required to deliver our services.',
  },
  {
    title: '4. Cookies and tracking',
    text:
      'We may use cookies, analytics tools, and similar technologies to understand site usage, remember your preferences, and improve the performance and user experience of our platform. You can manage cookie preferences in your browser settings.',
  },
  {
    title: '5. Data security',
    text:
      'We take reasonable steps to protect personal data using secure systems, access controls, and trusted processing practices. However, no online service can guarantee absolute security, and we encourage users to keep their login details confidential.',
  },
  {
    title: '6. Retention of information',
    text:
      'We keep your personal information only for as long as necessary to fulfill the purposes described in this policy, comply with legal obligations, resolve disputes, and enforce our terms and policies.',
  },
  {
    title: '7. Your rights',
    text:
      'You may have the right to access, correct, update, or request deletion of your personal data depending on applicable laws. If you would like to exercise any of these rights, please contact us through the support channels available on our website.',
  },
  {
    title: '8. Third-party links',
    text:
      'Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those external websites, and we encourage you to review their policies before providing any personal information.',
  },
  {
    title: '9. Updates to this policy',
    text:
      'We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform improvements. Continued use of the platform after updates indicates your acceptance of the revised policy.',
  },
  {
    title: '10. Contact us',
    text:
      'If you have questions, concerns, or requests regarding this Privacy Policy, please contact us through WhatsApp at 0794448439 or using the support channels available on the website.',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="w-full max-w-none px-4 pt-[150px] pb-8 md:px-8 md:pt-[156px] md:pb-10 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[28px] bg-[#071A2B] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
              <ShieldCheck size={14} />
              Privacy
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Privacy Policy</h1>
            <p className="mt-3 max-w-3xl text-[14px] md:text-[16px] text-slate-200">
              Please read this policy carefully to understand how we collect, use, and protect your personal information.
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
                Your privacy matters
              </p>
              <p className="mt-3 text-[15px] leading-8 text-[#334155]">
                We are committed to protecting your information and keeping your experience safe, transparent, and respectful of your privacy rights.
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
