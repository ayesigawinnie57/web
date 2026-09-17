import { useState, useRef } from 'react'
import { Database, Download, Upload, Trash2, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { dataApi } from '../../lib/api'

type ImportType = 'products' | 'categories'
type ExportType = 'products' | 'orders' | 'users'

const IMPORT_ITEMS: { label: string; type: ImportType }[] = [
  { label: 'Import Products', type: 'products' },
  { label: 'Import Categories', type: 'categories' },
]

type ImportResult = { created: number; skipped?: number; errors: string[] }

function ImportSection() {
  const [loading, setLoading] = useState<ImportType | null>(null)
  const [result, setResult] = useState<{ type: ImportType; data: ImportResult } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingType = useRef<ImportType | null>(null)

  function handleClick(type: ImportType) {
    pendingType.current = type
    setResult(null)
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const type = pendingType.current
    if (!file || !type) return
    e.target.value = ''
    setLoading(type)
    try {
      const { data } = await dataApi.import(type, file)
      setResult({ type, data })
    } catch {
      setResult({ type, data: { created: 0, errors: ['Import failed. Check your CSV and try again.'] } })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#10b98118' }}>
          <Upload size={16} color="#10b981" />
        </div>
        <div>
          <p className="text-[14px] font-extrabold text-[#071A2B]">Import Data</p>
          <p className="text-[11px] text-[#64748B]">Bulk-import products or categories from a CSV file.</p>
        </div>
        <div className="ml-auto flex gap-2">
          {IMPORT_ITEMS.map(({ label, type }) => (
            <button
              key={type}
              onClick={() => handleClick(type)}
              disabled={loading === type}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-opacity hover:opacity-75 disabled:opacity-50"
              style={{ borderColor: '#10b98140', backgroundColor: '#10b9810d', color: '#10b981' }}
            >
              {loading === type ? 'Importing…' : label}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-3 rounded-lg p-3 text-[12px]" style={{ backgroundColor: result.data.errors.length ? '#fef2f2' : '#f0fdf4' }}>
          <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: result.data.errors.length ? '#ef4444' : '#10b981' }}>
            {result.data.errors.length
              ? <XCircle size={13} />
              : <CheckCircle size={13} />}
            {result.data.errors.length
              ? `${result.data.errors.length} error(s) — ${result.data.created} row(s) imported`
              : `${result.data.created} ${result.type} imported successfully${ result.data.skipped ? ` · ${result.data.skipped} skipped` : ''}`}
          </div>
          {result.data.errors.slice(0, 5).map((e, i) => (
            <p key={i} className="text-[#ef4444] leading-snug">{e}</p>
          ))}
          {result.data.errors.length > 5 && (
            <p className="text-[#94A3B8]">…and {result.data.errors.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  )
}

type ExportFormat = 'csv' | 'json'

const EXPORT_ITEMS: { label: string; type: ExportType }[] = [
  { label: 'Export Products', type: 'products' },
  { label: 'Export Orders', type: 'orders' },
  { label: 'Export Users', type: 'users' },
]

function ExportSection() {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)

  async function handleExport(type: ExportType) {
    setLoading(type)
    setError(null)
    try {
      const url = dataApi.exportUrl(type, format)
      const token = localStorage.getItem('access_token')
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const j = await res.json(); detail = j.detail ?? JSON.stringify(j) } catch {}
        throw new Error(detail)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${type}.${format}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err: any) {
      setError({
        title: `Failed to export ${type}`,
        detail: err?.message ?? 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#6366f118' }}>
            <Download size={16} color="#6366f1" />
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-[#071A2B]">Export Data</p>
            <p className="text-[11px] text-[#64748B]">Download a CSV or JSON export of your store data.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex gap-1">
              {(['csv', 'json'] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors"
                  style={format === f
                    ? { backgroundColor: '#6366f1', color: '#fff', borderColor: '#6366f1' }
                    : { backgroundColor: 'transparent', color: '#6366f1', borderColor: '#6366f140' }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            {EXPORT_ITEMS.map(({ label, type }) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                disabled={loading === type}
                className="px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-opacity hover:opacity-75 disabled:opacity-50"
                style={{ borderColor: '#6366f140', backgroundColor: '#6366f10d', color: '#6366f1' }}
              >
                {loading === type ? 'Exporting…' : label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setError(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#ef4444] px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <XCircle size={18} color="#fff" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-white">{error.title}</p>
                <p className="text-[11px] text-red-100">Export could not be completed</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3 mb-4">
                <p className="text-[12px] font-bold text-[#ef4444] mb-1">Error details</p>
                <p className="text-[12px] text-[#64748B] font-mono break-all">{error.detail}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="w-full py-2 rounded-lg bg-[#071A2B] text-white text-[13px] font-bold hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type DangerAction = 'clear-orders' | 'reset-inventory'

const DANGER_ITEMS: { label: string; action: DangerAction; confirmMsg: string; successMsg: (d: Record<string, number>) => string }[] = [
  {
    label: 'Clear All Orders',
    action: 'clear-orders',
    confirmMsg: 'This will permanently delete ALL orders, payments, and related data.',
    successMsg: d => `${d.deleted} order(s) deleted.`,
  },
  {
    label: 'Reset Inventory',
    action: 'reset-inventory',
    confirmMsg: 'This will set all product stock to 0 and delete all stock movement history.',
    successMsg: d => `${d.products_reset} product(s) reset · ${d.movements_deleted} movement(s) deleted.`,
  },
]

function DangerZoneSection() {
  const [confirm, setConfirm] = useState<DangerAction | null>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  function open(action: DangerAction) {
    setConfirm(action)
    setPassword('')
    setPwError('')
    setToast(null)
  }

  function close() {
    if (loading) return
    setConfirm(null)
    setPassword('')
    setPwError('')
    setShowPw(false)
  }

  async function execute() {
    if (!confirm || !password) return
    setLoading(true)
    setPwError('')
    try {
      const { data } = confirm === 'clear-orders'
        ? await dataApi.clearOrders(password)
        : await dataApi.resetInventory(password)
      const item = DANGER_ITEMS.find(i => i.action === confirm)!
      setToast({ ok: true, msg: item.successMsg(data as Record<string, number>) })
      setConfirm(null)
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? ''
      if (err?.response?.status === 403 || detail.toLowerCase().includes('password')) {
        setPwError('Incorrect password. Please try again.')
      } else {
        setToast({ ok: false, msg: 'Action failed. Please try again.' })
        setConfirm(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const activeItem = DANGER_ITEMS.find(i => i.action === confirm)

  return (
    <>
      <div className="rounded-xl border-2 border-[#ef4444] overflow-hidden">
        {/* Alert banner */}
        <div className="bg-[#ef4444] px-5 py-3 flex items-center gap-2">
          <AlertTriangle size={15} color="#fff" />
          <p className="text-[12px] font-extrabold text-white tracking-wide uppercase">Danger Zone — These actions cannot be undone</p>
        </div>

        <div className="bg-[#fff5f5] px-5 py-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#ef444418' }}>
              <Trash2 size={16} color="#ef4444" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-[#071A2B]">Danger Zone</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">The actions below will <span className="font-bold text-[#ef4444]">permanently erase data</span> from the platform with no way to recover it. Only proceed if you are absolutely sure.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {DANGER_ITEMS.map(({ label, action, confirmMsg }) => (
              <div key={action} className="flex items-center justify-between bg-white border border-[#fecaca] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[13px] font-bold text-[#071A2B]">{label}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{confirmMsg}</p>
                </div>
                <button
                  onClick={() => open(action)}
                  className="ml-4 shrink-0 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-opacity hover:opacity-75"
                  style={{ borderColor: '#ef444440', backgroundColor: '#ef44440d', color: '#ef4444' }}
                >
                  {label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {toast && (
          <div className="px-5 py-3 flex items-center gap-1.5 text-[12px] font-bold"
            style={{ backgroundColor: toast.ok ? '#f0fdf4' : '#fef2f2', color: toast.ok ? '#10b981' : '#ef4444' }}>
            {toast.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {toast.msg}
          </div>
        )}
      </div>

      {confirm && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Modal alert header */}
            <div className="bg-[#ef4444] px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} color="#fff" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-white">{activeItem.label}</p>
                <p className="text-[11px] text-red-100">This action is permanent and cannot be reversed</p>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* Warning box */}
              <div className="bg-[#fff5f5] border border-[#fecaca] rounded-xl p-4 mb-5">
                <p className="text-[12px] font-bold text-[#ef4444] mb-1">⚠ What will be deleted:</p>
                <p className="text-[12px] text-[#64748B]">{activeItem.confirmMsg}</p>
              </div>

              {/* Password field */}
              <p className="text-[12px] font-bold text-[#071A2B] mb-1.5">
                Enter your admin password to confirm
              </p>
              <div className="relative mb-1">
                <input
                  autoFocus
                  type={showPw ? 'text' : 'password'}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwError('') }}
                  onKeyDown={e => e.key === 'Enter' && execute()}
                  placeholder="Your password"
                  className="w-full border rounded-lg px-3 py-2 pr-9 text-[13px] outline-none"
                  style={{ borderColor: pwError ? '#ef4444' : '#E2E8F0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwError && <p className="text-[11px] text-[#ef4444] mb-3">{pwError}</p>}
              {!pwError && <div className="mb-3" />}

              <div className="flex gap-2 justify-end">
                <button onClick={close} disabled={loading}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[12px] font-bold text-[#64748B] hover:opacity-75 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  onClick={execute}
                  disabled={!password || loading}
                  className="px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-opacity hover:opacity-75 disabled:opacity-40"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  {loading ? 'Processing…' : 'Yes, delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function AdminData() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Database size={20} color="#071A2B" />
        <h1 className="text-xl font-extrabold text-[#071A2B]">Data Management</h1>
      </div>

      <div className="flex flex-col gap-4">
        <ExportSection />
        <ImportSection />
        <DangerZoneSection />
      </div>

      <p className="mt-8 text-[12px] text-[#94A3B8] text-center">Full data pipeline integrations coming soon.</p>
    </div>
  )
}
