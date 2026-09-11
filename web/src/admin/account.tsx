import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BASE_URL } from '../lib/api'
import { parseError } from './ErrorBanner'

type Toast = { message: string; type: 'success' | 'error' }

function ToastAlert({ toast, onDone }: { toast: Toast | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-xl shadow-lg text-[13px] font-bold text-white transition-all ${
      toast.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
    }`}>
      {toast.message}
    </div>
  )
}

type Field = { label: string; key: string; type?: string; placeholder?: string }

const FIELDS: Field[] = [
  { label: 'Full Name', key: 'name', placeholder: 'Your name' },
  { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+256...' },
]

const PASSWORD_FIELDS: Field[] = [
  { label: 'Current Password', key: 'currentPassword', type: 'password', placeholder: 'Enter your current password' },
  { label: 'New Password', key: 'newPassword', type: 'password', placeholder: 'Enter your new password' },
  { label: 'Confirm New Password', key: 'passwordConfirm', type: 'password', placeholder: 'Confirm your new password' },
]

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') as { name: string; email: string } | null }
  catch { return null }
}

async function patchProfile(payload: Record<string, string | boolean>) {
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

async function deleteProfile() {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${BASE_URL}/api/auth/profile/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to delete account.')
}

export default function AdminAccount() {
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
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirmAction, setConfirmAction] = useState<'logout' | 'password' | 'degrade' | 'delete' | null>(null)
  const [confirming, setConfirming] = useState(false)

  const showToast = (message: string, type: Toast['type'] = 'success') => setToast({ message, type })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const cancelEdit = () => {
    setEditing(null)
    setForm(f => ({ ...f, currentPassword: '', newPassword: '', passwordConfirm: '' }))
    setToast(null)
  }

  const showPasswordFields = editing === 'password' && form.currentPassword.trim().length > 0

  const clearSession = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('majo_user')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      if (editing === 'password') {
        if (!form.currentPassword.trim()) throw new Error('Current password is required.')
        if (!form.newPassword.trim()) throw new Error('New password is required.')
        if (!form.passwordConfirm.trim()) throw new Error('Please confirm your new password.')
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

  const handleDegrade = async () => {
    setConfirming(true)
    try {
      await patchProfile({ is_staff: false })
      clearSession()
      navigate('/login')
    } catch { showToast('Failed to degrade account.', 'error') }
    finally { setConfirming(false); setConfirmAction(null) }
  }

  const handleDelete = async () => {
    setConfirming(true)
    try {
      await deleteProfile()
      clearSession()
      navigate('/')
    } catch { showToast('Failed to delete account.', 'error') }
    finally { setConfirming(false); setConfirmAction(null) }
  }

  const logout = () => { showToast('Logged out.'); setTimeout(() => { clearSession(); navigate('/login') }, 800) }

  const CONFIRM_CONFIG: Record<string, { title: string; body: string; label: string; color: string; onConfirm: () => void }> = {
    logout: {
      title: 'Log Out?',
      body: 'You will be signed out of your admin account.',
      label: 'Yes, Logout',
      color: 'bg-[#071A2B] hover:opacity-90',
      onConfirm: () => { setConfirmAction(null); logout() },
    },
    password: {
      title: 'Change Password?',
      body: 'You are about to change your account password. Make sure you remember the new one.',
      label: 'Yes, Continue',
      color: 'bg-[#1E3A8A] hover:opacity-90',
      onConfirm: () => { setConfirmAction(null); setEditing('password') },
    },
    degrade: {
      title: 'Degrade Account?',
      body: 'This will remove your admin privileges. You will be logged out and become a regular user.',
      label: 'Yes, Degrade',
      color: 'bg-amber-500 hover:bg-amber-600',
      onConfirm: handleDegrade,
    },
    delete: {
      title: 'Delete Account?',
      body: 'This will permanently delete your account and all data. This cannot be undone.',
      label: 'Yes, Delete',
      color: 'bg-red-500 hover:bg-red-600',
      onConfirm: handleDelete,
    },
  }

  const initials = (cached?.name ?? 'AD').slice(0, 2).toUpperCase()

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
      <ToastAlert toast={toast} onDone={() => setToast(null)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] lg:gap-6 xl:gap-8">
        <div>
          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-extrabold">{initials}</span>
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-[#071A2B]">{cached?.name ?? 'Admin'}</p>
              <p className="text-[12px] text-[#64748B]">{cached?.email ?? ''}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded-full">Admin Account</span>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="space-y-4 mb-8 lg:mb-0">
            {FIELDS.map(({ label, key, type = 'text', placeholder }) => {
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
                <button type="button" onClick={() => setConfirmAction('password')}
                  className="w-full py-3 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#071A2B] hover:bg-[#F8FAFC] transition-colors">
                  Change Password
                </button>
              )}

              {editing === 'password' ? (
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
                  {showPasswordFields && (
                    <>
                      {PASSWORD_FIELDS.slice(1).map(({ label, key, type = 'text', placeholder }) => (
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
                    </>
                  )}
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
              ) : null}
            </div>
          </form>
        </div>

        <div className="lg:pt-2">
          {/* Account actions */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
            <p className="px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest border-b border-[#E2E8F0]">Account Actions</p>
            <button onClick={() => setConfirmAction('logout')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-[#071A2B] hover:bg-[#F8FAFC] border-b border-[#E2E8F0] transition-colors">
              Logout <span className="text-[#94A3B8]">›</span>
            </button>
            <button onClick={() => setConfirmAction('degrade')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-amber-600 hover:bg-amber-50 border-b border-[#E2E8F0] transition-colors">
              Degrade to Regular User <span className="text-amber-400">›</span>
            </button>
            <button onClick={() => setConfirmAction('delete')} className="w-full flex items-center justify-between px-4 py-3.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
              Delete Account <span className="text-red-300">›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (() => {
        const cfg = CONFIRM_CONFIG[confirmAction]
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => !confirming && setConfirmAction(null)} />
            <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
              <p className="text-[16px] font-extrabold text-[#071A2B] mb-2">{cfg.title}</p>
              <p className="text-[13px] text-[#64748B] mb-6">{cfg.body}</p>
              <div className="flex gap-3">
                <button disabled={confirming} onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:border-[#071A2B] disabled:opacity-50">
                  Cancel
                </button>
                <button disabled={confirming} onClick={cfg.onConfirm}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 ${cfg.color}`}>
                  {confirming ? 'Please wait...' : cfg.label}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
