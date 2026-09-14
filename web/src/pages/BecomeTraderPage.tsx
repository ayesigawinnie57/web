import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, CheckCircle, ArrowLeft } from 'lucide-react'
import { tradersApi } from '../lib/api'

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership',     label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'other',           label: 'Other' },
]

const STEPS = ['Personal Info', 'Business Info', 'What You Sell', 'Review & Submit']

export default function BecomeTraderPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', national_id: '',
    business_name: '', business_type: 'sole_proprietor', business_reg_no: '',
    tin: '', location: '', district: '', website: '',
    product_categories: '', monthly_volume: '', experience: '',
    agreed_to_terms: false,
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.agreed_to_terms) { setError('You must agree to the terms.'); return }
    setSubmitting(true); setError('')
    try {
      await tradersApi.apply(form)
      setSubmitted(true)
    } catch (e: any) {
      const data = e?.response?.data
      if (data?.email) setError('An application with this email already exists.')
      else if (data && typeof data === 'object') setError(Object.values(data).flat().join(' '))
      else setError('Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  const handleContinue = () => {
    if (step === 0) {
      if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.national_id.trim()) {
        setError('All fields including National ID / Passport are required.')
        return
      }
    }
    if (step === 1) {
      if (!form.business_name.trim() || !form.location.trim()) {
        setError('Business Name and Location are required.')
        return
      }
    }
    if (step === 2) {
      if (!form.product_categories.trim()) {
        setError('Please describe the products / categories you want to sell.')
        return
      }
    }
    setError('')
    setStep(s => s + 1)
  }

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
      {/* Header */}
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
        {/* Intro */}
        {step === 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6">
            <p className="text-[13px] font-extrabold text-[#071A2B] mb-1">Sell on Majo Gadgets</p>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Join our platform as a verified trader. Fill in the form below and our team will review your application. Once approved, you'll be able to list and sell products on Majo Gadgets.
            </p>
          </div>
        )}

        {/* Step indicator */}
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

          {/* Step 0 — Personal Info */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">Personal Information</p>
              {[
                { k: 'full_name', label: 'Full Name', type: 'text', required: true },
                { k: 'email', label: 'Email Address', type: 'email', required: true },
                { k: 'phone', label: 'Phone Number', type: 'tel', required: true },
                { k: 'national_id', label: 'National ID / Passport', type: 'text', required: true },
              ].map(({ k, label, type, required }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type={type} value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-none text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
            </div>
          )}

          {/* Step 1 — Business Info */}
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
                { k: 'tin', label: 'TIN (optional)' },
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
            </div>
          )}

          {/* Step 2 — What You Sell */}
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

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] font-extrabold text-[#071A2B]">Review Your Application</p>
              {[
                ['Full Name', form.full_name], ['Email', form.email], ['Phone', form.phone],
                ['National ID', form.national_id], ['Business Name', form.business_name],
                ['Business Type', form.business_type.replace('_', ' ')],
                ['Location', form.location], ['District', form.district || '—'],
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

        {/* Navigation */}
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
