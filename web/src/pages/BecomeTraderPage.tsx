import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, CheckCircle, ArrowLeft, Clock, XCircle } from 'lucide-react'
import { tradersApi, authApi, hasAccessToken } from '../lib/api'

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership',     label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'other',           label: 'Other' },
]

const STEPS = ['Personal Info', 'Business Info', 'What You Sell', 'Review & Submit']

const TRADER_TERMS = [
  {
    title: '1. Honest Registration',
    body: 'Provide accurate personal or business information and genuine verification documents when required. False information may result in account suspension.',
  },
  {
    title: '2. Customer Privacy',
    body: 'Traders must never directly contact customers or access their names, phone numbers, email addresses, or other personal details. All customer communication, orders, complaints, and returns are handled by Majo Gadgets.',
  },
  {
    title: '3. Product Quality',
    body: 'Sell only genuine, lawful products. Product descriptions, images, prices, specifications, stock levels, and warranties must be accurate. Counterfeit, defective, misleading, or prohibited products are not allowed.',
  },
  {
    title: '4. Order Fulfilment',
    body: 'Fulfil orders promptly and supply exactly what the customer ordered. Do not falsely mark orders as completed, substitute products without authorization, or conceal stock shortages.',
  },
  {
    title: '5. Trust and Transparency',
    body: 'Do not manipulate prices, fake reviews, create fraudulent orders, falsify records, or mislead customers or Majo Gadgets. Cooperate honestly with investigations and quality checks.',
  },
  {
    title: '6. Returns Policy',
    body: 'Majo Gadgets manages all returns and refunds. More than three returns of the same product from the same trader will trigger automatic temporary disabling of the trader account pending investigation. Fraud or serious misconduct may result in immediate suspension.',
  },
  {
    title: '7. Payments and Fees',
    body: 'Trader commissions, applicable fees, payout schedules, and deductions will be communicated separately. Traders must provide accurate payment details and comply with applicable tax obligations.',
  },
  {
    title: '8. Account Security',
    body: 'Keep your login credentials secure. Do not access unauthorized information, manipulate the platform, or create accounts to bypass a suspension.',
  },
  {
    title: '9. Violations and Suspension',
    body: 'Majo Gadgets may remove products, restrict accounts, suspend traders, or terminate accounts for fraud, repeated violations, poor product quality, or breaches of these terms. Appeals may be considered where appropriate.',
  },
  {
    title: '10. Agreement',
    body: 'By accepting these terms, you confirm that your information is accurate, you will follow Majo Gadgets policies, protect customer privacy, and conduct business honestly.',
  },
]

const TRADER_TERMS_INTRO = 'By registering as a trader, you agree to the following rules:'
const TRADER_TERMS_CLOSING = 'Majo Gadgets reserves the right to update these terms with appropriate notice. All traders must comply with applicable laws and the platform\'s policies.'
const TRADER_TERMS_SECTION_COUNT = TRADER_TERMS.length + 2
const EVIDENCE_ACCEPT = '.jpg,.jpeg,.png,.pdf'
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024

type EvidenceKey = 'national_id_document' | 'ura_certificate_document' | 'business_location_proof'

function EvidenceField({ label, help, file, required = true, onChange, onError }: {
  label: string
  help: string
  file: File | null
  required?: boolean
  onChange: (file: File | null) => void
  onError: (message: string) => void
}) {
  return (
    <label className="block rounded-lg border border-[#DCE5EB] bg-[#F8FAFC] p-4">
      <span className="block text-[12px] font-bold text-[#071A2B]">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <span className="mt-1 block text-[11px] leading-5 text-[#64748B]">{help} JPG, PNG, or PDF, up to 10 MB.</span>
      <input
        type="file"
        accept={EVIDENCE_ACCEPT}
        required={required && !file}
        onChange={event => {
          const selected = event.target.files?.[0] ?? null
          if (!selected) return
          const extension = selected.name.split('.').pop()?.toLowerCase()
          if (!['jpg', 'jpeg', 'png', 'pdf'].includes(extension ?? '')) {
            onError(`${label} must be a JPG, PNG, or PDF.`)
            event.target.value = ''
            return
          }
          if (selected.size > MAX_EVIDENCE_SIZE) {
            onError(`${label} must be 10 MB or smaller.`)
            event.target.value = ''
            return
          }
          onError('')
          onChange(selected)
        }}
        className="mt-3 block w-full text-[12px] text-[#475569] file:mr-3 file:rounded-lg file:border-0 file:bg-[#071A2B] file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-white"
      />
      {file && <span className="mt-2 block truncate text-[11px] font-semibold text-[#166534]">Selected: {file.name}</span>}
    </label>
  )
}

