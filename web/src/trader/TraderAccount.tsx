import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tradersApi } from '../lib/api'
import { Camera, Eye, EyeOff, AlertTriangle, Trash2, LogOut, Save, Store } from 'lucide-react'

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
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
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
  }

  const closeShop = async () => {
    if (!traderUuid || !profile) return
    const fd = new FormData()
    fd.append('is_closed', String(!profile.is_closed))
    const { data } = await tradersApi.updateAccount(traderUuid, fd)
    setProfile(data as unknown as Profile)
    setCloseConfirm(false)
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
        <h1 className="text-[20px] font-extrabold text-[#071A2B]">My Account</h1>
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
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[13px] text-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Bio / Description</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[13px] text-[#071A2B] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#22C55E] text-white text-[13px] font-bold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-60"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saveMsg && <span className={`text-[12px] font-semibold ${saveMsg === 'Saved!' ? 'text-[#22C55E]' : 'text-red-500'}`}>{saveMsg}</span>}
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
                ? 'Your products are visible in the store.'
                : 'Your products are hidden from the store.'}
            </p>
          </div>
          <button
            onClick={toggleVisibility}
            className={`shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${
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
          {!closeConfirm
            ? <button
                onClick={() => setCloseConfirm(true)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${
                  profile.is_closed
                    ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                    : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
                }`}
              >
                {profile.is_closed ? 'Reopen Shop' : 'Close Shop'}
              </button>
            : <div className="flex gap-2 shrink-0">
                <button onClick={closeShop} className="px-4 py-2 bg-orange-500 text-white text-[12px] font-bold rounded-xl hover:bg-orange-600">Confirm</button>
                <button onClick={() => setCloseConfirm(false)} className="px-4 py-2 bg-[#F1F5F9] text-[#64748B] text-[12px] font-bold rounded-xl">Cancel</button>
              </div>
          }
        </div>
      </section>

      {/* Delete Shop */}
      <section className="bg-white rounded-2xl border border-red-100 p-6 space-y-4">
        <h2 className="text-[14px] font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16} /> Delete Shop Permanently</h2>
        <p className="text-[12px] text-[#64748B]">
          This will permanently delete your shop, all products, sales, and data. This action <strong>cannot be undone</strong>.
        </p>
        {!deleteConfirm
          ? <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-[13px] font-bold rounded-xl hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Delete My Shop
            </button>
          : <div className="space-y-3">
              <p className="text-[12px] font-semibold text-[#071A2B]">Type <span className="font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded">DELETE</span> to confirm:</p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-red-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={deleteShop}
                  disabled={deleteInput !== 'DELETE' || deleting}
                  className="px-5 py-2.5 bg-red-600 text-white text-[13px] font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Permanently Delete'}
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeleteInput('') }} className="px-4 py-2.5 bg-[#F1F5F9] text-[#64748B] text-[13px] font-bold rounded-xl">Cancel</button>
              </div>
            </div>
        }
      </section>

    </div>
  )
}
