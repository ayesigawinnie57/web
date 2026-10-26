import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, LockKeyhole, Send, ShieldCheck } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../theme'
import { useAuth } from '../lib/AuthContext'
import {
  supportChatApi,
  type SupportEncryptionKey,
  type SupportMessage,
} from '../../lib/api'
import {
  createSupportEnvelope,
  getOrCreateSupportIdentity,
  getSupportSafetyCode,
  getSupportVerification,
  setSupportVerification,
  tryDecryptSupportEnvelope,
} from '../../lib/supportEncryption'
import type { SupportDeviceIdentity, SupportPublicKey } from '../../../shared/supportEncryption'

type ConversationSummary = {
  id: number
  user_id: number
  user_name: string
  user_email: string
  unread_count: number
  updated_at: string
}

type ConversationDetail = {
  id: number
  user_id: number
  user_name: string
  user_email: string
  messages: SupportMessage[]
}

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

export default function AdminSupportScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, ready } = useAuth()
  const [identity, setIdentity] = useState<SupportDeviceIdentity | null>(null)
  const [ownKeyId, setOwnKeyId] = useState('')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [keys, setKeys] = useState<SupportEncryptionKey[]>([])
  const [safetyCode, setSafetyCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready || !user?.is_staff) return
    let active = true
    const prepare = async () => {
      try {
        const currentIdentity = await getOrCreateSupportIdentity(user.id)
        const { data: ownKey } = await supportChatApi.registerEncryptionKey(currentIdentity.deviceId, currentIdentity.publicKey)
        if (!active) return
        setIdentity(currentIdentity)
        setOwnKeyId(ownKey.key_id)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not prepare the support encryption key.')
      }
    }
    void prepare()
    return () => { active = false }
  }, [ready, user])

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await supportChatApi.adminConversations()
      setConversations(data)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the support inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !user?.is_staff) return
    void loadConversations()
    const timer = setInterval(() => { void loadConversations() }, 5000)
    return () => clearInterval(timer)
  }, [ready, user, loadConversations])

  useEffect(() => {
    if (selectedId === null || selectedUserId === null || !identity || !ownKeyId) {
      setConversation(null)
      setKeys([])
      setSafetyCode('')
      setVerified(false)
      return
    }
    let active = true
    const loadConversation = async () => {
      try {
        const [conversationResponse, keyResponse] = await Promise.all([
          supportChatApi.adminConversation(selectedId),
          supportChatApi.encryptionKeys(selectedUserId),
        ])
        const currentKeys = keyResponse.data.keys
        const code = getSupportSafetyCode(currentKeys)
        if (!currentKeys.some(key => key.key_id === ownKeyId && key.is_staff)) {
          throw new Error('This support device key is missing from the recipient list.')
        }
        if (!currentKeys.some(key => !key.is_staff)) {
          throw new Error('The customer has no registered encryption key.')
        }
        const messages = (conversationResponse.data.messages as SupportMessage[]).map(message => ({
          ...message,
          body: messageBody(message, ownKeyId, identity, currentKeys),
        }))
        if (!active) return
        setKeys(currentKeys)
        setSafetyCode(code)
        const previouslyVerified = await getSupportVerification(selectedUserId)
        if (!active) return
        setVerified(previouslyVerified === code)
        setConversation({ ...conversationResponse.data, messages })
        setError('')
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the encrypted conversation.')
      }
    }
    void loadConversation()
    const timer = setInterval(() => { void loadConversation() }, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [selectedId, selectedUserId, identity, ownKeyId])

  const selectConversation = (id: number | null) => {
    setSelectedId(id)
    setSelectedUserId(id === null ? null : conversations.find(item => item.id === id)?.user_id ?? null)
    setConversation(null)
    setDraft('')
  }

  const verify = () => {
    if (!conversation) return
    Alert.alert(
      'Verify the safety code',
      'Only continue if you compared the entire code with this customer using a separate trusted channel.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I compared it', onPress: () => {
          void setSupportVerification(conversation.user_id, safetyCode).then(() => setVerified(true)).catch(cause =>
            setError(cause instanceof Error ? cause.message : 'Could not save verification on this device.'),
          )
        } },
      ],
    )
  }

  const sendReply = async () => {
    const body = draft.trim()
    if (!body || !conversation || !identity || !ownKeyId || sending) return
    setSending(true)
    setError('')
    try {
      const { data } = await supportChatApi.encryptionKeys(conversation.user_id)
      const currentKeys = data.keys
      const currentCode = getSupportSafetyCode(currentKeys)
      if (!currentKeys.some(key => key.key_id === ownKeyId && key.is_staff) || !currentKeys.some(key => !key.is_staff)) {
        throw new Error('The recipient-key roster is incomplete; the encrypted reply was not sent.')
      }
      if (!verified || await getSupportVerification(conversation.user_id) !== currentCode) {
        setKeys(currentKeys)
        setSafetyCode(currentCode)
        setVerified(false)
        throw new Error('The encryption-key roster changed or is not verified. Compare the safety code before replying.')
      }
      setKeys(currentKeys)
      setSafetyCode(currentCode)
      const envelope = createSupportEnvelope(body, ownKeyId, identity, currentKeys)
      await supportChatApi.sendAdminReply(conversation.id, envelope)
      setDraft('')
      await loadConversations()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The encrypted reply could not be sent.')
    } finally {
      setSending(false)
    }
  }

  if (!ready) return <View style={styles.center}><ActivityIndicator color={C.green} /></View>
  if (!user?.is_staff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} title="Support inbox" />
        <View style={styles.center}><Text style={styles.title}>Authorized support staff only</Text></View>
      </View>
    )
  }
  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} /></View>

  const selectedSummary = conversations.find(item => item.id === selectedId)
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={() => selectedId === null ? router.back() : selectConversation(null)} title={selectedId === null ? 'Support inbox' : selectedSummary?.user_name ?? 'Conversation'} />
      {selectedId === null ? (
        <ScrollView contentContainerStyle={styles.conversationList}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {conversations.length === 0 && !loading ? <Text style={styles.empty}>No support conversations yet.</Text> : null}
          {conversations.map(item => (
            <TouchableOpacity key={item.id} style={styles.conversationRow} onPress={() => selectConversation(item.id)}>
              <View style={styles.rowTop}>
                <Text style={styles.customerName}>{item.user_name}</Text>
                {item.unread_count > 0 && <Text style={styles.unread}>{item.unread_count}</Text>}
              </View>
              <Text style={styles.email}>{item.user_email}</Text>
              <Text style={styles.rowDate}>{new Date(item.updated_at).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.messages}>
            {selectedSummary && <Text style={styles.email}>{selectedSummary.user_email}</Text>}
            <View style={styles.securityCard}>
              <ShieldCheck size={18} color={C.green} />
              <Text style={styles.securityTitle}>End-to-end encrypted</Text>
              <Text style={styles.securityCopy}>This conversation is private and end-to-end encrypted. Only the customer and authorized Majo Support staff can read its messages. Encrypted copies are stored to preserve chat history; people outside the support team cannot read them.</Text>
              <Text style={styles.securityCopy}>Compare this code with the customer through a separate trusted channel before replying.</Text>
              <Text style={styles.securityCopy}>Email-and-password sign-in keeps an encrypted key backup. A password reset cannot unlock the old backup.</Text>
              <Text selectable style={styles.safetyCode}>{safetyCode || 'Loading safety code…'}</Text>
              {!verified
                ? <TouchableOpacity style={styles.button} onPress={verify}><Text style={styles.buttonText}>I compared and verified the code</Text></TouchableOpacity>
                : <Text style={styles.verified}>Safety code verified on this device</Text>}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {conversation?.messages.map(message => (
              <View key={message.id} style={[styles.message, message.is_staff ? styles.staffMessage : styles.customerMessage]}>
                {!message.is_staff && <Text style={styles.sender}>{message.sender_name}</Text>}
                <Text style={message.is_staff ? styles.staffBody : styles.customerBody}>{message.body}</Text>
                <Text style={styles.time}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 64 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!!identity}
              maxLength={2000}
              multiline
              placeholder={verified ? 'Write an encrypted reply…' : 'Write a draft; verify the safety code to reply'}
              placeholderTextColor={C.mutedLight}
              style={styles.input}
            />
            <TouchableOpacity disabled={!verified || !draft.trim() || sending} onPress={() => void sendReply()} style={[styles.sendButton, (!verified || !draft.trim() || sending) && styles.disabled]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Send size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} accessibilityLabel="Go back"><ArrowLeft size={22} color={C.navy} /></TouchableOpacity>
      <View style={styles.headerTitle}><LockKeyhole size={17} color={C.green} /><Text numberOfLines={1} style={styles.title}>{title}</Text></View>
      <View style={{ width: 22 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  title: { color: C.navy, fontSize: 17, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  conversationList: { padding: 14, gap: 10 },
  conversationRow: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customerName: { color: C.navy, fontSize: 14, fontWeight: '800' },
  email: { color: C.muted, fontSize: 11, marginTop: 3 },
  rowDate: { color: C.mutedLight, fontSize: 9, marginTop: 8 },
  unread: { color: '#fff', backgroundColor: C.green, fontSize: 10, fontWeight: '800', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  empty: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 30 },
  messages: { padding: 14, gap: 12 },
  securityCard: { alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, padding: 14, marginBottom: 6 },
  securityTitle: { color: '#166534', fontSize: 13, fontWeight: '800' },
  securityCopy: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  safetyCode: { color: C.navy, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  verified: { color: C.green, fontSize: 11, fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 18, textAlign: 'center', padding: 8 },
  message: { maxWidth: '88%', borderRadius: 14, padding: 12 },
  staffMessage: { alignSelf: 'flex-end', backgroundColor: C.navy },
  customerMessage: { alignSelf: 'flex-start', backgroundColor: C.card },
  sender: { color: C.green, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  staffBody: { color: '#fff', fontSize: 13, lineHeight: 19 },
  customerBody: { color: C.navy, fontSize: 13, lineHeight: 19 },
  time: { color: C.mutedLight, fontSize: 9, textAlign: 'right', marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.navy, fontSize: 13 },
  sendButton: { height: 44, width: 44, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  button: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
})
