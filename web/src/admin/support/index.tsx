import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { supportChatApi, type SupportConversationDetail, type SupportConversationSummary } from '../../lib/api'

const formatTime = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function AdminSupport() {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([])
  const [conversation, setConversation] = useState<SupportConversationDetail | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const loadInbox = async () => {
      try {
        const { data } = await supportChatApi.adminConversations()
        if (active) {
          setConversations(data)
          setError('')
        }
      } catch {
        if (active) setError('Could not load the support inbox.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadInbox()
    const timer = window.setInterval(loadInbox, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (selectedId === null) {
      setConversation(null)
      return
    }
    let active = true
    const loadConversation = async () => {
      try {
        const { data } = await supportChatApi.adminConversation(selectedId)
        if (active) {
          setConversation(data)
          setError('')
        }
      } catch {
        if (active) setError('Could not load this conversation.')
      }
    }
    void loadConversation()
    const timer = window.setInterval(loadConversation, 4000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [selectedId])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation?.messages])

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || selectedId === null || sending) return
    setSending(true)
    setError('')
    try {
      await supportChatApi.sendAdminReply(selectedId, body)
      setDraft('')
      const { data } = await supportChatApi.adminConversation(selectedId)
      setConversation(data)
      const inbox = await supportChatApi.adminConversations()
      setConversations(inbox.data)
    } catch {
      setError('Reply could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const visibleConversations = conversations.filter(item =>
    `${item.user_name} ${item.user_email} ${item.last_message?.body ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase())
  )

  return (
    <div className="flex h-full min-h-[520px] flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#168348]">Customer care</p>
          <h1 className="mt-1 text-[22px] font-extrabold text-[#071A2B]">Support inbox</h1>
        </div>
        <button type="button" onClick={() => window.location.reload()} title="Refresh inbox" aria-label="Refresh inbox" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE5EB] bg-white text-[#475569] hover:bg-[#F4F7F8]">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-[#DCE5EB] bg-white md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${selectedId !== null ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-[#E2E8F0]`}>
          <div className="border-b border-[#E2E8F0] p-3">
            <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full rounded-lg border border-[#DCE5EB] px-3 py-2.5 text-[12px] outline-none focus:border-[#25D366]" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && <p className="p-5 text-center text-[12px] text-[#64748B]">Loading inbox...</p>}
            {!loading && visibleConversations.length === 0 && <div className="px-5 py-12 text-center"><MessageCircle size={24} className="mx-auto text-[#94A3B8]" /><p className="mt-3 text-[13px] font-semibold text-[#334155]">No conversations yet</p></div>}
            {visibleConversations.map(item => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC] ${selectedId === item.id ? 'bg-[#EFF8F2]' : ''}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-[#071A2B]">{item.user_name}</span>
                  {item.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[10px] font-bold text-white">{item.unread_count}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[#64748B]">{item.user_email}</span>
                <span className="mt-2 block truncate text-[11px] text-[#475569]">{item.last_message?.body ?? 'No messages yet'}</span>
                <span className="mt-1 block text-[9px] text-[#94A3B8]">{formatTime(item.updated_at)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${selectedId !== null ? 'flex' : 'hidden md:flex'} min-h-0 flex-col bg-[#F4F7F8]`}>
          {!conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center text-[#64748B]">
              <MessageCircle size={32} />
              <p className="mt-3 text-[13px]">Choose a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3">
                <button type="button" onClick={() => setSelectedId(null)} aria-label="Back to conversations" className="rounded-lg p-2 text-[#475569] hover:bg-[#F1F5F9] md:hidden"><ArrowLeft size={18} /></button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DDF5E6] text-[12px] font-extrabold text-[#168348]">{conversation.user_name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#071A2B]">{conversation.user_name}</p>
                  <p className="truncate text-[10px] text-[#64748B]">{conversation.user_email}</p>
                </div>
              </header>

              <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
                {conversation.messages.map(message => (
                  <div key={message.id} className={`flex ${message.is_staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${message.is_staff ? 'rounded-br-sm bg-[#DDF5E6] text-[#071A2B]' : 'rounded-bl-sm bg-white text-[#071A2B] shadow-sm'}`}>
                      <p className="mb-1 text-[10px] font-bold text-[#168348]">{message.is_staff ? 'You' : message.sender_name}</p>
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.body}</p>
                      <time className="mt-1 block text-right text-[9px] text-[#64748B]">{formatTime(message.created_at)}</time>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p role="alert" className="border-t border-red-100 bg-white px-4 py-2 text-[11px] text-red-600">{error}</p>}
              <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-[#E2E8F0] bg-white p-3">
                <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }} maxLength={2000} rows={1} aria-label="Write a reply" placeholder="Write a reply..." className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-[#DCE5EB] px-3 py-3 text-[13px] leading-5 outline-none focus:border-[#25D366]" />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send reply" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071A2B] text-white transition hover:bg-[#0F2B43] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /></button>
              </form>
            </>
          )}
        </section>
      </div>
      {error && !conversation && <p role="alert" className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
