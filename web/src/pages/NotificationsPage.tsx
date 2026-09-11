import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useNotifications, type Notification } from '../lib/NotificationContext'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead, markSelectedRead, deleteNotification, deleteSelected } = useNotifications()
  const [selected, setSelected] = useState<string[]>([])
  const selecting = selected.length > 0

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleClick = (n: Notification) => {
    if (selecting) { toggle(n.id); return }
    markRead(n.id)
    navigate(`/notifications/${n.slug}`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          {selecting ? (
            <>
              <button onClick={() => setSelected([])} className="p-1"><X size={20} color="#071A2B" /></button>
              <span className="text-[15px] font-extrabold text-[#071A2B]">{selected.length} selected</span>
              <div className="flex items-center gap-4">
                <button onClick={() => { markSelectedRead(selected); setSelected([]) }} title="Mark selected read">
                  <CheckCheck size={20} color="#22C55E" />
                </button>
                <button onClick={() => { deleteSelected(selected); setSelected([]) }} title="Delete selected">
                  <Trash2 size={20} color="#ef4444" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Bell size={22} color="#071A2B" />
                <h1 className="text-[20px] font-extrabold text-[#071A2B]">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all as read"><CheckCheck size={20} color="#22C55E" /></button>
              )}
            </>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <Bell size={44} color="#E2E8F0" />
            <p className="text-[17px] font-extrabold text-[#071A2B]">No notifications yet</p>
            <p className="text-[13px] text-[#64748B]">You'll see order updates, offers, and more here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map(n => {
              const isSelected = selected.includes(n.id)
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  onContextMenu={e => { e.preventDefault(); toggle(n.id) }}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                    ${!n.read ? 'border-green-300 bg-green-50' : 'border-[#E2E8F0] bg-white'}
                    ${isSelected ? 'border-indigo-400 bg-indigo-50' : ''}
                    hover:shadow-sm`}
                >
                  {selecting && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                      ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[#CBD5E1]'}`}>
                      {isSelected && <CheckCheck size={11} color="#fff" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-bold text-[#071A2B] truncate">{n.title}</p>
                      <span className="text-[11px] text-[#94A3B8] shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[12px] text-[#64748B] mt-0.5 line-clamp-2">{n.body.split('|')[0]}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    {!selecting && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                        className="text-[#CBD5E1] hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
