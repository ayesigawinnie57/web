import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tradersApi } from '../lib/api'
import { Camera, Eye, EyeOff, AlertTriangle, Trash2, LogOut, Store, X } from 'lucide-react'

type Profile = {
  business_name: string
  bio: string
  phone: string
  location: string
  district: string
  website: string
  is_visible: boolean
  is_closed: boolean
  logo_url: string | null
  full_name: string
  email: string
}

type ModalProps = {
  title: string
  description: string
  warning?: string
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  children?: React.ReactNode
}

function AlertModal({ title, description, warning, confirmLabel, confirmClass, onConfirm, onCancel, loading, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500 shrink-0" />
            <h2 className="text-[16px] font-extrabold text-[#071A2B]">{title}</h2>
          </div>
          <button onClick={onCancel} className="text-[#94A3B8] hover:text-[#071A2B] transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-[13px] text-[#64748B]">{description}</p>
        {warning && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-orange-700 font-semibold">{warning}</p>
          </div>
        )}
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2.5 bg-[#F1F5F9] text-[#64748B] text-[13px] font-bold rounded-none hover:bg-[#E2E8F0] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2.5 text-[13px] font-bold rounded-none transition-colors disabled:opacity-50 ${confirmClass}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TraderAccount() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ business_name: '', bio: '', phone: '', location: '', district: '', website: '' })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [modal, setModal] = useState<'close' | 'reopen' | 'hide' | 'show' | 'delete' | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!traderUuid) return
    tradersApi.account(traderUuid).then(({ data }) => {
      setProfile(data as unknown as Profile)
      setForm({
        business_name: (data as any).business_name ?? '',
        bio: (data as any).bio ?? '',
        phone: (data as any).phone ?? '',
        location: (data as any).location ?? '',
        district: (data as any).district ?? '',
        website: (data as any).website ?? '',
      })
    })
  }, [traderUuid])

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!traderUuid) return
    setSaving(true)
    setSaveMsg('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (logoFile) fd.append('logo', logoFile)
      const { data } = await tradersApi.updateAccount(traderUuid, fd)
      setProfile(data as unknown as Profile)
      setSaveMsg('Saved!')
      setLogoFile(null)
    } catch {
      setSaveMsg('Failed to save.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  const toggleVisibility = async () => {
    if (!traderUuid || !profile) return
    const fd = new FormData()
    fd.append('is_visible', String(!profile.is_visible))
    const { data } = await tradersApi.updateAccount(traderUuid, fd)
    setProfile(data as unknown as Profile)
    setModal(null)
  }

  const toggleClose = async () => {
    if (!traderUuid || !profile) return
    const fd = new FormData()
    fd.append('is_closed', String(!profile.is_closed))
    const { data } = await tradersApi.updateAccount(traderUuid, fd)
    setProfile(data as unknown as Profile)
    setModal(null)
  }

  const deleteShop = async () => {
    if (!traderUuid || deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      await tradersApi.deleteShop(traderUuid)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      navigate('/')
    } catch {
      setDeleting(false)
    }
  }

  if (!profile) return <div className="p-8 text-[13px] text-[#64748B]">Loading…</div>

  const logoSrc = logoPreview ?? profile.logo_url

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-[#071A2B]">Settings</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">{profile.full_name} · {profile.email}</p>
      </div>

      {/* Business Profile */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
        <h2 className="text-[14px] font-bold text-[#071A2B] flex items-center gap-2"><Store size={16} /> Business Profile</h2>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl bg-[#F1F5F9] border-2 border-dashed border-[#CBD5E1] flex items-center justify-center overflow-hidden cursor-pointer relative group"
            onClick={() => fileRef.current?.click()}
          >
            {logoSrc
              ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
              : <Store size={28} className="text-[#94A3B8]" />
            }
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
              <Camera size={18} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#071A2B]">Business Logo</p>
            <p className="text-[11px] text-[#94A3B8]">Click to upload · PNG, JPG</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['business_name', 'Business Name'],
            ['phone', 'Phone'],
            ['location', 'Location'],
            ['district', 'District'],
            ['website', 'Website'],
          ] as [keyof typeof form, string][]).map(([key, label]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">{label}</label>
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === key ? null : key)}
                  className="text-[11px] font-bold text-[#22C55E] hover:text-[#16A34A] transition-colors"
                >
                  {editingField === key ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingField === key
                ? <input
                    autoFocus
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-none px-3 py-2.5 text-[13px] text-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
                  />
                : <p className="px-3 py-2.5 text-[13px] text-[#071A2B] bg-[#F8FAFC] border border-[#E2E8F0]">{form[key] || <span className="text-[#94A3B8]">Not set</span>}</p>
              }
            </div>
          ))}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Bio / Description</label>
              <button
                type="button"
                onClick={() => setEditingField(editingField === 'bio' ? null : 'bio')}
                className="text-[11px] font-bold text-[#22C55E] hover:text-[#16A34A] transition-colors"
              >
                {editingField === 'bio' ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingField === 'bio'
              ? <textarea
                  autoFocus
                  rows={3}
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-none px-3 py-2.5 text-[13px] text-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 resize-none"
                />
              : <p className="px-3 py-2.5 text-[13px] text-[#071A2B] bg-[#F8FAFC] border border-[#E2E8F0] min-h-[72px]">{form.bio || <span className="text-[#94A3B8]">Not set</span>}</p>
            }
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveMsg && <span className={`text-[12px] font-semibold ${saveMsg === 'Saved!' ? 'text-[#22C55E]' : 'text-red-500'}`}>{saveMsg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-[#22C55E] text-white text-[13px] font-bold rounded-none hover:bg-[#16A34A] transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Visibility */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#071A2B] flex items-center gap-2">
              {profile.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              Products Visibility
            </h2>
            <p className="text-[12px] text-[#64748B] mt-1">
              {profile.is_visible
                ? 'Your products are currently visible in the store.'
                : 'Your products are hidden from the store.'}
            </p>
          </div>
          <button
            onClick={() => setModal(profile.is_visible ? 'hide' : 'show')}
            className={`shrink-0 px-4 py-2 rounded-none text-[12px] font-bold transition-colors ${
              profile.is_visible
                ? 'bg-[#FEF9C3] text-[#854D0E] hover:bg-[#FEF08A]'
                : 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
            }`}
          >
            {profile.is_visible ? 'Hide All Products' : 'Show All Products'}
          </button>
        </div>
      </section>

      {/* Close Shop */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#071A2B] flex items-center gap-2"><LogOut size={16} /> Close Shop</h2>
            <p className="text-[12px] text-[#64748B] mt-1">
              {profile.is_closed
                ? 'Your shop is currently closed. Reopen it anytime.'
                : 'Temporarily close your shop. You can reopen it anytime.'}
            </p>
          </div>
          <button
            onClick={() => setModal(profile.is_closed ? 'reopen' : 'close')}
            className={`shrink-0 px-4 py-2 rounded-none text-[12px] font-bold transition-colors ${
              profile.is_closed
                ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
            }`}
          >
            {profile.is_closed ? 'Reopen Shop' : 'Close Shop'}
          </button>
        </div>
      </section>

      {/* Delete Shop */}
      <section className="bg-white rounded-2xl border border-red-100 p-6 space-y-4">
        <h2 className="text-[14px] font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16} /> Delete Shop Permanently</h2>
        <p className="text-[12px] text-[#64748B]">
          This will permanently delete your shop, all products, sales, and data. This action <strong>cannot be undone</strong>.
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setModal('delete')}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-[13px] font-bold rounded-none hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} /> Delete My Shop
          </button>
        </div>
      </section>

      {/* — Modals — */}

      {modal === 'hide' && (
        <AlertModal
          title="Hide All Products?"
          description="All your products will be hidden from the store immediately. Customers won't be able to find or buy them."
          warning="This affects all your active listings. You can show them again at any time."
          confirmLabel="Yes, Hide Products"
          confirmClass="bg-yellow-500 text-white hover:bg-yellow-600"
          onConfirm={toggleVisibility}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'show' && (
        <AlertModal
          title="Show All Products?"
          description="All your products will become visible in the store again."
          confirmLabel="Yes, Show Products"
          confirmClass="bg-[#22C55E] text-white hover:bg-[#16A34A]"
          onConfirm={toggleVisibility}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'close' && (
        <AlertModal
          title="Close Your Shop?"
          description="Your shop will be temporarily closed. Customers won't be able to place new orders."
          warning="All your products will be hidden while the shop is closed. You can reopen anytime."
          confirmLabel="Yes, Close Shop"
          confirmClass="bg-orange-500 text-white hover:bg-orange-600"
          onConfirm={toggleClose}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'reopen' && (
        <AlertModal
          title="Reopen Your Shop?"
          description="Your shop will be reopened and your products will be visible to customers again."
          confirmLabel="Yes, Reopen Shop"
          confirmClass="bg-[#22C55E] text-white hover:bg-[#16A34A]"
          onConfirm={toggleClose}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === 'delete' && (
        <AlertModal
          title="Delete Shop Permanently?"
          description="This will permanently delete your shop, all products, sales history, and data. This cannot be undone."
          warning="Once deleted, your shop and all associated data will be gone forever. There is no recovery."
          confirmLabel="Permanently Delete"
          confirmClass="bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          onConfirm={deleteShop}
          onCancel={() => { setModal(null); setDeleteInput('') }}
          loading={deleting}
        >
          <div className="space-y-1.5">
            <p className="text-[12px] font-semibold text-[#071A2B]">Type <span className="font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded">DELETE</span> to confirm:</p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-red-200 rounded-none px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
        </AlertModal>
      )}

    </div>
  )
}
