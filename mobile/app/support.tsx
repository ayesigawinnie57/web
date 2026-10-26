import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, LockKeyhole, Send, ShieldCheck } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from './theme'
import { useAuth } from './lib/AuthContext'
import { supportChatApi, type SupportEncryptionKey, type SupportMessage } from '../lib/api'
import {
  createSupportEnvelope,
  getOrCreateSupportIdentity,
  getSupportSafetyCode,
  getSupportVerification,
  setSupportVerification,
  tryDecryptSupportEnvelope,
} from '../lib/supportEncryption'
import type { SupportDeviceIdentity, SupportPublicKey } from '../../shared/supportEncryption'

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

export default function SupportChatScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, ready } = useAuth()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [identity, setIdentity] = useState<SupportDeviceIdentity | null>(null)
  const [ownKeyId, setOwnKeyId] = useState('')
  const [keys, setKeys] = useState<SupportEncryptionKey[]>([])
  const [staffKeysReady, setStaffKeysReady] = useState(false)
  const [safetyCode, setSafetyCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshMessages = useCallback(async (
    currentIdentity: SupportDeviceIdentity,
    currentKeyId: string,
    userId: number,
  ) => {
    const { data: keyDirectory } = await supportChatApi.encryptionKeys()
    const currentKeys = keyDirectory.keys
    if (!currentKeys.some(key => key.key_id === currentKeyId)) throw new Error('This device encryption key is missing from the roster.')
    const staffReady = currentKeys.some(key => key.is_staff)
    const code = staffReady ? getSupportSafetyCode(currentKeys) : ''
    setKeys(currentKeys)
    setStaffKeysReady(staffReady)
    setSafetyCode(code)
    setVerified(staffReady && await getSupportVerification(userId) === code)
    const { data } = await supportChatApi.customerChat(true)
    setMessages(data.messages.map(message => ({
      ...message,
      body: messageBody(message, currentKeyId, currentIdentity, currentKeys),
    })))
  }, [])

  useEffect(() => {
    if (!ready || !user || user.is_staff) return
    let active = true
    let timer: ReturnType<typeof setInterval> | undefined
    const initialize = async () => {
      try {
        const deviceIdentity = await getOrCreateSupportIdentity(user.id)
        const { data: registered } = await supportChatApi.registerEncryptionKey(deviceIdentity.deviceId, deviceIdentity.publicKey)
        if (!active) return
        setIdentity(deviceIdentity)
        setOwnKeyId(registered.key_id)
        await supportChatApi.startCustomerChat()
        await refreshMessages(deviceIdentity, registered.key_id, user.id)
        if (!active) return
        timer = setInterval(() => {
          void refreshMessages(deviceIdentity, registered.key_id, user.id)
            .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not refresh encrypted messages.') })
        }, 5000)
        setError('')
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not initialize encrypted support chat.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [ready, user, refreshMessages])

  const markVerified = () => {
    if (!user) return
    Alert.alert(
      'Verify the safety code',
      'Only continue if you compared the entire code with Majo Support using a separate trusted channel.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I compared it', onPress: () => {
          void setSupportVerification(user.id, safetyCode).then(() => setVerified(true)).catch(cause =>
            setError(cause instanceof Error ? cause.message : 'Could not save verification on this device.'),
          )
        } },
      ],
    )
  }

  const send = async () => {
    if (!draft.trim() || sending || !user || !identity || !ownKeyId || !staffKeysReady || !verified) return
    setSending(true)
    setError('')
    try {
      const { data } = await supportChatApi.encryptionKeys()
      const currentKeys = data.keys
      const currentCode = getSupportSafetyCode(currentKeys)
      if (await getSupportVerification(user.id) !== currentCode) {
        setSafetyCode(currentCode)
        setKeys(currentKeys)
        setVerified(false)
        throw new Error('The encryption-key roster changed. Compare the new safety code before sending.')
      }
      setKeys(currentKeys)
      setSafetyCode(currentCode)
      const envelope = createSupportEnvelope(draft, ownKeyId, identity, currentKeys)
      await supportChatApi.sendCustomerMessage(envelope)
      setDraft('')
      await refreshMessages(identity, ownKeyId, user.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not encrypt and send the message.')
    } finally {
      setSending(false)
    }
  }

  if (!ready) return <View style={styles.center}><ActivityIndicator color={C.green} /></View>
  if (user?.is_staff) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>Support staff inbox</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/admin/support' as any)}>
            <Text style={styles.buttonText}>Open staff inbox</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>Sign in to contact support</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/login' as any)}>
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={() => router.back()} />
      {loading ? <View style={styles.center}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Preparing encrypted chat…</Text></View> : (
        <>
          <ScrollView contentContainerStyle={styles.messages}>
            <View style={styles.securityCard}>
              <ShieldCheck size={19} color={C.green} />
              <Text style={styles.securityTitle}>End-to-end encrypted</Text>
              <Text style={styles.securityCopy}>Compare this code with Majo Support using a separate trusted channel before sharing sensitive information.</Text>
              <Text selectable style={styles.safetyCode}>{safetyCode}</Text>
              <Text style={styles.recoveryWarning}>On email-and-password sign-in, your chat key is backed up encrypted. Restoring needs your account password; a password reset cannot unlock the old backup.</Text>
              {!staffKeysReady && <Text style={styles.waiting}>You can write a draft now. Support is preparing its encryption key; sending will be available once the safety code is ready and verified.</Text>}
              {staffKeysReady && !verified && <TouchableOpacity style={styles.button} onPress={markVerified}><Text style={styles.buttonText}>I compared and verified the code</Text></TouchableOpacity>}
              {verified && <Text style={styles.verified}>Safety code verified on this device</Text>}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {messages.map(message => (
              <View key={message.id} style={[styles.message, message.is_staff ? styles.staffMessage : styles.customerMessage]}>
                {message.is_staff && <Text style={styles.sender}>{message.sender_name}</Text>}
                <Text style={message.is_staff ? styles.staffBody : styles.customerBody}>{message.body}</Text>
                <Text style={styles.time}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) + 64 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!!identity}
              maxLength={2000}
              multiline
              placeholder={verified ? 'Write a message…' : 'Write a draft; verify the safety code to send'}
              placeholderTextColor={C.mutedLight}
              style={styles.input}
            />
            <TouchableOpacity disabled={!staffKeysReady || !verified || !draft.trim() || sending} onPress={() => void send()} style={[styles.sendButton, (!staffKeysReady || !verified || !draft.trim() || sending) && styles.disabled]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Send size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} accessibilityLabel="Go back"><ArrowLeft size={22} color={C.navy} /></TouchableOpacity>
      <View style={styles.headerTitle}><LockKeyhole size={17} color={C.green} /><Text style={styles.title}>Secure support chat</Text></View>
      <View style={{ width: 22 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.navy, fontSize: 17, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: C.muted, fontSize: 13 },
  messages: { padding: 16, gap: 12 },
  securityCard: { alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, padding: 14, marginBottom: 8 },
  securityTitle: { color: '#166534', fontSize: 13, fontWeight: '800' },
  securityCopy: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  safetyCode: { color: C.navy, fontSize: 13, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  recoveryWarning: { color: '#92400E', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  waiting: { color: '#92400E', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  verified: { color: C.green, fontSize: 11, fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 18, textAlign: 'center', padding: 8 },
  message: { maxWidth: '86%', borderRadius: 14, padding: 12 },
  staffMessage: { alignSelf: 'flex-start', backgroundColor: C.card },
  customerMessage: { alignSelf: 'flex-end', backgroundColor: C.navy },
  sender: { color: C.green, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  staffBody: { color: C.navy, fontSize: 13, lineHeight: 19 },
  customerBody: { color: '#fff', fontSize: 13, lineHeight: 19 },
  time: { color: C.mutedLight, fontSize: 9, textAlign: 'right', marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: C.navy, fontSize: 13 },
  sendButton: { height: 44, width: 44, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  button: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
})
