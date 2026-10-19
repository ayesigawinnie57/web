import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircleMore, Send, X } from 'lucide-react'
import { supportChatApi, type SupportMessage } from '../lib/api'

export default function FloatingChatButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem('access_token'))

  useEffect(() => {
    const updateAuth = () => setAuthenticated(!!localStorage.getItem('access_token'))
    window.addEventListener('majo-auth-changed', updateAuth)
    window.addEventListener('storage', updateAuth)
    return () => {
      window.removeEventListener('majo-auth-changed', updateAuth)
      window.removeEventListener('storage', updateAuth)
    }
  }, [])

  useEffect(() => {
    const isPortal = location.pathname.startsWith('/admin') || location.pathname.startsWith('/trader')
    if (!authenticated || isPortal) return
    let active = true
    const loadMessages = async () => {
      try {
        const { data } = await supportChatApi.customerChat(open)
        if (active) {
          setMessages(data.messages)
          setUnreadCount(data.unread_count)
          setError('')
        }
      } catch {
        if (active) setError('Could not load the conversation. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    setLoading(open && messages.length === 0)
    void loadMessages()
    const timer = window.setInterval(loadMessages, open ? 4000 : 7000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [open, authenticated, location.pathname])

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      await supportChatApi.sendCustomerMessage(body)
      setDraft('')
      const { data } = await supportChatApi.customerChat(true)
      setMessages(data.messages)
    } catch {
      setError('Message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const loginNext = `${location.pathname}${location.search}`

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/trader')) return null

  return (
    <>
      {open && (
        <section className="fixed bottom-[88px] right-4 z-[80] flex h-[min(600px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#DCE5EB] bg-white shadow-[0_24px_70px_rgba(7,26,43,0.24)] sm:right-6" aria-label="Customer support chat">
          <header className="flex items-center justify-between bg-[#071A2B] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]">
                <MessageCircleMore size={20} />
              </div>
              <div>
                <p className="text-[14px] font-bold">Majo Support</p>
                <p className="text-[11px] text-white/65">We usually reply as soon as possible</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </header>

          {!authenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <MessageCircleMore size={34} className="text-[#25D366]" />
              <h2 className="mt-4 text-[17px] font-extrabold text-[#071A2B]">Sign in to chat with us</h2>
              <p className="mt-2 text-[13px] leading-6 text-[#64748B]">Your conversation will be saved to your account so our team can follow up.</p>
              <Link to={`/login?next=${encodeURIComponent(loginNext)}`} onClick={() => setOpen(false)} className="mt-5 rounded-xl bg-[#071A2B] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]">
                Sign in to continue
              </Link>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F4F7F8] px-4 py-4" aria-live="polite">
                <div className="mx-auto mb-4 max-w-[260px] rounded-xl bg-white px-3 py-2 text-center text-[11px] leading-5 text-[#64748B] shadow-sm">
                  Send us a message and our support team will reply here.
                </div>
                {loading && <p className="py-8 text-center text-[12px] text-[#64748B]">Loading conversation...</p>}
                {!loading && messages.length === 0 && <p className="py-8 text-center text-[12px] text-[#64748B]">Your conversation starts with your first message.</p>}
                {messages.map(message => (
                  <div key={message.id} className={`flex ${message.is_staff ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 ${message.is_staff ? 'rounded-bl-sm bg-white text-[#071A2B] shadow-sm' : 'rounded-br-sm bg-[#25D366] text-[#062B16]'}`}>
                      {message.is_staff && <p className="mb-1 text-[10px] font-bold text-[#178343]">{message.sender_name}</p>}
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.body}</p>
                      <time className="mt-1 block text-right text-[9px] opacity-60">{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                  </div>
                ))}
              </div>
              {error && <p role="alert" className="px-4 py-2 text-[11px] text-red-600">{error}</p>}
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-[#E2E8F0] bg-white p-3">
                <textarea
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  maxLength={2000}
                  rows={1}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-[#DCE5EB] px-3 py-3 text-[13px] leading-5 outline-none focus:border-[#25D366]"
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition hover:bg-[#1ebc5f] disabled:cursor-not-allowed disabled:opacity-50">
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        aria-expanded={open}
        className="group fixed bottom-5 right-5 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_40px_rgba(37,211,102,0.35)] transition duration-200 hover:-translate-y-1 hover:scale-105 sm:right-6"
      >
        {!open && <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-[#25D366] opacity-20 motion-reduce:animate-none animate-ping" />}
        {open ? <X className="h-6 w-6" /> : <MessageCircleMore className="h-6 w-6" />}
        {!open && unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E5484D] px-1 text-[9px] font-extrabold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
    </>
  )
}
