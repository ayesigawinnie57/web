import { useEffect, useState } from 'react'
import { Store, CheckCircle, XCircle, Clock, RefreshCw, ChevronRight, X } from 'lucide-react'
import { tradersApi, type ApiTraderApplication } from '../../lib/api'

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
type Filter = typeof FILTERS[number]

const STATUS_COLOR: Record<string, { color: string; bg: string; icon: any }> = {
  pending:  { color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  approved: { color: '#10b981', bg: '#f0fdf4', icon: CheckCircle },
  rejected: { color: '#ef4444', bg: '#fef2f2', icon: XCircle },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminTraders() {
  const [all, setAll] = useState<ApiTraderApplication[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<ApiTraderApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectModal, setRejectModal] = useState(false)
  const [error, setError] = useState('')
  const [documentsVerified, setDocumentsVerified] = useState(false)
  const [openingDocument, setOpeningDocument] = useState<string | null>(null)
  const [viewedDocuments, setViewedDocuments] = useState<Set<string>>(new Set())
  const [documentPreview, setDocumentPreview] = useState<{ type: string; url: string; contentType: string } | null>(null)

  useEffect(() => () => {
    if (documentPreview) URL.revokeObjectURL(documentPreview.url)
  }, [documentPreview])

  const load = () => {
    setLoading(true)
    tradersApi.adminList()
      .then(r => setAll(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? all : all.filter(a => a.status === filter)

  const counts = {
    all: all.length,
    pending: all.filter(a => a.status === 'pending').length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
  }

  const handleApprove = async () => {
    if (!selected) return
    if (!selected.has_national_id_document || !selected.has_business_location_proof || (!selected.has_ura_certificate_document && !selected.tin) || !documentsVerified) {
      setError('Review the required documents and confirm the ID matches before approval.')
      return
    }
    setActing(true)
    try {
      const r = await tradersApi.approve(selected.id)
      setAll(p => p.map(a => a.id === selected.id ? r.data : a))
      setSelected(r.data)
    } catch { setError('Failed to approve.') }
    finally { setActing(false) }
  }

  const previewDocument = async (documentType: 'national-id' | 'ura-certificate' | 'business-location') => {
    if (!selected) return
    setOpeningDocument(documentType)
    setError('')
    try {
      const { data } = await tradersApi.adminDocument(selected.id, documentType)
      const documentUrl = URL.createObjectURL(data)
      setDocumentPreview({ type: documentType, url: documentUrl, contentType: data.type })
      setViewedDocuments(current => new Set(current).add(documentType))
    } catch {
      setError('Could not open this document. Refresh the application and try again.')
    } finally {
      setOpeningDocument(null)
    }
  }

  const handleReject = async () => {
    if (!selected || !rejectNote.trim()) return
    setActing(true)
    try {
      const r = await tradersApi.reject(selected.id, rejectNote.trim())
      setAll(p => p.map(a => a.id === selected.id ? r.data : a))
      setSelected(r.data)
      setRejectModal(false)
      setRejectNote('')
    } catch { setError('Failed to reject.') }
    finally { setActing(false) }
  }

  // Detail view
  if (selected) {
    const cfg = STATUS_COLOR[selected.status]
    const requiredDocuments = [
      ...(selected.has_national_id_document ? ['national-id'] : []),
      ...(selected.has_ura_certificate_document ? ['ura-certificate'] : []),
      ...(selected.has_business_location_proof ? ['business-location'] : []),
    ]
    const documentsComplete = selected.has_national_id_document
      && selected.has_business_location_proof
      && (selected.has_ura_certificate_document || !!selected.tin.trim())
    const allDocumentsViewed = requiredDocuments.every(documentType => viewedDocuments.has(documentType))
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
          <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC]">
            <ChevronRight size={18} color="#071A2B" className="rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-extrabold text-[#071A2B]">{selected.business_name}</h1>
            <p className="text-[11px] text-[#64748B]">{selected.full_name} · {selected.email}</p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full capitalize" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
            {selected.status}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="text-[12px] text-red-500 mb-4">{error}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Personal */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
              <p className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wide mb-3">Personal Info</p>
              {[['Name', selected.full_name], ['Email', selected.email], ['Phone', selected.phone], ['National ID', selected.national_id || '—']].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-[11px] text-[#94A3B8] font-semibold">{l}</span>
                  <span className="text-[12px] text-[#071A2B] font-bold">{v}</span>
                </div>
              ))}
            </div>

            {/* Business */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
              <p className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wide mb-3">Business Info</p>
              {[['Business', selected.business_name], ['Type', selected.business_type.replace('_', ' ')], ['Reg No.', selected.business_reg_no || '—'], ['TIN', selected.tin || '—'], ['Location', selected.location], ['District', selected.district || '—'], ['Website', selected.website || '—']].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-[11px] text-[#94A3B8] font-semibold">{l}</span>
                  <span className="text-[12px] text-[#071A2B] font-bold capitalize text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <section className="mb-4 rounded-xl border border-[#DCE5EB] bg-white p-5">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-[#071A2B]">Verification documents</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Open and inspect the original files. The ID image is private and is not included in the trader agreement.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { type: 'national-id' as const, label: 'National ID copy', available: selected.has_national_id_document },
                { type: 'ura-certificate' as const, label: 'URA certificate', available: selected.has_ura_certificate_document },
                { type: 'business-location' as const, label: 'Business location proof', available: selected.has_business_location_proof },
              ].map(document => (
                <button key={document.type} type="button" disabled={!document.available || openingDocument !== null} onClick={() => previewDocument(document.type)} className="rounded-lg border border-[#DCE5EB] px-3 py-3 text-left text-[12px] font-bold text-[#1E3A8A] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-[#94A3B8]">
                  {openingDocument === document.type ? 'Opening…' : document.available ? `View ${document.label}` : `${document.label} not provided`}
                </button>
              ))}
            </div>
            {!selected.has_ura_certificate_document && selected.tin && <p className="mt-2 text-[12px] text-[#475569]">URA TIN provided: <strong>{selected.tin}</strong></p>}
            <label className="mt-4 flex items-start gap-3 border-t border-[#E2E8F0] pt-4 text-[12px] leading-5 text-[#334155]">
              <input type="checkbox" checked={documentsVerified} onChange={event => setDocumentsVerified(event.target.checked)} disabled={!allDocumentsViewed || selected.status === 'approved'} className="mt-0.5 h-4 w-4 accent-[#071A2B]" />
              <span>{allDocumentsViewed ? 'I reviewed every submitted document, confirmed the ID matches the submitted details, and verified the business information.' : 'Open every submitted document above before confirming verification.'}</span>
            </label>
          </section>

          {/* What they sell */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-4">
            <p className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wide mb-3">What They Want to Sell</p>
            <p className="text-[12px] font-bold text-[#071A2B] mb-1">Products / Categories</p>
            <p className="text-[13px] text-[#475569] mb-3">{selected.product_categories}</p>
            {selected.monthly_volume && <>
              <p className="text-[12px] font-bold text-[#071A2B] mb-1">Expected Monthly Volume</p>
              <p className="text-[13px] text-[#475569] mb-3">{selected.monthly_volume}</p>
            </>}
            {selected.experience && <>
              <p className="text-[12px] font-bold text-[#071A2B] mb-1">Experience</p>
              <p className="text-[13px] text-[#475569]">{selected.experience}</p>
            </>}
          </div>

          {/* Admin note */}
          {selected.admin_note && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-4">
              <p className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wide mb-2">Admin Note</p>
              <p className="text-[13px] text-[#475569]">{selected.admin_note}</p>
              {selected.reviewed_by_name && <p className="text-[11px] text-[#94A3B8] mt-2">— {selected.reviewed_by_name} · {selected.reviewed_at ? timeAgo(selected.reviewed_at) : ''}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setRejectModal(true)} disabled={acting || selected.status === 'rejected'}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {selected.status === 'rejected' ? 'Rejected' : 'Reject'}
            </button>
            <button onClick={handleApprove} disabled={acting || selected.status === 'approved' || !documentsComplete || !allDocumentsViewed || !documentsVerified}
              className="flex-1 py-3 rounded-xl bg-[#22C55E] text-white text-[13px] font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
              {acting ? 'Processing...' : selected.status === 'approved' ? 'Approved' : 'Approve'}
            </button>
          </div>
        </div>

        {documentPreview && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Application document preview" onClick={() => setDocumentPreview(null)}>
            <section className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
              <header className="flex items-center justify-between border-b border-[#DCE5EB] px-4 py-3">
                <h2 className="text-sm font-extrabold text-[#071A2B]">{documentPreview.type.replace('-', ' ')} preview</h2>
                <button onClick={() => setDocumentPreview(null)} aria-label="Close document preview" className="flex h-9 w-9 items-center justify-center hover:bg-[#F1F5F9]"><X size={18} /></button>
              </header>
              {documentPreview.contentType.startsWith('image/')
                ? <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#F1F5F9] p-4"><img src={documentPreview.url} alt="Submitted application evidence" className="max-h-full max-w-full object-contain" /></div>
                : <iframe title="Submitted application document" src={documentPreview.url} className="min-h-0 flex-1 border-0" />}
            </section>
          </div>
        )}

        {/* Reject modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <p className="text-[16px] font-extrabold text-[#071A2B] mb-1">Reject Application</p>
              <p className="text-[12px] text-[#64748B] mb-4">Provide a reason for rejection.</p>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} placeholder="Reason..."
                className="w-full px-3 py-3 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B] resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B]">Cancel</button>
                <button onClick={handleReject} disabled={acting || !rejectNote.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold disabled:opacity-50">
                  {acting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Store size={20} color="#071A2B" />
          <h1 className="text-xl font-extrabold text-[#071A2B]">Trader Applications</h1>
        </div>
        <button onClick={load} className="p-1.5 hover:opacity-70"><RefreshCw size={16} color="#64748B" /></button>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-4">{error}</p>}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-colors capitalize ${filter === f ? 'bg-[#071A2B] border-[#071A2B] text-white' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#071A2B]'}`}>
            {f}
            {counts[f] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#64748B] text-[14px] py-20">No applications found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(a => {
            const cfg = STATUS_COLOR[a.status]
            return (
              <button key={a.id} onClick={() => { setDocumentsVerified(false); setError(''); setSelected(a) }}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-4 text-left hover:border-[#071A2B] transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                  <cfg.icon size={18} color={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-extrabold text-[#071A2B] truncate">{a.business_name}</p>
                  <p className="text-[11px] text-[#64748B]">{a.full_name} · {a.email}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{a.product_categories}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{a.status}</span>
                  <span className="text-[10px] text-[#94A3B8]">{timeAgo(a.created_at)}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
