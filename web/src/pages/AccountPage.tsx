import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { BASE_URL, authApi, cloudinaryUrl } from '../lib/api'
import { parseError } from '../admin/ErrorBanner'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

type Toast = { message: string; type: 'success' | 'error' }

function ToastAlert({ toast, onDone }: { toast: Toast | null; onDone: () => void }) {
  if (!toast) return null
  setTimeout(onDone, 3000)
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-xl shadow-lg text-[13px] font-bold text-white ${
      toast.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
    }`}>
      {toast.message}
    </div>
  )
}

const FIELDS = [
  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
  { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+256...' },
]

const PASSWORD_FIELDS = [
  { label: 'New Password', key: 'newPassword', type: 'password', placeholder: 'Enter your new password' },
  { label: 'Confirm New Password', key: 'passwordConfirm', type: 'password', placeholder: 'Confirm your new password' },
]

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') as { name: string; email: string } | null }
  catch { return null }
}

async function patchProfile(payload: Record<string, string>) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${BASE_URL}/api/auth/profile/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(Object.values(err).flat().join(' ') || 'Failed to update profile.')
  }
  return res.json()
}

async function uploadAvatar(file: File) {
  const token = localStorage.getItem('access_token')
  const form = new FormData()
  form.append('avatar', file)
  const res = await fetch(`${BASE_URL}/api/auth/profile/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload avatar.')
  return res.json()
}