export default function BecomeTraderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [traderStatus, setTraderStatus] = useState<'pending' | 'rejected' | null>(null)
  const [termsReadToEnd, setTermsReadToEnd] = useState(false)
  const [termsReadCount, setTermsReadCount] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const termsScrollRef = useRef<HTMLDivElement>(null)
  const readTermsSections = useRef(new Set<number>())
  const [evidence, setEvidence] = useState<Record<EvidenceKey, File | null>>({
    national_id_document: null,
    ura_certificate_document: null,
    business_location_proof: null,
  })

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', national_id: '',
    business_name: '', business_type: 'sole_proprietor', business_reg_no: '',
    tin: '', location: '', district: '', website: '',
    product_categories: '', monthly_volume: '', experience: '',
    agreed_to_terms: false,
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!hasAccessToken()) {
      navigate(`/login?next=/become-a-trader`, { replace: true })
      return
    }

    let active = true
    Promise.all([tradersApi.me(), authApi.profile()])
      .then(([meRes, profileRes]) => {
        if (!active) return
        const me = meRes.data
        const profile = profileRes.data
        // Pre-fill name, email, phone from user profile
        setForm(f => ({
          ...f,
          full_name: f.full_name || profile.name || '',
          email: f.email || profile.email || '',
          phone: f.phone || profile.phone || '',
        }))
        if (me) {
          if (me.status === 'approved') {
            navigate(`/trader/${me.uuid}`, { replace: true })
          } else {
            setTraderStatus(me.status as 'pending' | 'rejected')
          }
        }
      })
      .catch(() => {
        if (!active) return
        // profile fetch failed — still allow form
        authApi.profile().then(r => {
          if (!active) return
          setForm(f => ({
            ...f,
            full_name: f.full_name || r.data.name || '',
            email: f.email || r.data.email || '',
            phone: f.phone || (r.data as any).phone || '',
          }))
        }).catch(() => {})
      })
      .finally(() => { if (active) setChecking(false) })

    return () => { active = false }
  }, [navigate])

  useEffect(() => {
    if (checking || traderStatus || form.agreed_to_terms) return
    const container = termsScrollRef.current
    if (!container) return

    const pendingTimers = new Map<number, number>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const sectionIndex = Number((entry.target as HTMLElement).dataset.termsSection)
        if (readTermsSections.current.has(sectionIndex)) return

        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          if (!pendingTimers.has(sectionIndex)) {
            const timer = window.setTimeout(() => {
              readTermsSections.current.add(sectionIndex)
              pendingTimers.delete(sectionIndex)
              setTermsReadCount(readTermsSections.current.size)
              const atEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 8
              if (atEnd && readTermsSections.current.size === TRADER_TERMS_SECTION_COUNT) setTermsReadToEnd(true)
            }, 1200)
            pendingTimers.set(sectionIndex, timer)
          }
        } else {
          const timer = pendingTimers.get(sectionIndex)
          if (timer !== undefined) {
            window.clearTimeout(timer)
            pendingTimers.delete(sectionIndex)
          }
        }
      })
    }, { root: container, threshold: [0.55] })

    container.querySelectorAll<HTMLElement>('[data-terms-section]').forEach(section => observer.observe(section))
    return () => {
      observer.disconnect()
      pendingTimers.forEach(timer => window.clearTimeout(timer))
    }
  }, [checking, traderStatus, form.agreed_to_terms])

  const handleSubmit = async () => {
    if (!form.agreed_to_terms) { setError('You must agree to the terms.'); return }
    if (!evidence.national_id_document || !evidence.business_location_proof) {
      setError('Upload a copy of your National ID and proof of your business location.'); return
    }
    if (!form.tin.trim() && !evidence.ura_certificate_document) {
      setError('Enter your URA TIN or upload a URA certificate.'); return
    }
    setSubmitting(true); setError('')
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)))
      Object.entries(evidence).forEach(([key, file]) => {
        if (file) payload.append(key, file)
      })
      await tradersApi.apply(payload)
      setSubmitted(true)
    } catch (e: any) {
      const data = e?.response?.data
      if (data?.email) setError('An application with this email already exists.')
      else if (data && typeof data === 'object') setError(Object.values(data).flat().join(' '))
      else setError('Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  const handleContinue = () => {
    if (step === 0 && (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.national_id.trim())) {
      setError('All fields including National ID / Passport are required.'); return
    }
    if (step === 0) {
      const normalizedId = form.national_id.replace(/[\s-]/g, '')
      if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{8,20}$/i.test(normalizedId)) {
        setError('Enter the National ID exactly as printed on your ID document. It must contain letters and numbers.'); return
      }
      if (!evidence.national_id_document) {
        setError('Upload a clear copy of your National ID before continuing.'); return
      }
    }
    if (step === 1 && (!form.business_name.trim() || !form.location.trim())) {
      setError('Business Name and Location are required.'); return
    }
    if (step === 1 && !form.tin.trim() && !evidence.ura_certificate_document) {
      setError('Enter your URA TIN or upload a URA certificate.'); return
    }
    if (step === 1 && !evidence.business_location_proof) {
      setError('Upload proof that your business operates from a physical location.'); return
    }
    if (step === 2 && !form.product_categories.trim()) {
      setError('Please describe the products / categories you want to sell.'); return
    }
    setError('')
    setStep(s => s + 1)
  }

  const handleTermsScroll = () => {
    const element = termsScrollRef.current
    if (element && readTermsSections.current.size === TRADER_TERMS_SECTION_COUNT && element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
      setTermsReadToEnd(true)
    }
  }

  const continueToApplication = () => {
    if (!termsReadToEnd || !termsAccepted) return
    setForm(current => ({ ...current, agreed_to_terms: true }))
    setError('')
  }

  if (checking) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] font-bold text-[#64748B]">Checking trader access...</p>
      </div>
    </div>
  )

  if (traderStatus === 'pending') return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-[#E2E8F0]">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Clock size={32} color="#F59E0B" />
        </div>
        <h2 className="text-[20px] font-extrabold text-[#071A2B] mb-2">Application Under Review</h2>
        <p className="text-[14px] text-[#64748B] mb-6 leading-relaxed">
          Your trader application is currently being reviewed by our team. We'll notify you once a decision is made — usually within 2–3 business days.
        </p>
        <button onClick={() => navigate('/')} className="w-full py-3 rounded-none bg-[#071A2B] text-white text-[14px] font-bold hover:opacity-80">
          Back to Store
        </button>
      </div>
    </div>
  )

  if (traderStatus === 'rejected') return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-[#E2E8F0]">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} color="#EF4444" />
        </div>
        <h2 className="text-[20px] font-extrabold text-[#071A2B] mb-2">Application Not Approved</h2>
        <p className="text-[14px] text-[#64748B] mb-6 leading-relaxed">
          Unfortunately your trader application was not approved at this time. Please contact support for more information.
        </p>
        <button onClick={() => navigate('/')} className="w-full py-3 rounded-none bg-[#071A2B] text-white text-[14px] font-bold hover:opacity-80">
          Back to Store
        </button>
      </div>
    </div>
  )

  if (!form.agreed_to_terms) return (
    <div className="flex h-screen min-h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC]">
      <header className="shrink-0 bg-[#071A2B] px-5 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button onClick={() => navigate('/')} aria-label="Back to store" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft size={19} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#FDBA74]">
              <Store size={15} /> Trader application
            </div>
            <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">Majo Gadgets Trader Terms &amp; Conditions</h1>
          </div>
        </div>
      </header>

      <main ref={termsScrollRef} onScroll={handleTermsScroll} tabIndex={0} aria-label="Trader rules and terms, scroll to read all sections" className="min-h-0 flex-1 overflow-y-auto px-5 py-6 outline-none sm:px-8 sm:py-8">
        <article className="mx-auto max-w-5xl space-y-6 pb-4">
          <p data-terms-section="0" className="text-[14px] leading-7 text-[#334155]">{TRADER_TERMS_INTRO}</p>
          {TRADER_TERMS.map((section, index) => (
            <section key={section.title} data-terms-section={index + 1} className="border-b border-[#E2E8F0] pb-5 last:border-0">
              <h2 className="text-[15px] font-extrabold text-[#071A2B]">{section.title}</h2>
              <p className="mt-2 text-[14px] leading-7 text-[#475569]">{section.title === '6. Returns Policy' ? <>{section.body.split('More than three returns')[0]}<strong>More than three returns of the same product from the same trader will trigger automatic temporary disabling of the trader account pending investigation.</strong>{' '}Fraud or serious misconduct may result in immediate suspension.</> : section.body}</p>
            </section>
          ))}
          <p data-terms-section={TRADER_TERMS_SECTION_COUNT - 1} className="pb-2 text-[14px] leading-7 text-[#334155]"><strong>{TRADER_TERMS_CLOSING}</strong></p>
        </article>
      </main>

      <footer className="z-10 shrink-0 border-t border-[#DCE5EB] bg-white px-5 py-4 shadow-[0_-8px_24px_rgba(7,26,43,0.06)] sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {!termsReadToEnd && <p className="mb-2 text-[12px] font-semibold text-[#9A3412]">Read each section, then reach the end to continue ({termsReadCount}/{TRADER_TERMS_SECTION_COUNT}).</p>}
            <label className={`flex items-start gap-3 text-[13px] leading-6 ${termsReadToEnd ? 'cursor-pointer text-[#334155]' : 'cursor-not-allowed text-[#94A3B8]'}`}>
              <input type="checkbox" checked={termsAccepted} disabled={!termsReadToEnd} onChange={event => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#071A2B]" />
              <span>I have read and agree to the trader rules and terms above.</span>
            </label>
          </div>
          <button type="button" onClick={continueToApplication} disabled={!termsReadToEnd || !termsAccepted} className="w-full rounded-xl bg-[#071A2B] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
            Continue to application
          </button>
        </div>
      </footer>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-[#E2E8F0]">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} color="#22C55E" />
        </div>
        <h2 className="text-[20px] font-extrabold text-[#071A2B] mb-2">Application Submitted!</h2>
        <p className="text-[14px] text-[#64748B] mb-6 leading-relaxed">
          Thank you, <strong>{form.full_name}</strong>! We've received your trader application for <strong>{form.business_name}</strong>. Our team will review it and get back to you within 2–3 business days.
        </p>
        <button onClick={() => navigate('/')} className="w-full py-3 rounded-none bg-[#071A2B] text-white text-[14px] font-bold hover:opacity-80">
          Back to Store
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#071A2B] px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div className="flex items-center gap-2">
            <Store size={20} color="#22C55E" />
            <h1 className="text-[18px] font-extrabold text-white">Become a Trader</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {step === 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6">
            <p className="text-[13px] font-extrabold text-[#071A2B] mb-1">Sell on Majo Gadgets</p>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Join our platform as a verified trader. Fill in the form below and our team will review your application. Once approved, you'll be able to list and sell products on Majo Gadgets.
            </p>
            <p className="mt-3 text-[12px] text-[#64748B]">
              Sales and partnership questions? <a className="font-bold text-[#1E3A8A] hover:underline" href="mailto:sales@majogadgets.com">Email our sales team</a>.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${i <= step ? 'bg-[#071A2B] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] font-bold hidden sm:block ${i === step ? 'text-[#071A2B]' : 'text-[#94A3B8]'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-[#071A2B]' : 'bg-[#E2E8F0]'}`} />}
            </div>
          ))}
        </div>

        {error && <p className="text-[12px] text-red-500 mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">Personal Information</p>
              {[
                { k: 'full_name', label: 'Full Name', type: 'text', required: true },
                { k: 'email', label: 'Email Address', type: 'email', required: true },
                { k: 'phone', label: 'Phone Number', type: 'tel', required: true },
                { k: 'national_id', label: 'National ID Number', type: 'text', required: true },
              ].map(({ k, label, type, required }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type={type} value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
              <EvidenceField
                label="Copy of National ID"
                help="Upload a clear photo or PDF. Admin will compare it with the ID number you entered."
                file={evidence.national_id_document}
                onChange={file => setEvidence(current => ({ ...current, national_id_document: file }))}
                onError={setError}
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">Business Information</p>
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Business Name <span className="text-red-500">*</span></label>
                <input value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Business Type <span className="text-red-500">*</span></label>
                <select value={form.business_type} onChange={e => set('business_type', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]">
                  {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {[
                { k: 'business_reg_no', label: 'Business Registration No. (optional)' },
                { k: 'tin', label: 'URA TIN (or upload certificate below)' },
                { k: 'location', label: 'Business Location / Address', required: true },
                { k: 'district', label: 'District' },
                { k: 'website', label: 'Website (optional)' },
              ].map(({ k, label, required }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
              <EvidenceField
                label="URA Certificate (optional if TIN entered)"
                help="Upload the certificate if you are not entering a URA TIN."
                file={evidence.ura_certificate_document}
                required={false}
                onChange={file => setEvidence(current => ({ ...current, ura_certificate_document: file }))}
                onError={setError}
              />
              <EvidenceField
                label="Proof of Physical Business Location"
                help="Upload a photo or document showing your shop or business premises."
                file={evidence.business_location_proof}
                onChange={file => setEvidence(current => ({ ...current, business_location_proof: file }))}
                onError={setError}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">What You Want to Sell</p>
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Product Categories / Products <span className="text-red-500">*</span></label>
                <textarea value={form.product_categories} onChange={e => set('product_categories', e.target.value)} rows={3}
                  placeholder="e.g. Smartphones, Earphones, Chargers, Smart Watches..."
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B] resize-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Expected Monthly Sales Volume</label>
                <input value={form.monthly_volume} onChange={e => set('monthly_volume', e.target.value)}
                  placeholder="e.g. 50–100 units / UGX 5,000,000"
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Trading / Business Experience</label>
                <textarea value={form.experience} onChange={e => set('experience', e.target.value)} rows={3}
                  placeholder="Briefly describe your experience selling gadgets or running a business..."
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B] resize-none" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">Review Your Application</p>
              {[
                ['Full Name', form.full_name], ['Email', form.email], ['Phone', form.phone],
                ['National ID', form.national_id], ['Business Name', form.business_name],
                ['Business Type', form.business_type.replace('_', ' ')],
                ['National ID Copy', evidence.national_id_document?.name ?? 'Missing'],
                ['Location', form.location], ['District', form.district || '—'],
                ['URA Evidence', evidence.ura_certificate_document?.name ?? (form.tin.trim() ? `TIN: ${form.tin}` : 'Missing')],
                ['Business Location Proof', evidence.business_location_proof?.name ?? 'Missing'],
                ['Products', form.product_categories], ['Monthly Volume', form.monthly_volume || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide shrink-0">{label}</span>
                  <span className="text-[12px] text-[#071A2B] font-semibold text-right capitalize">{value}</span>
                </div>
              ))}
              <label className="flex items-start gap-3 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.agreed_to_terms} onChange={e => set('agreed_to_terms', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#071A2B]" />
                <span className="text-[12px] text-[#64748B] leading-relaxed">
                  I confirm that the information provided is accurate and I agree to Majo Gadgets' trader terms and conditions.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => { setError(''); setStep(s => s - 1) }} className="flex-1 py-3 rounded-none border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:bg-[#F8FAFC]">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={handleContinue} className="flex-1 py-3 rounded-none bg-[#071A2B] text-white text-[13px] font-bold hover:opacity-80">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-none bg-[#22C55E] text-white text-[13px] font-bold hover:opacity-80 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
