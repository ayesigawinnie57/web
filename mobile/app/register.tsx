import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react-native'
import { C, LOGO } from './theme'
import { authApi, tokenStore } from './lib/auth'
import { initializeSupportEncryptionBackup } from '../lib/supportEncryption'
import { pushNotification } from './lib/NotificationContext'

const REGIONS = ['Central Uganda', 'Eastern Uganda', 'Northern Uganda', 'Western Uganda']

export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    country: 'Uganda', region: '', district: '', village: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [regionOpen, setRegionOpen] = useState(false)

  const set = (key: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Validation', 'Name, email and password are required.')
      return
    }
    if (form.password !== form.confirm) {
      Alert.alert('Validation', 'Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await authApi.register(form.name.trim(), form.email.trim(), form.phone.trim(), form.password, {
        country: form.country,
        region: form.region,
        district: form.district.trim(),
        village: form.village.trim(),
      })
      const { data } = await authApi.login(form.email.trim(), form.password)
      if ('mfa_required' in data) {
        throw new Error('A verification code is required. Please sign in to complete the security check.')
      }
      await tokenStore.save(data.access, data.refresh)
      try {
        const { data: profile } = await authApi.profile(data.access)
        await initializeSupportEncryptionBackup(profile.id, form.password)
      } catch {
        Alert.alert(
          'Chat backup unavailable',
          'Your account was created, but the encrypted chat-key backup could not be initialized. Sign in again later to retry.',
        )
      }
      pushNotification({
        type: 'welcome',
        title: 'Welcome to Majo Gadgets',
        body: `Hi ${form.name.trim()}, your account is ready. Start exploring our latest gadgets.`,
        time: 'Just now',
      })
      router.replace('/' as any)
    } catch (e: any) {
      const data = e?.response?.data
      const msg = data?.email?.[0] ?? data?.password?.[0] ?? data?.detail ?? 'Registration failed.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.form}>
          <Field label="Full Name *" value={form.name} onChangeText={set('name')} placeholder="John Doe" />
          <Field label="Email *" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="+256 700 000000" keyboardType="phone-pad" />

          {/* Country — locked to Uganda */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Country</Text>
            <View style={[styles.input, styles.lockedInput]}>
              <Text style={styles.lockedText}>🇺🇬  Uganda</Text>
            </View>
          </View>

          {/* Region picker */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Region</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setRegionOpen(true)} activeOpacity={0.8}>
              <Text style={form.region ? styles.pickerValue : styles.pickerPlaceholder}>
                {form.region || 'Select region'}
              </Text>
              <ChevronDown size={16} color={C.muted} />
            </TouchableOpacity>
          </View>

          <Field label="District" value={form.district} onChangeText={set('district')} placeholder="e.g. Kampala" />
          <Field label="Village / Street" value={form.village} onChangeText={set('village')} placeholder="e.g. Nakawa" />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={form.password}
                onChangeText={set('password')}
                placeholder="Min. 8 characters"
                placeholderTextColor={C.mutedLight}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}
              </TouchableOpacity>
            </View>
          </View>

          <Field label="Confirm Password *" value={form.confirm} onChangeText={set('confirm')} placeholder="Repeat password" secureTextEntry />

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login' as any)}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Region picker modal */}
      <Modal visible={regionOpen} transparent animationType="fade" onRequestClose={() => setRegionOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRegionOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Region</Text>
            {REGIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={styles.modalOption}
                onPress={() => { set('region')(r); setRegionOpen(false) }}
              >
                <Text style={[styles.modalOptionText, form.region === r && styles.modalOptionActive]}>{r}</Text>
                {form.region === r && <Check size={16} color={C.green} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={C.mutedLight} {...props} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: C.bg, paddingHorizontal: 24, alignItems: 'center' },
  logo: { width: 140, height: 50, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: C.navy, alignSelf: 'flex-start' },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 32, alignSelf: 'flex-start' },
  form: { width: '100%', gap: 4 },
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: C.navy, marginBottom: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.navy },
  lockedInput: { backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center' },
  lockedText: { fontSize: 14, color: C.navy, fontWeight: '600' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  pickerValue: { fontSize: 14, color: C.navy },
  pickerPlaceholder: { fontSize: 14, color: C.mutedLight },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  passwordInput: { flex: 1, fontSize: 14, color: C.navy },
  btn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.muted, fontSize: 14 },
  footerLink: { color: C.green, fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,26,43,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalSheet: { backgroundColor: C.card, borderRadius: 16, padding: 24, width: '100%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.navy, marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  modalOptionText: { fontSize: 15, color: C.navy },
  modalOptionActive: { fontWeight: '800', color: C.green },
})