export default function AccountPage() {
  const navigate = useNavigate()
  const cached = getCachedUser()
  const [form, setForm] = useState({
    name: cached?.name ?? '',
    email: cached?.email ?? '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    passwordConfirm: '',
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    authApi.profile().then(r => {
      if ((r.data as any).avatar) setAvatarUrl(cloudinaryUrl((r.data as any).avatar))
    }).catch(() => {})
  }, [])
  const [confirmLogout, setConfirmLogout] = useState(false)

  const showToast = (message: string, type: Toast['type'] = 'success') => setToast({ message, type })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const cancelEdit = () => {
    setEditing(null)
    setForm(f => ({ ...f, currentPassword: '', newPassword: '', passwordConfirm: '' }))
    setToast(null)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const updated = await uploadAvatar(file)
      setAvatarUrl(cloudinaryUrl(updated.avatar))
      showToast('Profile picture updated.')
    } catch (err) {
      showToast(parseError(err, 'Failed to upload picture.'), 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      if (editing === 'password') {
        if (!form.currentPassword.trim()) throw new Error('Current password is required.')
        if (!form.newPassword.trim()) throw new Error('New password is required.')
        if (form.newPassword !== form.passwordConfirm) throw new Error('Passwords do not match.')
        payload.current_password = form.currentPassword.trim()
        payload.new_password = form.newPassword.trim()
        payload.password_confirm = form.passwordConfirm.trim()
      } else if (editing) {
        const val = form[editing as keyof typeof form].trim()
        if (!val) throw new Error('Field cannot be empty.')
        payload[editing] = val
      }
      if (!Object.keys(payload).length) { showToast('No changes to save.', 'error'); return }
      const updated = await patchProfile(payload)
      localStorage.setItem('majo_user', JSON.stringify({ name: updated.name, email: updated.email, isAdmin: updated.is_staff }))
      showToast('Saved successfully.')
      setEditing(null)
      setForm(f => ({ ...f, currentPassword: '', newPassword: '', passwordConfirm: '' }))
    } catch (err) {
      showToast(parseError(err, 'Failed to update profile.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('majo_user')
    navigate('/')
  }

  const initials = (cached?.name ?? 'ME').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-36 lg:pt-28 pb-24 lg:pb-12 px-4 py-8 max-w-6xl mx-auto">
        <ToastAlert toast={toast} onDone={() => setToast(null)} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] lg:gap-6 xl:gap-8">
          <div>
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-8">
              <button type="button" onClick={() => avatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0 overflow-hidden group">
                {avatarUrl
                  ? <img src={avatarUrl} className="w-full h-full object-cover" />
                  : <span className="text-white text-xl font-extrabold">{initials}</span>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar
                    ? <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <Camera size={18} className="text-white" />}
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div>
                <p className="text-[18px] font-extrabold text-[#071A2B]">{cached?.name ?? 'User'}</p>
                <p className="text-[12px] text-[#64748B]">{cached?.email ?? ''}</p>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-4 mb-8 lg:mb-0">
              {FIELDS.map(({ label, key, type, placeholder }) => {
                const isActive = editing === key
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[13px] font-bold text-[#071A2B]">{label}</label>
                      {!isActive && (
                        <button type="button" onClick={() => setEditing(key)}
                          className="text-[11px] font-bold text-[#1E3A8A] hover:underline">
                          Update
                        </button>
                      )}
                    </div>
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      onChange={set(key)}
                      placeholder={placeholder}
                      readOnly={!isActive}
                      autoFocus={isActive}
                      className={`w-full px-3 py-3 border rounded-xl text-[13px] text-[#071A2B] outline-none transition-colors ${
                        isActive
                          ? 'bg-white border-[#22C55E] focus:border-[#22C55E]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] cursor-default text-[#64748B]'
                      }`}
                    />
                    {isActive && (
                      <div className="flex gap-2 mt-2">
                        <button type="submit" disabled={saving}
                          className="flex-1 bg-[#071A2B] text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60 hover:opacity-90">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEdit}
                          className="flex-1 border border-[#E2E8F0] text-[#64748B] py-2.5 rounded-xl text-[13px] font-bold hover:border-[#071A2B]">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="space-y-4 pt-2 border-t border-[#E2E8F0]">
                {editing !== 'password' && (
                  <button type="button" onClick={() => setEditing('password')}
                    className="w-full py-3 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#071A2B] hover:bg-[#F8FAFC] transition-colors">
                    Change Password
                  </button>
                )}

                {editing === 'password' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-bold text-[#071A2B] mb-1.5">Current Password</label>
                      <input
                        type="password"
                        value={form.currentPassword}
                        onChange={set('currentPassword')}
                        placeholder="Enter your current password"
                        autoFocus
                        className="w-full px-3 py-3 bg-white border border-[#22C55E] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
                      />
                    </div>
                    {form.currentPassword.trim().length > 0 && PASSWORD_FIELDS.map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[13px] font-bold text-[#071A2B] mb-1.5">{label}</label>
                        <input
                          type={type}
                          value={form[key as keyof typeof form]}
                          onChange={set(key)}
                          placeholder={placeholder}
                          className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-[#071A2B] text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60 hover:opacity-90">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={cancelEdit}
                        className="flex-1 border border-[#E2E8F0] text-[#64748B] py-2.5 rounded-xl text-[13px] font-bold hover:border-[#071A2B]">
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          <div className="lg:pt-2">
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
              <p className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest border-b border-[#E2E8F0]">Account Actions</p>
              <Link to="/orders" className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-[#071A2B] hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0]">
                My Orders <span className="text-[#94A3B8]">›</span>
              </Link>
              <Link to="/returns" className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-[#071A2B] hover:bg-[#F8FAFC] transition-colors border-b border-[#E2E8F0]">
                Returns <span className="text-[#94A3B8]">›</span>
              </Link>
              <button onClick={() => setConfirmLogout(true)} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-[#071A2B] hover:bg-[#F8FAFC] transition-colors">
                Logout <span className="text-[#94A3B8]">›</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Logout confirm modal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmLogout(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-2">Log Out?</p>
            <p className="text-[13px] text-[#64748B] mb-6">You will be signed out of your account.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:border-[#071A2B]">
                Cancel
              </button>
              <button onClick={logout}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#071A2B] hover:opacity-90">
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
