import { useState, useEffect } from 'react'
import { Skull, TriangleAlert, CircleX, ChevronDown, Settings as SettingsIcon, Users as UsersIcon, Truck } from 'lucide-react'
import { BASE_URL } from '../../lib/api'
import { parseError } from '../ErrorBanner'

type Toast = { message: string; type: 'success' | 'error' }

function ToastAlert({ toast, onDone }: { toast: Toast | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-xl shadow-lg text-[13px] font-bold text-white ${toast.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}>
      {toast.message}
    </div>
  )
}

const TABS = [
  { key: 'Platform', icon: SettingsIcon, desc: 'Visibility & charges' },
  { key: 'Users',    icon: UsersIcon,    desc: 'Staff accounts' },
  { key: 'Delivery', icon: Truck,        desc: 'Fees & districts' },
] as const
type Tab = typeof TABS[number]['key']

const PAGE_OPTIONS = ['Dashboard', 'Products', 'Flash Sales', 'Categories', 'Orders', 'Users', 'Payments', 'Settings']

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` }
}

// ── Platform ──────────────────────────────────────────────────────────────────
type PlatformSettings = {
  ui_active: boolean
  allow_selling: boolean
  initial_charge: string
  commission: string
  withdrawal_minimum: string
  withdrawal_fee: string
  vat: string
  free_delivery_threshold: string
}

const CHARGE_FIELDS: { key: keyof PlatformSettings; label: string; desc: string; suffix: string }[] = [
  { key: 'initial_charge',          label: 'Initial Charge',           desc: 'One-time fee to activate a trader account.',          suffix: 'UGX' },
  { key: 'commission',              label: 'Commission',               desc: 'Percentage cut taken from each sale.',                  suffix: '%'   },
  { key: 'withdrawal_minimum',      label: 'Withdrawal Minimum',       desc: 'Minimum amount a trader can withdraw.',                 suffix: 'UGX' },
  { key: 'withdrawal_fee',          label: 'Withdrawal Fee',           desc: 'Flat fee charged per withdrawal request.',             suffix: 'UGX' },
  { key: 'vat',                     label: 'VAT',                      desc: 'Tax percentage applied to transactions.',               suffix: '%'   },
  { key: 'free_delivery_threshold', label: 'Free Delivery Threshold',  desc: 'Order amount above which delivery is free.',           suffix: 'UGX' },
]

function ChargesAccordion({ settings, setSettings }: {
  settings: PlatformSettings
  setSettings: React.Dispatch<React.SetStateAction<PlatformSettings>>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (key: string, current: string) => {
    setEditing(key)
    setDraft(current)
  }

  const handleSave = async (key: string) => {
    setSettings(s => ({ ...s, [key]: draft }))
    // submit just this field
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
    // we need to save only this key — call API directly
    try {
      await fetch(`${BASE_URL}/api/settings/platform/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ [key]: draft }),
      })
    } catch {}
    setEditing(null)
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
      >
        <div>
          <p className="text-[13px] font-extrabold text-[#071A2B] text-left">Charges & Rates</p>
          <p className="text-[11px] text-[#94A3B8] text-left mt-0.5">{open ? 'Click to collapse' : 'Insert commission, VAT, fees…'}</p>
        </div>
        <ChevronDown size={16} color="#94A3B8" className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
          {CHARGE_FIELDS.map(({ key, label, desc, suffix }) => {
            const isEditing = editing === key
            const saved = settings[key as keyof PlatformSettings] as string
            const hasValue = saved && Number(saved) > 0
            return (
              <div key={key} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#071A2B]">{label}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        type="number" min="0" step="any"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        className="w-24 px-3 py-1.5 border border-[#22C55E] rounded-xl text-[13px] text-right outline-none"
                      />
                      <span className="text-[12px] font-bold text-[#94A3B8] w-8">{suffix}</span>
                      <button
                        onClick={() => handleSave(key)}
                        className="px-3 py-1.5 bg-[#071A2B] text-white rounded-lg text-[11px] font-bold hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 border border-[#E2E8F0] text-[#64748B] rounded-lg text-[11px] font-bold"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      {hasValue && (
                        <span className="text-[13px] font-bold text-[#071A2B]">{Number(saved).toLocaleString()} {suffix}</span>
                      )}
                      <button
                        onClick={() => startEdit(key, saved)}
                        className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-[11px] font-bold text-[#64748B] hover:border-[#071A2B] hover:text-[#071A2B] transition-colors"
                      >
                        {hasValue ? 'Update' : 'Insert'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlatformTab({ showToast }: { showToast: (m: string, t?: Toast['type']) => void }) {
  const [settings, setSettings] = useState<PlatformSettings>({
    ui_active: false, allow_selling: false,
    initial_charge: '', commission: '', withdrawal_minimum: '',
    withdrawal_fee: '', vat: '', free_delivery_threshold: '',
  })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [savingCharges, setSavingCharges] = useState(false)
  const [warnDeactivate, setWarnDeactivate] = useState(false)

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/platform/`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setSettings(s => ({ ...s, ...d }))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = async (key: 'ui_active' | 'allow_selling') => {
    if (key === 'ui_active' && settings.ui_active) {
      setWarnDeactivate(true)
      return
    }
    await doToggle(key)
  }

  const doToggle = async (key: 'ui_active' | 'allow_selling') => {
    setToggling(key)
    const next = { ...settings, [key]: !settings[key] }
    try {
      const res = await fetch(`${BASE_URL}/api/settings/platform/`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ [key]: next[key] }),
      })
      if (!res.ok) throw new Error()
      setSettings(next)
      showToast('Setting updated.')
    } catch { showToast('Failed to update setting.', 'error') }
    finally { setToggling(null) }
  }

  const saveCharges = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingCharges(true)
    const payload: Record<string, string> = {}
    CHARGE_FIELDS.forEach(({ key }) => { payload[key] = String(settings[key] ?? '') })
    try {
      const res = await fetch(`${BASE_URL}/api/settings/platform/`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      showToast('Charges saved.')
    } catch { showToast('Failed to save charges.', 'error') }
    finally { setSavingCharges(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  const toggleRows: { key: 'ui_active' | 'allow_selling'; label: string; desc: string }[] = [
    { key: 'ui_active',     label: 'Activate UI',    desc: 'Make the storefront visible and accessible to customers.' },
    { key: 'allow_selling', label: 'Allow Selling',  desc: 'Let vendors list and sell products on the platform.' },
  ]

  return (
    <div className="space-y-6">

      {/* Deactivate warning modal */}
      {warnDeactivate && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setWarnDeactivate(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-3">
                <Skull className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 text-red-500" />
                <p className="text-[17px] font-extrabold text-[#071A2B]">Deactivate the Site?</p>
                <TriangleAlert className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 space-y-2">
              <div className="flex items-start gap-2">
                <CircleX className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[12px] font-bold text-red-600">This will immediately hide the entire storefront from all regular users.</p>
              </div>
              <div className="flex items-start gap-2">
                <CircleX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-500">All customers will see a "Site does not exist" error.</p>
              </div>
              <div className="flex items-start gap-2">
                <CircleX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-500">No one will be able to browse, shop, or place orders.</p>
              </div>
              <div className="flex items-start gap-2">
                <CircleX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-500">Only admins will retain access.</p>
              </div>
            </div>
            <p className="text-[12px] text-[#64748B] text-center mb-5">Are you absolutely sure you want to deactivate the site?</p>
            <div className="flex gap-3">
              <button onClick={() => setWarnDeactivate(false)}
                className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B] hover:border-[#071A2B]">
                Cancel
              </button>
              <button onClick={() => { setWarnDeactivate(false); doToggle('ui_active') }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5">
                <Skull className="w-4 h-4" />
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toggles + Charges side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Toggles */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Visibility</p>
          {toggleRows.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-5 py-4">
              <div>
                <p className="text-[14px] font-bold text-[#071A2B]">{label}</p>
                <p className="text-[12px] text-[#64748B] mt-0.5">{desc}</p>
              </div>
              <button
                disabled={toggling === key}
                onClick={() => toggle(key)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${settings[key] ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'} ${toggling === key ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[key] ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Charges */}
        <div className="h-fit">
          <ChargesAccordion settings={settings} setSettings={setSettings} />
        </div>
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
type AdminUser = { id: number; name: string; email: string; phone: string; is_staff: boolean; assigned_pages: string[] }

function UsersTab({ showToast }: { showToast: (m: string, t?: Toast['type']) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | { user: AdminUser; action: 'pages' | 'delete' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [selectedPages, setSelectedPages] = useState<string[]>([])

  const load = () => {
    setLoading(true)
    fetch(`${BASE_URL}/api/auth/admin/users/`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setUsers((Array.isArray(d) ? d : d.results ?? []).filter((u: AdminUser) => u.is_staff)))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = search.trim()
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/users/`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...addForm, is_staff: true }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(Object.values(err).flat().join(' ')) }
      showToast('Staff user added.')
      setModal(null)
      setAddForm({ name: '', email: '', phone: '', password: '' })
      load()
    } catch (err) { showToast(parseError(err, 'Failed to add user.'), 'error') }
    finally { setBusy(false) }
  }

  const handleDelete = async (user: AdminUser) => {
    setBusy(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/users/${user.id}/`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error()
      showToast('User deleted.'); setModal(null); load()
    } catch { showToast('Failed to delete user.', 'error') }
    finally { setBusy(false) }
  }

  const handleAssignPages = async (user: AdminUser) => {
    setBusy(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/users/${user.id}/`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ assigned_pages: selectedPages }),
      })
      if (!res.ok) throw new Error()
      showToast('Pages assigned.'); setModal(null); load()
    } catch { showToast('Failed to assign pages.', 'error') }
    finally { setBusy(false) }
  }

  const openPages = (user: AdminUser) => { setSelectedPages(user.assigned_pages ?? []); setModal({ user, action: 'pages' }) }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
          className="flex-1 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]" />
        <button onClick={() => setModal('add')} className="shrink-0 px-4 py-2.5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold hover:opacity-90">
          + Add Staff
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
        : (
          <div className="flex flex-col gap-2">
            {filtered.map(u => (
              <div key={u.id} className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0">
                  <span className="text-white text-[12px] font-extrabold">{u.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#071A2B] truncate">{u.name}</p>
                  <p className="text-[11px] text-[#64748B] truncate">{u.email}</p>
                  {(u.assigned_pages?.length > 0) ? (
                    <p className="text-[10px] text-[#6366f1] font-semibold mt-0.5">{u.assigned_pages.join(', ')}</p>
                  ) : (
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">All pages</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openPages(u)} className="px-2.5 py-1.5 text-[11px] font-bold text-[#1E3A8A] border border-[#E2E8F0] rounded-lg hover:bg-blue-50">Pages</button>
                  <button onClick={() => setModal({ user: u, action: 'delete' })} className="px-2.5 py-1.5 text-[11px] font-bold text-red-500 border border-[#E2E8F0] rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-[#64748B] text-[13px] py-16">No staff users found.</p>}
          </div>
        )
      }

      {modal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setModal(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">

            {modal === 'add' && (
              <form onSubmit={handleAdd} className="space-y-3">
                <p className="text-[16px] font-extrabold text-[#071A2B] mb-1">Add Staff User</p>
                <p className="text-[12px] text-[#64748B] mb-2">This user will be created as staff and can be restricted to specific pages.</p>
                {(['name', 'email', 'phone', 'password'] as const).map(k => (
                  <input key={k} type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                    placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                    value={addForm[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))}
                    required className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]" />
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} disabled={busy} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
                  <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold disabled:opacity-60">{busy ? 'Adding...' : 'Add Staff'}</button>
                </div>
              </form>
            )}

            {modal !== 'add' && modal.action === 'pages' && (
              <div>
                <p className="text-[16px] font-extrabold text-[#071A2B] mb-1">Assign Pages</p>
                <p className="text-[12px] text-[#64748B] mb-1">Pages <span className="font-bold">{modal.user.name}</span> can access.</p>
                <p className="text-[11px] text-[#94A3B8] mb-4">Leave all unchecked to grant access to all pages.</p>
                <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
                  {PAGE_OPTIONS.map(p => (
                    <label key={p} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer">
                      <input type="checkbox" checked={selectedPages.includes(p)}
                        onChange={e => setSelectedPages(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))} />
                      <span className="text-[13px] font-semibold text-[#071A2B]">{p}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} disabled={busy} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
                  <button onClick={() => handleAssignPages(modal.user)} disabled={busy} className="flex-1 py-2.5 bg-[#1E3A8A] text-white rounded-xl text-[13px] font-bold disabled:opacity-60">{busy ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            )}

            {modal !== 'add' && modal.action === 'delete' && (
              <div>
                <p className="text-[16px] font-extrabold text-[#071A2B] mb-2">Delete Staff User?</p>
                <p className="text-[13px] text-[#64748B] mb-6">This will permanently delete <span className="font-bold">{modal.user.name}</span> and all their data.</p>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} disabled={busy} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
                  <button onClick={() => handleDelete(modal.user)} disabled={busy} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-[13px] font-bold disabled:opacity-60">{busy ? 'Deleting...' : 'Yes, Delete'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Delivery ──────────────────────────────────────────────────────────────────
type District = { id: number; name: string; price: string; region: string }

const UGANDA_REGIONS: Record<string, string[]> = {
  'Central Region': ['Buikwe','Bukomansimbi','Butambala','Buvuma','Gomba','Kalangala','Kalungu','Kampala','Kassanda','Kayunga','Kiboga','Kyankwanzi','Kyotera','Luweero','Lwengo','Lyantonde','Masaka','Mityana','Mpigi','Mubende','Mukono','Nakaseke','Nakasongola','Rakai','Sembabule','Wakiso'],
  'Western Region': ['Buhweju','Buliisa','Bunyangabu','Bushenyi','Hoima','Ibanda','Isingiro','Kabale','Kabarole','Kagadi','Kakumiro','Kamwenge','Kanungu','Kazo','Kibaale','Kikuube','Kiruhura','Kiryandongo','Kisoro','Kitagwenda','Kyegegwa','Kyenjojo','Masindi','Mbarara','Mitooma','Ntoroko','Ntungamo','Rubanda','Rubirizi','Rukiga','Rwampara','Sheema'],
  'Eastern Region': ['Amuria','Budaka','Bududa','Bugiri','Bugweri','Bukedea','Bukwa','Bulambuli','Busia','Butaleja','Buyende','Iganga','Jinja','Kaberamaido','Kalaki','Kaliro','Kamuli','Kapelebyong','Kapchorwa','Katakwi','Kibuku','Kumi','Kween','Luuka','Manafwa','Mayuge','Mbale','Namayingo','Namisindwa','Namutumba','Ngora','Pallisa','Serere','Sironko','Soroti','Tororo'],
  'Northern Region': ['Abim','Adjumani','Agago','Alebtong','Amolatar','Amudat','Amuru','Apac','Arua','Dokolo','Gulu','Kaabong','Karenga','Kitgum','Koboko','Kole','Kotido','Kwania','Lamwo','Lira','Madi Okolo','Maracha','Moroto','Moyo','Nabilatuk','Nakapiripirit','Napak','Nebbi','Nwoya','Obongi','Omoro','Otuke','Oyam','Pader','Pakwach','Terego','Yumbe','Zombo'],
}

function DeliveryTab({ showToast }: { showToast: (m: string, t?: Toast['type']) => void }) {
  const [globalFee, setGlobalFee] = useState('')
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFee, setSavingFee] = useState(false)
  const [activeRegion, setActiveRegion] = useState<string>(Object.keys(UGANDA_REGIONS)[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`${BASE_URL}/api/settings/delivery/`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${BASE_URL}/api/settings/districts/`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([d, dist]) => {
      setGlobalFee(d.global_fee ?? '')
      setDistricts(Array.isArray(dist) ? dist : dist.results ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const saveGlobalFee = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingFee(true)
    try {
      const res = await fetch(`${BASE_URL}/api/settings/delivery/`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ global_fee: globalFee }),
      })
      if (!res.ok) throw new Error()
      showToast('Delivery fee updated.')
    } catch { showToast('Failed to update delivery fee.', 'error') }
    finally { setSavingFee(false) }
  }

  const saveDistrictPrice = async (district: District) => {
    setSavingId(district.id)
    try {
      const existing = districts.find(d => d.name === district.name)
      const method = existing?.id ? 'PATCH' : 'POST'
      const url = existing?.id
        ? `${BASE_URL}/api/settings/districts/${existing.id}/`
        : `${BASE_URL}/api/settings/districts/`
      const res = await fetch(url, {
        method, headers: authHeaders(),
        body: JSON.stringify({ name: district.name, price: editPrice, region: activeRegion }),
      })
      if (!res.ok) throw new Error()
      showToast('Price saved.')
      setEditingId(null)
      load()
    } catch { showToast('Failed to save price.', 'error') }
    finally { setSavingId(null) }
  }

  const saveNewDistrict = async (name: string) => {
    setSavingId(-1)
    try {
      const res = await fetch(`${BASE_URL}/api/settings/districts/`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ name, price: editPrice, region: activeRegion }),
      })
      if (!res.ok) throw new Error()
      showToast('Price saved.')
      setEditingId(null)
      load()
    } catch { showToast('Failed to save price.', 'error') }
    finally { setSavingId(null) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  const regionDistricts = UGANDA_REGIONS[activeRegion] ?? []

  return (
    <>
      {/* Global fee */}
      <form onSubmit={saveGlobalFee} className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4 mb-6 max-w-sm">
        <p className="text-[13px] font-bold text-[#071A2B] mb-0.5">Global Delivery Fee</p>
        <p className="text-[12px] text-[#64748B] mb-3">Default fee when no district price is set.</p>
        <div className="flex gap-2">
          <input value={globalFee} onChange={e => setGlobalFee(e.target.value)} type="number" min="0" placeholder="e.g. 5000"
            className="flex-1 px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]" />
          <button type="submit" disabled={savingFee} className="px-5 py-2.5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold disabled:opacity-60 hover:opacity-90">
            {savingFee ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* Region tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1 mb-4 overflow-x-auto scrollbar-none">
        {Object.keys(UGANDA_REGIONS).map(r => (
          <button key={r} onClick={() => { setActiveRegion(r); setEditingId(null) }}
            className={`shrink-0 px-4 py-2 rounded-lg text-[12px] font-bold transition-colors whitespace-nowrap ${
              activeRegion === r ? 'bg-white text-[#071A2B] shadow-sm' : 'text-[#64748B] hover:text-[#071A2B]'
            }`}>
            {r.replace(' Region', '')}
          </button>
        ))}
      </div>

      {/* Districts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {regionDistricts.map(name => {
          const saved = districts.find(d => d.name === name)
          const isEditing = editingId === (saved?.id ?? -(regionDistricts.indexOf(name) + 1))
          const tempId = saved?.id ?? -(regionDistricts.indexOf(name) + 1)
          return (
            <div key={name} className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold text-[#071A2B]">{name}</p>
                {!isEditing && (
                  <button onClick={() => { setEditingId(tempId); setEditPrice(saved?.price ?? '') }}
                    className="text-[11px] font-bold text-[#1E3A8A] hover:underline">
                    {saved ? 'Edit' : 'Set'}
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="flex gap-1.5 mt-2">
                  <input autoFocus type="number" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                    placeholder="UGX" className="flex-1 px-2 py-1.5 border border-[#22C55E] rounded-lg text-[12px] outline-none" />
                  <button onClick={() => saved ? saveDistrictPrice(saved) : saveNewDistrict(name)}
                    disabled={savingId === tempId}
                    className="px-2.5 py-1.5 bg-[#071A2B] text-white rounded-lg text-[11px] font-bold disabled:opacity-60">
                    {savingId === tempId ? '...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 border border-[#E2E8F0] text-[#64748B] rounded-lg text-[11px] font-bold">
                    ✕
                  </button>
                </div>
              ) : (
                <p className={`text-[12px] ${saved ? 'text-[#22C55E] font-bold' : 'text-[#CBD5E1]'}`}>
                  {saved ? `UGX ${Number(saved.price).toLocaleString()}` : 'No price set'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>('Platform')
  const [toast, setToast] = useState<Toast | null>(null)
  const showToast = (message: string, type: Toast['type'] = 'success') => setToast({ message, type })

  return (
    <div className="w-full p-6 md:p-8">
      <ToastAlert toast={toast} onDone={() => setToast(null)} />
      <p className="text-[20px] font-extrabold text-[#071A2B] mb-6">Settings</p>

      <div className="flex gap-3 mb-8">
        {TABS.map(({ key, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-start gap-1 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
              tab === key
                ? 'border-[#071A2B] bg-[#071A2B] shadow-lg'
                : 'border-[#E2E8F0] bg-white hover:border-[#071A2B]/30'
            }`}
          >
            <Icon size={20} strokeWidth={2} className={tab === key ? 'text-white' : 'text-[#071A2B]'} />
            <p className={`text-[13px] font-extrabold leading-tight ${ tab === key ? 'text-white' : 'text-[#071A2B]'}`}>{key}</p>
            <p className={`text-[10px] font-medium leading-tight ${ tab === key ? 'text-white/60' : 'text-[#94A3B8]'}`}>{desc}</p>
          </button>
        ))}
      </div>

      {tab === 'Platform' && <PlatformTab showToast={showToast} />}
      {tab === 'Users' && <UsersTab showToast={showToast} />}
      {tab === 'Delivery' && <DeliveryTab showToast={showToast} />}
    </div>
  )
}
