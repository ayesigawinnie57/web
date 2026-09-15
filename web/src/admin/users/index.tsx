import { useEffect, useState } from 'react'
import { Users, ShieldCheck, User, Search, Trash2 } from 'lucide-react'
import { adminUsersApi, type ApiAdminUser } from '../../lib/api'

function UserRow({ u, confirmId, deletingId, onDelete, onConfirm, onCancel }: {
  u: ApiAdminUser
  confirmId: number | null
  deletingId: number | null
  onDelete: (id: number) => void
  onConfirm: (id: number) => void
  onCancel: () => void
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
      {u.avatar
        ? <img src={u.avatar} className="w-11 h-11 rounded-full object-cover shrink-0" />
        : <div className="w-11 h-11 rounded-full bg-[#F8FAFC] flex items-center justify-center shrink-0"><User size={18} color="#94A3B8" /></div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-[#071A2B] truncate">{u.name}</p>
          {u.is_staff && (
            <span className="flex items-center gap-1 bg-[#6366f118] text-[#6366f1] text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
              <ShieldCheck size={10} /> Staff
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#64748B] truncate">{u.email}</p>
        {u.phone && <p className="text-[11px] text-[#94A3B8]">{u.phone}</p>}
      </div>
      <p className="text-[11px] text-[#94A3B8] shrink-0">{new Date(u.created_at).toLocaleDateString()}</p>

      {confirmId === u.id ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onDelete(u.id)}
            disabled={deletingId === u.id}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deletingId === u.id ? '...' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConfirm(u.id)}
          className="shrink-0 p-2 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ApiAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'staff'>('users')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => {
    adminUsersApi.list()
      .then(({ data }) => setUsers(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await adminUsersApi.delete(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch {}
    setDeletingId(null)
    setConfirmId(null)
  }

  const normalUsers = users.filter(u => !u.is_staff)
  const staffUsers  = users.filter(u => u.is_staff)
  const list        = tab === 'staff' ? staffUsers : normalUsers

  const filtered = search.trim()
    ? list.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : list

  const tabs = [
    { key: 'users' as const, label: 'Users',  count: normalUsers.length },
    { key: 'staff' as const, label: 'Staff',  count: staffUsers.length  },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <Users size={20} color="#071A2B" />
        <h1 className="text-xl font-extrabold text-[#071A2B]">Users</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); setConfirmId(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
              tab === t.key
                ? 'bg-white text-[#071A2B] shadow-sm'
                : 'text-[#64748B] hover:text-[#071A2B]'
            }`}
          >
            {t.key === 'staff' ? <ShieldCheck size={13} /> : <User size={13} />}
            {t.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${
              tab === t.key ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-white text-[#94A3B8]'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 mb-6">
        <Search size={14} color="#94A3B8" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          className="flex-1 text-[13px] text-[#071A2B] outline-none bg-transparent placeholder:text-[#CBD5E1]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#64748B] text-[14px] py-20">No {tab} found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(u => (
            <UserRow
              key={u.id}
              u={u}
              confirmId={confirmId}
              deletingId={deletingId}
              onDelete={handleDelete}
              onConfirm={setConfirmId}
              onCancel={() => setConfirmId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
