import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, MessageCircle, RefreshCw, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { authApi, supportChatApi, type SupportConversationDetail, type SupportConversationSummary, type SupportMessage } from '../../lib/api'
import TypingIndicator from '../../components/TypingIndicator'
import {
  createSupportEnvelope,
  getOrCreateSupportIdentity,
  tryDecryptSupportEnvelope,
} from '../../lib/supportEncryption'
import type { SupportDeviceIdentity, SupportPublicKey } from '../../../../shared/supportEncryption'

const formatTime = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

const messageBody = (
  message: SupportMessage,
  recipientKeyId: string,
  identity: SupportDeviceIdentity,
  keys: SupportPublicKey[],
) => {
  if (message.encryption_version !== 1) return `[Legacy message — not end-to-end encrypted]\n${message.body}`
  const decrypted = tryDecryptSupportEnvelope(message.body, recipientKeyId, identity, keys)
  return decrypted.ok ? decrypted.plaintext : `[Unable to decrypt on this device: ${decrypted.reason}]`
}

export default function AdminSupport() {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([])
  const [conversation, setConversation] = useState<SupportConversationDetail | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [cryptoIdentity, setCryptoIdentity] = useState<SupportDeviceIdentity | null>(null)
  const [ownKeyId, setOwnKeyId] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const typingHeartbeat = useRef<number | null>(null)
  const typingTimeout = useRef<number | null>(null)
  const typingActive = useRef(false)

  useEffect(() => {
    let active = true
    const prepareStaffKey = async () => {
      const { data: user } = await authApi.profile()
      const identity = await getOrCreateSupportIdentity(user.id)
      const { data: key } = await supportChatApi.registerEncryptionKey(identity.deviceId, identity.publicKey)
      if (active) {
        setCryptoIdentity(identity)
        setOwnKeyId(key.key_id)
      }
    }
    void prepareStaffKey().catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not prepare the support encryption key.')
    })
    return () => { active = false }
  }, [])

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
    if (selectedId === null || selectedUserId === null || !cryptoIdentity || !ownKeyId) {
      setConversation(null)
      return
    }
    let active = true
    const updatePresence = (isViewing: boolean) => {
      void supportChatApi.setAdminViewing(selectedId, isViewing).catch(cause => {
        if (active && isViewing) {
          setError(cause instanceof Error ? cause.message : 'Could not update support presence.')
        }
      })
    }
    const loadConversation = async () => {
      try {
        const [conversationResponse, keyResponse] = await Promise.all([
          supportChatApi.adminConversation(selectedId),
          supportChatApi.encryptionKeys(selectedUserId),
        ])
        const keys = keyResponse.data.keys
        const ownKey = keys.find(key => key.key_id === ownKeyId && key.is_staff)
        if (!ownKey) throw new Error('This support device key is missing from the recipient list.')
        if (!keys.some(key => !key.is_staff)) throw new Error('The customer has no registered encryption key on this device.')
        const messages = conversationResponse.data.messages.map((message: SupportConversationDetail['messages'][number]) => ({
          ...message,
          body: messageBody(message, ownKeyId, cryptoIdentity, keys),
        }))
        if (active) {
          setConversation({ ...conversationResponse.data, messages })
          setError('')
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the encrypted conversation.')
      }
    }
    void loadConversation()
    const timer = window.setInterval(loadConversation, 4000)
    return () => {
      active = false
      window.clearInterval(timer)
      updatePresence(false)
    }
  }, [selectedId, selectedUserId, cryptoIdentity, ownKeyId])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation?.messages])

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || selectedId === null || sending) return
    stopTyping()
    setSending(true)
    setError('')
    try {
      if (!conversation || !cryptoIdentity || !ownKeyId) throw new Error('Select a conversation and prepare the support encryption key before replying.')
      const { data: keyDirectory } = await supportChatApi.encryptionKeys(conversation.user_id)
      const currentKeys = keyDirectory.keys
      if (!currentKeys.some(key => key.key_id === ownKeyId && key.is_staff) || !currentKeys.some(key => !key.is_staff)) {
        throw new Error('The recipient-key roster is incomplete; the encrypted reply was not sent.')
      }
      const envelope = createSupportEnvelope(body, ownKeyId, cryptoIdentity, currentKeys)
      await supportChatApi.sendAdminReply(selectedId, envelope)
      setDraft('')
      const { data } = await supportChatApi.adminConversation(selectedId)
      const messages = data.messages.map((message: SupportConversationDetail['messages'][number]) => ({
        ...message,
        body: messageBody(message, ownKeyId, cryptoIdentity, currentKeys),
      }))
      setConversation({ ...data, messages })
      const inbox = await supportChatApi.adminConversations()
      setConversations(inbox.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reply could not be encrypted and sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const stopTyping = () => {
    if (typingHeartbeat.current !== null) window.clearInterval(typingHeartbeat.current)
    if (typingTimeout.current !== null) window.clearTimeout(typingTimeout.current)
    typingHeartbeat.current = null
    typingTimeout.current = null
    if (typingActive.current && selectedId !== null) {
      typingActive.current = false
      void supportChatApi.setAdminTyping(selectedId, false).catch(() => {})
    }
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    if (!value.trim() || selectedId === null) {
      stopTyping()
      return
    }
    if (!typingActive.current) {
      typingActive.current = true
      void supportChatApi.setAdminTyping(selectedId, true).catch(() => {})
      typingHeartbeat.current = window.setInterval(() => {
        void supportChatApi.setAdminTyping(selectedId, true).catch(() => {})
      }, 3000)
    }
    if (typingTimeout.current !== null) window.clearTimeout(typingTimeout.current)
    typingTimeout.current = window.setTimeout(stopTyping, 4500)
  }

  const updateConversationClosed = async (isClosed: boolean) => {
    if (!conversation) return
    setError('')
    try {
      await supportChatApi.setAdminConversationClosed(conversation.id, isClosed)
      const inbox = await supportChatApi.adminConversations()
      setConversations(inbox.data)
      if (isClosed) {
        stopTyping()
        setSelectedId(null)
        setSelectedUserId(null)
        setConversation(null)
        setDraft('')
      } else {
        setConversation({ ...conversation, is_closed: false })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the conversation status.')
    }
  }

  useEffect(() => () => {
    if (typingHeartbeat.current !== null) window.clearInterval(typingHeartbeat.current)
    if (typingTimeout.current !== null) window.clearTimeout(typingTimeout.current)
    if (typingActive.current && selectedId !== null) void supportChatApi.setAdminTyping(selectedId, false).catch(() => {})
  }, [selectedId])

  const visibleConversations = conversations.filter(item =>
    item.is_closed === showClosed
    && `${item.user_name} ${item.user_email}`.toLowerCase().includes(filter.trim().toLowerCase())
  )
  const closedConversationCount = conversations.filter(item => item.is_closed).length

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col p-4 md:h-full md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#168348]">Customer care</p>
          <h1 className="mt-1 text-[22px] font-extrabold text-[#071A2B]">Support inbox</h1>
        </div>
        <button type="button" onClick={() => window.location.reload()} title="Refresh inbox" aria-label="Refresh inbox" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE5EB] bg-white text-[#475569] hover:bg-[#F4F7F8]">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border border-[#DCE5EB] bg-white md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${selectedId !== null ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-col border-r border-[#E2E8F0]`}>
          <div className="border-b border-[#E2E8F0] p-3">
            <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full rounded-lg border border-[#DCE5EB] px-3 py-2.5 text-[12px] outline-none focus:border-[#25D366]" />
            <button type="button" onClick={() => setShowClosed(!showClosed)} className="mt-2 w-full rounded-lg border border-[#DCE5EB] px-3 py-2 text-left text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC]">
              {showClosed ? 'Show open conversations' : `Closed conversations (${closedConversationCount})`}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && <p className="p-5 text-center text-[12px] text-[#64748B]">Loading inbox...</p>}
            {!loading && visibleConversations.length === 0 && <div className="px-5 py-12 text-center"><MessageCircle size={24} className="mx-auto text-[#94A3B8]" /><p className="mt-3 text-[13px] font-semibold text-[#334155]">{showClosed ? 'No closed conversations' : 'No conversations yet'}</p></div>}
            {visibleConversations.map(item => (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setSelectedUserId(item.user_id) }} className={`w-full border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC] ${selectedId === item.id ? 'bg-[#EFF8F2]' : ''}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-[#071A2B]">{item.user_name}</span>
                  {item.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[10px] font-bold text-white">{item.unread_count}</span>}
                </span>
                {item.is_closed && <span className="mt-1 inline-block rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[9px] font-bold text-[#64748B]">Closed</span>}
                <span className="mt-0.5 block truncate text-[10px] text-[#64748B]">{item.user_email}</span>
                <span className="mt-2 block truncate text-[11px] text-[#475569]">{item.last_message?.encryption_version === 1 ? 'End-to-end encrypted message' : item.last_message?.body ?? 'No messages yet'}</span>
                <span className="mt-1 block text-[9px] text-[#94A3B8]">{formatTime(item.updated_at)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${selectedId !== null ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col bg-[#F4F7F8]`}>
          {!conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center text-[#64748B]">
              <MessageCircle size={32} />
              <p className="mt-3 text-[13px]">Choose a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3">
                <button type="button" onClick={() => { setSelectedId(null); setSelectedUserId(null) }} aria-label="Back to conversations" className="rounded-lg p-2 text-[#475569] hover:bg-[#F1F5F9] md:hidden"><ArrowLeft size={18} /></button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DDF5E6] text-[12px] font-extrabold text-[#168348]">{conversation.user_name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#071A2B]">{conversation.user_name}</p>
                  <p className="truncate text-[10px] text-[#64748B]">{conversation.user_email}</p>
                </div>
                {conversation.is_closed && <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold text-[#64748B]">Closed</span>}
                <button
                  type="button"
                  onClick={() => void updateConversationClosed(!conversation.is_closed)}
                  aria-label={conversation.is_closed ? 'Reopen conversation' : 'Close conversation'}
                  title={conversation.is_closed ? 'Reopen conversation' : 'Close conversation'}
                  className="ml-auto rounded-lg p-2 text-[#475569] transition hover:bg-[#F1F5F9] hover:text-[#071A2B]"
                >
                  {conversation.is_closed ? <RotateCcw size={17} /> : <CheckCircle2 size={18} />}
                </button>
              </header>

              <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
                <div className="mx-auto max-w-lg rounded-lg border border-[#BBF7D0] bg-white p-3 text-center">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#166534]"><ShieldCheck size={13} /> End-to-end encrypted</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#64748B]">This conversation is private and end-to-end encrypted. Only the customer and authorized Majo Support staff can read its messages. Encrypted copies are stored to preserve chat history; people outside the support team cannot read them.</p>
                </div>
                {conversation.messages.map(message => (
                  <div key={message.id} className={`flex ${message.is_staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${message.is_staff ? 'rounded-br-sm bg-[#DDF5E6] text-[#071A2B]' : 'rounded-bl-sm bg-white text-[#071A2B] shadow-sm'}`}>
                      <p className="mb-1 text-[10px] font-bold text-[#168348]">{message.is_staff ? 'You' : message.sender_name}</p>
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.body}</p>
                      <time className="mt-1 block text-right text-[9px] text-[#64748B]">{formatTime(message.created_at)}</time>
                    </div>
                  </div>
                ))}
                {conversation.customer_typing && <TypingIndicator label="Customer is typing" />}
              </div>

              {error && <p role="alert" className="border-t border-red-100 bg-white px-4 py-2 text-[11px] text-red-600">{error}</p>}
              {conversation.is_closed ? (
                <p className="border-t border-[#E2E8F0] bg-white px-4 py-3 text-center text-[12px] text-[#64748B]">This conversation is closed. Reopen it to send another reply.</p>
              ) : <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-[#E2E8F0] bg-white p-3">
                <textarea value={draft} onChange={event => handleDraftChange(event.target.value)} onBlur={stopTyping} onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }} maxLength={2000} rows={1} aria-label="Write a reply" placeholder="Write a reply..." className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-[#DCE5EB] px-3 py-3 text-[13px] leading-5 outline-none focus:border-[#25D366]" />
                <button type="submit" disabled={!draft.trim() || sending || !cryptoIdentity} aria-label="Send reply" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071A2B] text-white transition hover:bg-[#0F2B43] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /></button>
              </form>}
            </>
          )}
        </section>
      </div>
      {error && !conversation && <p role="alert" className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
