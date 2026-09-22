import { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from './theme'
import { useAuth } from './lib/AuthContext'
import { authApi, tokenStore } from './lib/auth'

export default function PrivacyScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !passwordConfirm) {
      Alert.alert('Missing details', 'Complete all password fields.')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Your new password must be at least 8 characters.')
      return
    }
    if (newPassword !== passwordConfirm) {
      Alert.alert('Passwords do not match', 'Enter the same new password twice.')
      return
    }
    setSaving(true)
    try {
      const token = await tokenStore.getAccess()
      if (!token) throw new Error('Please sign in again.')
      await authApi.updateProfile(token, { current_password: currentPassword, new_password: newPassword, password_confirm: passwordConfirm })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordConfirm('')
      Alert.alert('Password changed', 'Please sign in again with your new password.', [{ text: 'OK', onPress: () => logout() }])
    } catch (error: any) {
      const data = error?.response?.data
      const message = data?.current_password?.[0] ?? data?.new_password?.[0] ?? data?.password_confirm?.[0] ?? data?.detail ?? error?.message ?? 'Could not change your password.'
      Alert.alert('Update failed', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy and security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.iconWrap}><LockKeyhole size={24} color={C.green} /></View>
          <Text style={styles.heading}>Your privacy matters</Text>
          <Text style={styles.description}>Manage your account security and understand how your information is protected.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.passwordForm}>
            <Text style={styles.rowTitle}>Change password</Text>
            <Text style={styles.rowDescription}>Use at least 8 characters and keep it unique to Majo.</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={C.mutedLight} secureTextEntry style={styles.input} />
            {currentPassword.length > 0 && (
              <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor={C.mutedLight} secureTextEntry style={styles.input} />
            )}
            {newPassword.length > 0 && (
              <TextInput value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="Confirm new password" placeholderTextColor={C.mutedLight} secureTextEntry style={styles.input} />
            )}
            {passwordConfirm.length > 0 && (
              <TouchableOpacity style={styles.changeButton} onPress={changePassword} disabled={saving}>
                <Text style={styles.changeButtonText}>{saving ? 'Updating...' : 'Update password'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Secure sign-in</Text>
              <Text style={styles.rowDescription}>Your account uses protected authentication.</Text>
            </View>
            <Check size={18} color={C.green} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.policy}>Majo uses your account details to process orders, provide support, and keep your account secure. We do not sell your personal information.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.navy, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 22 },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  intro: { alignItems: 'center', paddingVertical: 18 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heading: { color: C.navy, fontSize: 18, fontWeight: '800' },
  description: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  sectionTitle: { color: C.navy, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border },
  rowCopy: { flex: 1 },
  rowTitle: { color: C.navy, fontSize: 14, fontWeight: '700' },
  rowDescription: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  passwordForm: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 13, gap: 10 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, color: C.navy, fontSize: 14, paddingHorizontal: 10, paddingVertical: 10 },
  changeButton: { backgroundColor: C.navy, borderRadius: 9, alignItems: 'center', paddingVertical: 12 },
  changeButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  action: { color: C.green, fontSize: 12, fontWeight: '800' },
  policy: { color: C.muted, fontSize: 13, lineHeight: 20 },
})
