import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Camera, Mail, Pencil, Phone, UserRound, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from './theme'
import { useAuth } from './lib/AuthContext'
import { authApi, tokenStore } from './lib/auth'
import { appendImage, type PickedImage } from './lib/formData'

export default function AccountScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, reload } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatar, setAvatar] = useState<PickedImage | null>(null)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(user?.avatar ?? null)
  const [editingField, setEditingField] = useState<'name' | 'email' | 'phone' | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    tokenStore.getAccess().then(token => {
      if (!token) return
      authApi.profile(token).then(({ data }) => {
        if (active) setProfileAvatar(data.avatar ?? null)
      }).catch(() => undefined)
    })
    return () => { active = false }
  }, [])

  const avatarUrl = (value: string | null | undefined) => {
    if (!value) return null
    return value.startsWith('http') ? value : `https://res.cloudinary.com/fhklnn0f/image/upload/${value}`
  }

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow access to your photo library.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!result.canceled) {
      const asset = result.assets[0]
      const type = asset.mimeType || 'image/jpeg'
      const picked = { uri: asset.uri, name: `avatar.${type.split('/')[1] || 'jpeg'}`, type }
      setAvatar(picked)
      setSaving(true)
      try {
        const token = await tokenStore.getAccess()
        if (!token) throw new Error('Please sign in again.')
        const form = new FormData()
        await appendImage(form, 'avatar', picked)
        const { data } = await authApi.updateProfile(token, form)
        setProfileAvatar(data.avatar ?? null)
        await reload()
        setAvatar(null)
        Alert.alert('Saved', 'Your profile photo has been updated.')
      } catch (error: any) {
        Alert.alert('Update failed', error?.response?.data?.detail ?? error?.message ?? 'Could not update your profile photo.')
      } finally {
        setSaving(false)
      }
    }
  }

  const saveField = async (field: 'name' | 'email' | 'phone') => {
    const value = field === 'name' ? name : field === 'email' ? email : phone
    if (!value.trim()) {
      Alert.alert('Invalid value', 'This field cannot be empty.')
      return
    }
    setSaving(true)
    try {
      const token = await tokenStore.getAccess()
      if (!token) throw new Error('Please sign in again.')
      await authApi.updateProfile(token, { [field]: value.trim() } as any)
      await reload()
      setEditingField(null)
      Alert.alert('Saved', `${field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Phone number'} has been updated.`)
    } catch (error: any) {
      Alert.alert('Update failed', error?.response?.data?.detail ?? error?.message ?? 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEditing = () => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPhone(user?.phone ?? '')
    setEditingField(null)
  }

  const startEditing = (field: 'name' | 'email' | 'phone') => {
    setEditingField(field)
  }

  const nameEditing = editingField === 'name'
  const emailEditing = editingField === 'email'
  const phoneEditing = editingField === 'phone'
  const handleNameAction = () => nameEditing ? saveField('name') : startEditing('name')
  const handleEmailAction = () => emailEditing ? saveField('email') : startEditing('email')
  const handlePhoneAction = () => phoneEditing ? saveField('phone') : startEditing('phone')

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>My Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.profile}>
          <TouchableOpacity style={styles.avatar} onPress={pickAvatar} accessibilityLabel="Change profile photo">
            {avatar || avatarUrl(profileAvatar)
              ? <Image source={{ uri: avatar?.uri ?? avatarUrl(profileAvatar) ?? undefined }} style={styles.avatarImage} />
              : <Text style={styles.initials}>{(name || 'User').slice(0, 2).toUpperCase()}</Text>}
            <View style={styles.cameraBadge}><Camera size={13} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.name}>{name || 'User'}</Text>
          <Text style={styles.email}>{email || 'Not signed in'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal information</Text>
          <View style={styles.field}>
            <UserRound size={18} color={C.muted} />
            <View style={styles.fieldCopy}>
              <View style={styles.fieldHeader}><Text style={styles.label}>Full name</Text><TouchableOpacity onPress={handleNameAction}><Text style={styles.editText}>{nameEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text></TouchableOpacity></View>
              {nameEditing ? <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.mutedLight} style={styles.input} autoFocus /> : <Text style={styles.value}>{name || 'Not available'}</Text>}
            </View>
          </View>
          <View style={styles.field}>
            <Mail size={18} color={C.muted} />
            <View style={styles.fieldCopy}>
              <View style={styles.fieldHeader}><Text style={styles.label}>Email</Text><TouchableOpacity onPress={handleEmailAction}><Text style={styles.editText}>{emailEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text></TouchableOpacity></View>
              {emailEditing ? <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={C.mutedLight} style={styles.input} autoCapitalize="none" keyboardType="email-address" autoFocus /> : <Text style={styles.value}>{email || 'Not available'}</Text>}
            </View>
          </View>
          <View style={styles.phoneField}>
            <Phone size={18} color={C.muted} />
            <View style={styles.fieldCopy}>
              <View style={styles.fieldHeader}><Text style={styles.label}>Phone number</Text><TouchableOpacity onPress={handlePhoneAction}><Text style={styles.editText}>{phoneEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text></TouchableOpacity></View>
              {phoneEditing ? <TextInput value={phone} onChangeText={setPhone} placeholder="Enter phone number" placeholderTextColor={C.mutedLight} keyboardType="phone-pad" style={styles.input} autoFocus /> : <Text style={styles.value}>{phone || 'Not available'}</Text>}
            </View>
          </View>
          {editingField && <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.navy, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 22 },
  content: { padding: 16, paddingBottom: 100 },
  profile: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  initials: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { color: C.navy, fontSize: 18, fontWeight: '800' },
  email: { color: C.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 16 },
  sectionTitle: { color: C.navy, fontSize: 14, fontWeight: '800' },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editText: { color: C.green, fontSize: 12, fontWeight: '800' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phoneField: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fieldCopy: { flex: 1 },
  label: { color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  value: { color: C.navy, fontSize: 14 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, color: C.navy, fontSize: 14, paddingHorizontal: 10, paddingVertical: 9 },
  cancelButton: { alignItems: 'center', paddingVertical: 4 },
  cancelButtonText: { color: C.muted, fontSize: 12, fontWeight: '700' },
})
