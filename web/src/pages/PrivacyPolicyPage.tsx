import { Link } from 'react-router-dom'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const sections: { title: string; text?: string; paragraphs?: string[] }[] = [
  {
    title: '1. Information we collect',
    text:
      'We may collect personal information such as your name, email address, phone number, delivery address, order details, payment information, account preferences, and browsing activity necessary to provide our services securely and efficiently. For account security, we also process sign-in verification status, a device or browser description, and sign-in timestamps for administrator and approved trader accounts.',
  },
  {
    title: '2. How we use your information',
    text:
      'We use your information to process orders, confirm payments, communicate with you about purchases, provide customer support, improve product recommendations, prevent fraud, and maintain the security of our platform. For administrators and approved traders, we use email-based two-factor authentication (2FA) to verify sign-ins and send an email alert after a successful sign-in.',
  },
  {
    title: '3. Account Security and Sign-In Alerts',
    paragraphs: [
      'We take the security of your Majo Gadgets account seriously. To help protect your account from unauthorized access, approved traders may be required to verify their identity using a one-time verification code sent to their registered email address when signing in from an unrecognized device.',
      'Verification codes expire after 10 minutes and can only be used once. For your security, never share your verification code with anyone.',
      'Where available, you may choose to remember a trusted device for up to seven days for a more convenient sign-in experience. Remembered-device credentials are stored securely in a hashed form. You must still enter your password when signing in from a remembered device.',
      'After a successful sign-in, we may send you an email notification containing a description of the device or browser used and the time of access. These alerts help you recognize legitimate activity and identify sign-ins you do not recognize.',
      'If you receive an alert about activity you did not authorize, we recommend changing your password promptly and contacting Majo Gadgets Support for assistance.',
    ],
  },
  {
    title: '4. Optional Location Information',
    paragraphs: [
      "To provide additional context in security notifications, Majo Gadgets may request permission to access your device's location during sign-in verification.",
      'If you grant permission and your device provides location coordinates, we may include approximate, rounded coordinates in the successful sign-in notification sent to your registered email address. If you decline permission or your device cannot provide location information, the notification will indicate that the location is unavailable.',
      "Location sharing is optional and is not required to use your account. We do not use this feature to continuously track your location or monitor your movements in the background. We also do not send your device's coordinates to a third-party geolocation service through this feature.",
      'You may decline the location request without preventing sign-in verification from proceeding, subject to other applicable security requirements.',
    ],
  },
  {
    title: '5. Sharing of information',
    paragraphs: [
      'Majo Gadgets respects your privacy. We do not sell your personal information to third parties.',
      'We may share only the information necessary with trusted service providers that help us operate our platform, process payments, fulfil and deliver orders, send transactional and security notifications, maintain our systems, and provide technical support.',
      'These service providers are expected to protect your information and use it only for authorized purposes in accordance with applicable privacy and data protection requirements.',
      'We may also disclose information when required by law, in response to lawful requests from competent authorities, or when reasonably necessary to protect our users, prevent fraud, investigate security incidents, and safeguard the integrity of our platform.',
      'We take reasonable measures to protect personal information and limit its disclosure to what is necessary for the relevant purpose.',
    ],
  },
  {
    title: '6. Cookies and tracking',
    text:
      'We may use cookies, analytics tools, and similar technologies to understand site usage, remember your preferences, and improve the performance and user experience of our platform. You can manage cookie preferences in your browser settings.',
  },
  {
    title: '7. Data security',
    text:
      'We take reasonable steps to protect personal data using secure systems, access controls, and trusted processing practices. Two-factor authentication adds a verification step but does not guarantee that an account cannot be compromised. Never share sign-in codes, even with someone claiming to represent Majo Gadgets. If you do not recognize a sign-in alert, use the password-reset link on our website to change your password. Resetting your password removes remembered-device credentials, so those devices must complete verification again. No online service can guarantee absolute security.',
  },
  {
    title: '8. Retention of information',
    text:
      'We keep your personal information only for as long as necessary to fulfill the purposes described in this policy, comply with legal obligations, resolve disputes, and enforce our terms and policies.',
  },
  {
    title: '9. Your rights',
    text:
      'You may have the right to access, correct, update, or request deletion of your personal data depending on applicable laws. If you would like to exercise any of these rights, please contact us through the support channels available on our website.',
  },
  {
    title: '10. Third-party links',
    text:
      'Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those external websites, and we encourage you to review their policies before providing any personal information.',
  },
  {
    title: '11. Updates to this policy',
    text:
      'We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform improvements. Continued use of the platform after updates indicates your acceptance of the revised policy.',
  },
  {
    title: '12. Contact us',
    text:
      'If you have questions, concerns, or requests regarding this Privacy Policy, please contact us through WhatsApp at +256 779 122 222 or using the support channels available on the website.',
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
            <p className="mt-3 text-[12px] text-slate-300">Last updated: October 26, 2026</p>
          </section>

          <section className="mt-8 bg-white border border-[#E2E8F0] rounded-[28px] px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-8">
              {sections.map(section => (
                <div key={section.title} className="border-b border-[#E2E8F0] pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-[18px] md:text-[20px] font-extrabold text-[#071A2B] mb-3">{section.title}</h2>
                  {(section.paragraphs ?? (section.text ? [section.text] : [])).map((paragraph, index) => (
                    <p key={index} className="text-[15px] leading-8 text-[#475569] mb-3 last:mb-0">
                      {paragraph === 'Majo Gadgets respects your privacy. We do not sell your personal information to third parties.'
                        ? <>Majo Gadgets respects your privacy. <strong>We do not sell your personal information to third parties.</strong></>
                        : paragraph}
                    </p>
                  ))}
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
