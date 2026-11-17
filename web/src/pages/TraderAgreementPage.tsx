import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileCheck2, PenLine } from 'lucide-react'
import { tradersApi, type ApiTraderAgreement } from '../lib/api'

const importantContractTerms = [
  'Business Registration Certificate',
  'Mobile Money Account',
  'Marketplace Policies',
  'Bank Account',
  'UGX 5,000',
  'three (3) days',
  'seven (7) days',
  '24-hour period',
  '24 hours',
  'must not',
  'shall not',
  'non-returnable',
  'shall',
  'must',
]
const importantContractTermSet = new Set(importantContractTerms.map(term => term.toLowerCase()))
const traderDetailLabels = [
  'Trader/Business Name:',
  'Trader ID:',
  'Physical Address:',
  'Telephone:',
  'Email:',
  'Business Registration No.:',
  'URA TIN:',
]
const importantContractTermPattern = new RegExp(
  `(${importantContractTerms
    .sort((left, right) => right.length - left.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'gi',
)

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'long', timeStyle: 'short' }) : 'Pending final signature'
}

function renderContractParagraph(text: string) {
  const parts = text.split(importantContractTermPattern)
  const content = parts.map((part, index) =>
    importantContractTermSet.has(part.toLowerCase())
      ? <strong key={index} className="text-black">{part}</strong>
      : part,
  )

  const isTraderDetail = traderDetailLabels.some(label => text.startsWith(label))
  return isTraderDetail || /^\d+\.\d+\s/.test(text)
    ? <strong className="text-black">{content}</strong>
    : content
}

export default function TraderAgreementPage() {
  const { traderUuid = '' } = useParams<{ traderUuid: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isContractPreview = location.pathname.startsWith('/contract/')
  const [agreement, setAgreement] = useState<ApiTraderAgreement | null>(null)
  const [signedName, setSignedName] = useState('')
  const [signatureImage, setSignatureImage] = useState<File | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const request = isContractPreview
      ? tradersApi.contractPreview(traderUuid)
      : tradersApi.agreement(traderUuid)
    request
      .then(({ data }) => {
        if (!active) return
        setAgreement(data)
        setSignedName(data.trader.name)
      })
      .catch(() => {
        if (!active) return
        if (!localStorage.getItem('access_token')) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
          return
        }
        setError(isContractPreview
          ? 'This contract preview is unavailable for your account.'
          : 'This agreement is unavailable for your account.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [traderUuid, isContractPreview, location.pathname, navigate])

  const sign = async () => {
    if (!agreement || !accepted || !signedName.trim()) return
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('accepted', 'true')
      form.append('signed_name', signedName.trim())
      if (signatureImage) form.append('signature_image', signatureImage)
      const { data } = await tradersApi.signAgreement(traderUuid, form)
      setAgreement(data)
    } catch (cause: any) {
      const details = cause?.response?.data
      setError(details?.detail ?? details?.signed_name?.[0] ?? 'Could not sign the agreement. Please check your name and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="min-h-screen bg-[#F5F7F7] p-8 text-center text-sm text-slate-600">{isContractPreview ? 'Loading your contract preview...' : 'Loading your agreement...'}</main>
  if (!agreement) return <main className="min-h-screen bg-[#F5F7F7] p-8 text-center"><p className="text-sm text-red-700">{error || (isContractPreview ? 'This contract preview is unavailable for your account.' : 'This agreement is unavailable for your account.')}</p><button onClick={() => navigate('/notifications')} className="mt-4 text-sm font-bold text-slate-800">Back to notifications</button></main>

  const isPreview = Boolean(agreement.is_preview)
  const signed = !isPreview && Boolean(agreement.effective_at)

  return (
    <main className="min-h-screen bg-[#F5F7F7] px-4 py-8 sm:px-8 print:bg-white print:p-0">
      <style>{'@media print { .no-print { display: none !important } .agreement-paper { border: 0 !important; box-shadow: none !important; max-width: none !important; padding: 0 !important } }'}</style>
      <div className="no-print mx-auto mb-5 flex max-w-4xl items-center justify-between gap-4">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center border border-[#DCE5EB] bg-white"><ArrowLeft size={18} /></button>
        {(signed || isPreview) && <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#071A2B] px-4 py-2.5 text-sm font-bold text-white"><Download size={16} />Download / Print</button>}
      </div>

      <article className="agreement-paper mx-auto max-w-4xl border border-[#DCE5EB] bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12">
        <header className="border-b border-[#DCE5EB] pb-6">
          <img src="/new%20Header.png" alt="Majo Market company letterhead" className="mb-6 block h-auto w-full object-contain" />
          <div>
            <h1 className="text-2xl font-black text-[#071A2B]">{agreement.title}</h1>
            <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="inline font-bold">Contract Reference: </dt><dd className="inline">{agreement.reference}</dd></div>
              <div><dt className="inline font-bold">Version: </dt><dd className="inline">{agreement.version}</dd></div>
              <div><dt className="inline font-bold">Effective Date: </dt><dd className="inline">{dateLabel(agreement.effective_at)}</dd></div>
            </dl>
          </div>
        </header>
        {isPreview && <p className="border-b border-[#DCE5EB] bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">CONTRACT PREVIEW — NOT A SIGNED CONTRACT</p>}

        {agreement.sections.map((section, index) => (
          <section key={section.title} className={`border-b border-[#DCE5EB] py-6 ${index === agreement.sections.length - 1 ? 'border-b-0' : ''}`}>
            <h2 className="text-base font-extrabold text-[#071A2B]">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#334155]">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${paragraphIndex}-${paragraph}`}>{renderContractParagraph(paragraph)}</p>
              ))}
            </div>
            {index === agreement.sections.length - 1 && (
              <>
                <div className="mt-6 grid gap-6 border-t border-[#DCE5EB] pt-5 sm:grid-cols-2">
                  <div>
                    <h3 className="font-bold">FOR MAJO MARKET</h3>
                    <p className="mt-2 text-sm">Authorised Representative: {agreement.platform.signatory}</p>
                    <p className="text-sm">Title: {agreement.platform.title}</p>
                    <p className="text-sm">Signature: {agreement.platform.signed_at ? 'Authorised' : 'Pending'}</p>
                    <p className="text-sm">Date: {dateLabel(agreement.platform.signed_at)}</p>
                  </div>
                  <div>
                    <h3 className="font-bold">FOR THE TRADER</h3>
                    <p className="mt-2 text-sm">Full Legal Name: {agreement.trader.signed_name || agreement.trader.name}</p>
                    <p className="text-sm">Business/Trading Name: {agreement.trader.business_name}</p>
                    <p className="text-sm">Trader ID: {agreement.trader.id}</p>
                    <p className="text-sm">Signature: {signed ? 'Electronic acceptance recorded' : 'Pending electronic acceptance'}</p>
                    <p className="text-sm">Date: {dateLabel(agreement.trader.signed_at)}</p>
                    {agreement.trader.has_signature_image && <p className="text-sm">Signature image retained with the execution record.</p>}
                  </div>
                </div>
                <div className="mt-6 border-t border-[#DCE5EB] pt-5">
                  <h3 className="font-bold">CONTRACT EXECUTION RECORD</h3>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="inline font-bold">Contract Reference: </dt><dd className="inline">{agreement.reference}</dd></div>
                    <div><dt className="inline font-bold">Version: </dt><dd className="inline">{agreement.version}</dd></div>
                    <div><dt className="inline font-bold">Effective Date: </dt><dd className="inline">{dateLabel(agreement.effective_at)}</dd></div>
                    <div><dt className="inline font-bold">Execution Method: </dt><dd className="inline">{isPreview ? 'Electronic / Physical' : 'Electronic'}</dd></div>
                    <div><dt className="inline font-bold">Acceptance Date: </dt><dd className="inline">{dateLabel(agreement.trader.signed_at)}</dd></div>
                    <div><dt className="inline font-bold">Acceptance Record: </dt><dd className="inline">{isPreview ? 'System Reference (preview)' : signed ? agreement.reference : 'Pending electronic acceptance'}</dd></div>
                  </dl>
                </div>
              </>
            )}
          </section>
        ))}
      </article>

      {!signed && !isPreview && (
        <section className="no-print mx-auto mt-5 max-w-4xl border border-[#DCE5EB] bg-white p-6">
          <div className="flex items-center gap-2"><PenLine size={18} /><h2 className="text-base font-extrabold">Sign this contract</h2></div>
          {!agreement.ready_to_sign && <p className="mt-3 text-sm text-red-700">Majo Market registered address must be configured before electronic execution.</p>}
          <label className="mt-4 block text-sm font-bold">Your verified legal name
            <input value={signedName} onChange={event => setSignedName(event.target.value)} className="mt-1 block w-full border border-[#CBD5E1] px-3 py-2.5 font-normal" autoComplete="name" />
          </label>
          <label className="mt-4 block text-sm font-bold">Signature image (optional)
            <input type="file" accept="image/png,image/jpeg" onChange={event => setSignatureImage(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm font-normal" />
          </label>
          {signatureImage && <p className="mt-2 text-xs text-slate-600">Selected: {signatureImage.name}</p>}
          <label className="mt-4 flex items-start gap-3 text-sm leading-5 text-[#334155]"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1" /><span>I have read this contract and agree to sign it electronically.</span></label>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <button onClick={sign} disabled={!agreement.ready_to_sign || !accepted || !signedName.trim() || saving} className="mt-5 inline-flex items-center gap-2 bg-[#071A2B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><FileCheck2 size={17} />{saving ? 'Signing...' : 'Sign and activate account'}</button>
        </section>
      )}
    </main>
  )
}
