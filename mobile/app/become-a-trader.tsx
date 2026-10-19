import { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, CheckCircle, Store } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { C } from './theme'
import { useAuth } from './lib/AuthContext'
import api from './lib/api'

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'other', label: 'Other' },
]

type Form = {
  full_name: string; email: string; phone: string; national_id: string
  business_name: string; business_type: string; business_reg_no: string
  tin: string; location: string; district: string; website: string
  product_categories: string; monthly_volume: string; experience: string
}

type PickedDocument = {
  uri: string
  name: string
  mimeType: string
  size?: number
  file?: File
}

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

async function appendDocument(data: FormData, field: string, document: PickedDocument) {
  if (Platform.OS === 'web') {
    const file = document.file ?? new File([await (await fetch(document.uri)).blob()], document.name, { type: document.mimeType })
    data.append(field, file)
    return
  }
  data.append(field, { uri: document.uri, name: document.name, type: document.mimeType } as any)
}

export default function BecomeTraderScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [documents, setDocuments] = useState<{ nationalId: PickedDocument | null; uraCertificate: PickedDocument | null; locationProof: PickedDocument | null }>({ nationalId: null, uraCertificate: null, locationProof: null })
  const [form, setForm] = useState<Form>({
    full_name: '', email: '', phone: '', national_id: '', business_name: '', business_type: 'sole_proprietor',
    business_reg_no: '', tin: '', location: '', district: '', website: '', product_categories: '', monthly_volume: '', experience: '',
  })

  useEffect(() => {
    setForm(current => ({ ...current, full_name: current.full_name || user?.name || '', email: current.email || user?.email || '', phone: current.phone || user?.phone || '' }))
    api.get('/api/traders/me/').then(({ data }) => {
      setStatus(data?.status ?? null)
      if (data?.status === 'approved' && data.agreement_required && !data.agreement_signed_at) {
        router.replace(`/agreement/${data.uuid}` as any)
      }
    }).catch(() => undefined)
  }, [user])

  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }))

  const pickDocument = async (key: keyof typeof documents, label: string) => {
    const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES, copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    const extension = asset.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(extension ?? '')) {
      Alert.alert('Unsupported file', `${label} must be a JPG, PNG, or PDF.`)
      return
    }
    if (asset.size && asset.size > MAX_DOCUMENT_SIZE) {
      Alert.alert('File too large', `${label} must be 10 MB or smaller.`)
      return
    }
    setDocuments(current => ({ ...current, [key]: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', size: asset.size, file: asset.file } }))
  }

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.national_id.trim() || !form.business_name.trim() || !form.location.trim() || !form.product_categories.trim()) {
      Alert.alert('Incomplete application', 'Complete all required fields before submitting.')
      return
    }
    if (!/^(?=.*[a-z])(?=.*\d)[a-z\d]{8,20}$/i.test(form.national_id.replace(/[\s-]/g, ''))) {
      Alert.alert('Check National ID', 'Enter the ID exactly as printed. It must contain both letters and numbers.')
      return
    }
    if (!documents.nationalId || !documents.locationProof) {
      Alert.alert('Documents required', 'Attach a copy of your National ID and proof of your physical business location.')
      return
    }
    if (!form.tin.trim() && !documents.uraCertificate) {
      Alert.alert('URA details required', 'Enter your URA TIN or attach a URA certificate.')
      return
    }
    if (!agreedToTerms) {
      Alert.alert('Agreement required', 'Confirm that you agree to the trader terms before submitting.')
      return
    }
    setLoading(true)
    try {
      const data = new FormData()
      Object.entries({ ...form, agreed_to_terms: true }).forEach(([key, value]) => data.append(key, String(value)))
      await appendDocument(data, 'national_id_document', documents.nationalId)
      await appendDocument(data, 'business_location_proof', documents.locationProof)
      if (documents.uraCertificate) await appendDocument(data, 'ura_certificate_document', documents.uraCertificate)
      await api.post('/api/traders/apply/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSubmitted(true)
    } catch (error: any) {
      const data = error?.response?.data
      Alert.alert('Submission failed', data?.email ? 'An application with this email already exists.' : data?.detail ?? 'Please check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'pending') return <StatusScreen title="Application Under Review" message="Your trader application is being reviewed. We will notify you once a decision is made." onBack={() => router.replace('/settings' as any)} />
  if (status === 'approved') return <StatusScreen title="Trader account ready" message="Your trader application was approved. Open the Trader portal from the bottom navigation." onBack={() => router.replace('/settings' as any)} />
  if (submitted) return <StatusScreen title="Application Submitted" message="Thank you. Our team will review your trader application and get back to you within 2–3 business days." onBack={() => router.replace('/settings' as any)} success />

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back"><ArrowLeft size={22} color="#fff" /></TouchableOpacity>
        <View style={styles.headerTitle}><Store size={19} color="#22C55E" /><Text style={styles.title}>Sell with Majo Gadgets</Text></View>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Become a Trader</Text>
        <Text style={styles.description}>Apply to list and sell your products on Majo Gadgets. Fields marked * are required.</Text>
        <Section title="Personal information">
          <Field label="Full name *" value={form.full_name} onChangeText={value => set('full_name', value)} />
          <Field label="Email *" value={form.email} onChangeText={value => set('email', value)} keyboardType="email-address" />
          <Field label="Phone *" value={form.phone} onChangeText={value => set('phone', value)} keyboardType="phone-pad" />
          <Field label="National ID / Passport *" value={form.national_id} onChangeText={value => set('national_id', value)} />
          <DocumentField label="Copy of National ID *" document={documents.nationalId} onPress={() => pickDocument('nationalId', 'National ID copy')} />
        </Section>
        <Section title="Business information">
          <Field label="Business name *" value={form.business_name} onChangeText={value => set('business_name', value)} />
          <Text style={styles.label}>Business type</Text>
          <View style={styles.typeRow}>{BUSINESS_TYPES.map(type => <TouchableOpacity key={type.value} style={[styles.typeChip, form.business_type === type.value && styles.typeChipActive]} onPress={() => set('business_type', type.value)}><Text style={[styles.typeText, form.business_type === type.value && styles.typeTextActive]}>{type.label}</Text></TouchableOpacity>)}</View>
          <Field label="Business location / Address *" value={form.location} onChangeText={value => set('location', value)} />
          <Field label="District" value={form.district} onChangeText={value => set('district', value)} />
          <Field label="Business registration number" value={form.business_reg_no} onChangeText={value => set('business_reg_no', value)} />
          <Field label="TIN" value={form.tin} onChangeText={value => set('tin', value)} />
          <DocumentField label="URA certificate (required if no TIN)" document={documents.uraCertificate} onPress={() => pickDocument('uraCertificate', 'URA certificate')} />
          <DocumentField label="Proof of physical business location *" document={documents.locationProof} onPress={() => pickDocument('locationProof', 'Business location proof')} />
          <Field label="Website" value={form.website} onChangeText={value => set('website', value)} autoCapitalize="none" />
        </Section>
        <Section title="What you want to sell">
          <Field label="Product categories / products *" value={form.product_categories} onChangeText={value => set('product_categories', value)} multiline placeholder="e.g. Smartphones, chargers, smart watches" />
          <Field label="Expected monthly sales volume" value={form.monthly_volume} onChangeText={value => set('monthly_volume', value)} />
          <Field label="Trading / business experience" value={form.experience} onChangeText={value => set('experience', value)} multiline />
        </Section>
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(current => !current)} accessibilityRole="checkbox" accessibilityState={{ checked: agreedToTerms }}>
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>{agreedToTerms ? <CheckCircle size={16} color="#fff" /> : null}</View>
          <Text style={styles.termsText}>I confirm these details are accurate and agree to the trader terms and conditions.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}><Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit application'}</Text></TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View> }
function Field({ label, value, onChangeText, ...props }: { label: string; value: string; onChangeText: (value: string) => void; [key: string]: any }) { return <View><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} style={[styles.input, props.multiline && styles.textarea]} placeholderTextColor={C.mutedLight} {...props} /></View> }
function DocumentField({ label, document, onPress }: { label: string; document: PickedDocument | null; onPress: () => void }) { return <View><Text style={styles.label}>{label}</Text><TouchableOpacity style={styles.documentButton} onPress={onPress}><Text style={styles.documentButtonText}>{document?.name ?? 'Choose JPG, PNG, or PDF'}</Text></TouchableOpacity></View> }
function StatusScreen({ title, message, onBack, success = false }: { title: string; message: string; onBack: () => void; success?: boolean }) { return <View style={styles.status}><CheckCircle size={54} color={success ? '#22C55E' : C.navy} /><Text style={styles.statusTitle}>{title}</Text><Text style={styles.statusText}>{message}</Text><TouchableOpacity style={styles.submit} onPress={onBack}><Text style={styles.submitText}>Back to Settings</Text></TouchableOpacity></View> }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 16 }, headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 }, title: { color: '#fff', fontSize: 16, fontWeight: '800' }, spacer: { width: 22 }, content: { padding: 16, paddingBottom: 100, gap: 14 }, heading: { color: C.navy, fontSize: 22, fontWeight: '900' }, description: { color: C.muted, fontSize: 13, lineHeight: 19 }, section: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, gap: 12 }, sectionTitle: { color: C.navy, fontSize: 14, fontWeight: '800', marginBottom: 2 }, label: { color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 5 }, input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, color: C.navy, fontSize: 13, paddingHorizontal: 11, paddingVertical: 10 }, textarea: { minHeight: 78, textAlignVertical: 'top' }, typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, typeChip: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 }, typeChipActive: { backgroundColor: C.navy, borderColor: C.navy }, typeText: { color: C.muted, fontSize: 11, fontWeight: '700' }, typeTextActive: { color: '#fff' }, documentButton: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 }, documentButtonText: { color: C.navy, fontSize: 12, fontWeight: '700' }, termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checkboxActive: { backgroundColor: C.navy, borderColor: C.navy }, termsText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 }, submit: { backgroundColor: C.navy, borderRadius: 10, alignItems: 'center', paddingVertical: 14 }, submitText: { color: '#fff', fontSize: 14, fontWeight: '800' }, status: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }, statusTitle: { color: C.navy, fontSize: 21, fontWeight: '900', textAlign: 'center' }, statusText: { color: C.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
})
