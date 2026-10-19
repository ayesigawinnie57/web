import { useEffect, useState } from 'react'
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Download, FileCheck2, PenLine } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import api from '../../lib/api'
import { C } from '../theme'

type Agreement = {
  title: string
  reference: string
  version: string
  issued_at: string | null
  effective_at: string | null
  ready_to_sign: boolean
  platform: { name: string; operator: string; address: string; signatory: string; title: string; signed_at: string | null }
  trader: { name: string; id: string; application_uuid: string; business_name: string; address: string; email: string; national_id: string; registration_number: string; signed_name: string; signed_at: string | null; has_signature_image: boolean }
  sections: Array<{ title: string; paragraphs: string[] }>
  declaration: string
  id_document_included: false
}

const dateLabel = (date: string | null) => date ? new Date(date).toLocaleString() : 'Pending final signature'

export default function TraderAgreementScreen() {
  const { uuid = '' } = useLocalSearchParams<{ uuid: string }>()
  const router = useRouter()
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [signedName, setSignedName] = useState('')
  const [signature, setSignature] = useState<{ uri: string; name: string; type: string; file?: File } | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    api.get<Agreement>(`/api/traders/${uuid}/agreement/`).then(({ data }) => {
      if (!active) return
      setAgreement(data)
      setSignedName(data.trader.name)
    }).catch(() => Alert.alert('Agreement unavailable', 'Sign in with the account that owns this trader application.')).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [uuid])

  const pickSignature = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true })
    if (result.canceled) return
    const asset = result.assets[0]
    if (asset.size && asset.size > 5 * 1024 * 1024) {
      Alert.alert('Image too large', 'Signature image must be 5 MB or smaller.')
      return
    }
    setSignature({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg', file: asset.file })
  }

  const sign = async () => {
    if (!agreement || !accepted || !signedName.trim()) return
    setSaving(true)
    try {
      const form = new FormData()
      form.append('accepted', 'true')
      form.append('signed_name', signedName.trim())
      if (signature) {
        if (Platform.OS === 'web' && signature.file) form.append('signature_image', signature.file)
        else form.append('signature_image', { uri: signature.uri, name: signature.name, type: signature.type } as any)
      }
      const { data } = await api.post<Agreement>(`/api/traders/${uuid}/agreement/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAgreement(data)
      Alert.alert('Agreement signed', 'Your trader agreement is now active.')
    } catch (error: any) {
      Alert.alert('Could not sign', error?.response?.data?.detail ?? error?.response?.data?.signed_name?.[0] ?? 'Check your name and try again.')
    } finally {
      setSaving(false)
    }
  }

  const downloadAgreement = async () => {
    if (!agreement) return
    const paragraphs = agreement.sections.map(section => `${section.title}\n${section.paragraphs.join('\n')}`).join('\n\n')
    const content = `${agreement.title}\nAgreement Reference: ${agreement.reference}\nAgreement Version: ${agreement.version}\nEffective Date: ${dateLabel(agreement.effective_at)}\n\nTrader: ${agreement.trader.name}\nTrader ID: ${agreement.trader.id}\nBusiness: ${agreement.trader.business_name}\nLocation: ${agreement.trader.address}\nRegistration Number: ${agreement.trader.registration_number || 'Not provided'}\nNational ID: ${agreement.trader.national_id}\n\n${paragraphs}\n\nMajo Gadgets signatory: ${agreement.platform.signatory}, ${agreement.platform.title}\nTrader signature: ${agreement.trader.signed_name}\nExecuted: ${dateLabel(agreement.effective_at)}\nNational ID copy is not included.`
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${agreement.reference}.txt`
      anchor.click()
      URL.revokeObjectURL(url)
      return
    }
    await Share.share({ title: agreement.title, message: content })
  }

  if (loading) return <View style={styles.center}><Text style={styles.muted}>Loading agreement...</Text></View>
  if (!agreement) return <View style={styles.center}><Text style={styles.muted}>Agreement not available.</Text><TouchableOpacity onPress={() => router.replace('/notifications' as any)}><Text style={styles.link}>Back to notifications</Text></TouchableOpacity></View>

  const signed = Boolean(agreement.effective_at)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/notifications' as any)} accessibilityLabel="Back"><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
        <View style={styles.headerTitle}><Text style={styles.brand}>MAJO GADGETS</Text><Text style={styles.heading}>Trader Agreement</Text></View>
        {signed && <TouchableOpacity onPress={downloadAgreement} accessibilityLabel="Download agreement"><Download size={19} color="#fff" /></TouchableOpacity>}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paper}>
          <Text style={styles.documentTitle}>TRADER PARTICIPATION AND MARKETPLACE AGREEMENT</Text>
          <Info label="Agreement Reference" value={agreement.reference} />
          <Info label="Agreement Version" value={agreement.version} />
          <Info label="Effective Date" value={dateLabel(agreement.effective_at)} />
          <Info label="Trader Name" value={agreement.trader.name} />
          <Info label="Trader ID" value={agreement.trader.id} />
          <Info label="Business Name" value={agreement.trader.business_name} />
          <Info label="Address" value={agreement.trader.address} />
          <Info label="Email" value={agreement.trader.email} />
          <Info label="National ID" value={agreement.trader.national_id} />
          <Info label="Registration Number" value={agreement.trader.registration_number || 'Not provided'} />
          <Text style={styles.idNotice}>National ID copy is retained for private verification and is not included in this agreement.</Text>
          {agreement.sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.title}</Text>
              {section.paragraphs.map(paragraph => <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>)}
            </View>
          ))}
          <View style={styles.signatureBlock}>
            <Text style={styles.sectionHeading}>FOR MAJO GADGETS</Text>
            <Text style={styles.paragraph}>Legal representative: {agreement.platform.signatory}</Text>
            <Text style={styles.paragraph}>Title: {agreement.platform.title}</Text>
            <Text style={styles.paragraph}>Electronically executed: {dateLabel(agreement.platform.signed_at)}</Text>
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>FOR THE TRADER</Text>
            <Text style={styles.paragraph}>Full legal name: {agreement.trader.signed_name || agreement.trader.name}</Text>
            <Text style={styles.paragraph}>Trader ID: {agreement.trader.id}</Text>
            <Text style={styles.paragraph}>Electronically executed: {dateLabel(agreement.trader.signed_at)}</Text>
            {agreement.trader.has_signature_image && <Text style={styles.paragraph}>Signature image securely retained with this execution record.</Text>}
            <Text style={[styles.paragraph, styles.small]}>The system retains the document version, signer identification, acceptance record, and timestamp as evidence of electronic execution, subject to applicable law.</Text>
          </View>
        </View>
        {signed ? (
          <TouchableOpacity style={styles.downloadButton} onPress={downloadAgreement}><Download size={17} color="#fff" /><Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Download signed agreement' : 'Share signed agreement'}</Text></TouchableOpacity>
        ) : (
          <View style={styles.signPanel}>
            <View style={styles.panelHeading}><PenLine size={18} color={C.navy} /><Text style={styles.sectionHeading}>Sign this agreement</Text></View>
            {!agreement.ready_to_sign && <Text style={styles.error}>Majo Gadgets business address must be configured before signing.</Text>}
            <Text style={styles.label}>Your verified legal name</Text>
            <TextInput value={signedName} onChangeText={setSignedName} style={styles.input} autoCapitalize="words" />
            <TouchableOpacity style={styles.uploadButton} onPress={pickSignature}><Text style={styles.uploadText}>{signature?.name ?? 'Add signature image (optional)'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.acceptRow} onPress={() => setAccepted(value => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
              <View style={[styles.checkbox, accepted && styles.checkboxOn]}>{accepted && <FileCheck2 size={14} color="#fff" />}</View>
              <Text style={styles.paragraph}>I have read this agreement and agree to sign it electronically.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.signButton, (!agreement.ready_to_sign || !accepted || !signedName.trim() || saving) && styles.disabled]} onPress={sign} disabled={!agreement.ready_to_sign || !accepted || !signedName.trim() || saving}>
              <FileCheck2 size={17} color="#fff" /><Text style={styles.buttonText}>{saving ? 'Signing...' : 'Sign and activate account'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Not provided'}</Text></View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.bg },
  muted: { color: C.muted, fontSize: 14 },
  link: { color: C.green, fontWeight: '800', padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.navy },
  headerTitle: { flex: 1, gap: 2 },
  brand: { color: '#86EFAC', fontSize: 10, fontWeight: '900' },
  heading: { color: '#fff', fontSize: 16, fontWeight: '900' },
  content: { padding: 14, paddingBottom: 40, gap: 12 },
  paper: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8 },
  documentTitle: { color: C.navy, fontSize: 18, fontWeight: '900', lineHeight: 25, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: C.bg, paddingVertical: 7 },
  infoLabel: { color: C.muted, fontSize: 11, fontWeight: '700', flex: 1 },
  infoValue: { color: C.navy, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },
  idNotice: { color: '#9A3412', backgroundColor: '#FFF7ED', padding: 10, fontSize: 11, lineHeight: 16, marginTop: 6 },
  section: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginTop: 8, gap: 8 },
  sectionHeading: { color: C.navy, fontSize: 13, fontWeight: '900', lineHeight: 19 },
  paragraph: { color: C.navy, fontSize: 12, lineHeight: 19 },
  signatureBlock: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 15, marginTop: 12, gap: 7 },
  small: { color: C.muted, fontSize: 10, marginTop: 10 },
  signPanel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 18 },
  label: { color: C.muted, fontSize: 11, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 10, color: C.navy },
  uploadButton: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 },
  uploadText: { color: C.navy, fontSize: 12, fontWeight: '700' },
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.navy, borderColor: C.navy },
  signButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: C.navy, borderRadius: 8, padding: 13 },
  disabled: { opacity: 0.45 },
  downloadButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: C.navy, borderRadius: 8, padding: 13 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
})
