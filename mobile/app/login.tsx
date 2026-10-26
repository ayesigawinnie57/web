import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff } from 'lucide-react-native'
import { C, LOGO } from './theme'
import { authApi, tokenStore } from './lib/auth'
import { initializeSupportEncryptionBackup } from '../lib/supportEncryption'
import { pushNotification } from './lib/NotificationContext'

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Email and password are required.')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.login(email.trim(), password)
      await tokenStore.save(data.access, data.refresh)
      try {
        const { data: profile } = await authApi.profile(data.access)
        await initializeSupportEncryptionBackup(profile.id, password)
      } catch {
        Alert.alert(
          'Chat backup unavailable',
          'You are signed in, but your encrypted chat-key backup could not be updated or restored. Existing chat remains on this device. A password reset cannot unlock an older backup.',
        )
      }
      pushNotification({
        type: 'welcome',
        title: 'Welcome back',
        body: `You are now signed in. Explore the latest gadgets and deals.`,
        time: 'Just now',
      })
      router.replace('/' as any)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Invalid email or password.'
      Alert.alert('Login Failed', msg)
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={C.mutedLight}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.mutedLight}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register' as any)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  passwordInput: { flex: 1, fontSize: 14, color: C.navy },
  btn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.muted, fontSize: 14 },
  footerLink: { color: C.green, fontSize: 14, fontWeight: '700' },
})
