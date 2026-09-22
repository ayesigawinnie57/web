import { useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react-native'
import api, { BASE_URL } from '../../../lib/api'
import { C } from '../../theme'

const EXPORT_ITEMS = [
  { label: 'Products', type: 'products' },
  { label: 'Orders', type: 'orders' },
  { label: 'Users', type: 'users' },
] as const

const DANGER_ITEMS = [
  {
    label: 'Clear All Orders',
    action: 'clear-orders',
    message: 'This will permanently delete all orders, payments, and related data.',
  },
  {
    label: 'Reset Inventory',
    action: 'reset-inventory',
    message: 'This will set all product stock to 0 and delete stock movement history.',
  },
  {
    label: 'Clear Other Platform Data',
    action: 'clear-other-data',
    message: 'This permanently deletes orders, payments, accounting, reviews, trader activity, notifications, carts, and wishlists. Users, products, categories, and inventory are preserved.',
  },
] as const

type DangerAction = (typeof DANGER_ITEMS)[number]['action']

type ExportFormat = 'csv' | 'json'
const EXPORT_FORMATS: ExportFormat[] = ['csv', 'json']

export default function AdminData() {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [loadingExport, setLoadingExport] = useState<string | null>(null)
  const [loadingImport, setLoadingImport] = useState<string | null>(null)
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const exportData = async (type: string) => {
    setLoadingExport(type)
    setMessage(null)
    try {
      await Linking.openURL(`${BASE_URL}/api/orders/export/${type}/?format=${format}`)
      setMessage({ ok: true, text: `${type} export opened in your browser.` })
    } catch {
      setMessage({ ok: false, text: `Could not open the ${type} export.` })
    } finally {
      setLoadingExport(null)
    }
  }

  const importData = async (type: 'products' | 'categories') => {
    setLoadingImport(type)
    setMessage(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true })
      if (result.canceled) return
      const asset = result.assets[0]
      const form = new FormData()
      form.append('file', { uri: asset.uri, name: asset.name ?? `${type}.csv`, type: asset.mimeType ?? 'text/csv' } as any)
      const response = await api.post<{ created: number; skipped?: number; errors: string[] }>(`/api/orders/import/${type}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = response.data
      setMessage({
        ok: data.errors.length === 0,
        text: data.errors.length === 0
          ? `${data.created} ${type} imported successfully${data.skipped ? ` · ${data.skipped} skipped` : ''}.`
          : `${data.errors.length} import error(s) · ${data.created} row(s) imported.`,
      })
    } catch {
      setMessage({ ok: false, text: `Import failed. Check your ${type} CSV and try again.` })
    } finally {
      setLoadingImport(null)
    }
  }

  const executeDangerAction = async () => {
    if (!dangerAction || !password.trim()) return
    setProcessing(true)
    setMessage(null)
    try {
      const endpoint = dangerAction === 'clear-orders'
        ? '/api/orders/danger/clear-orders/'
        : dangerAction === 'reset-inventory'
          ? '/api/orders/danger/reset-inventory/'
          : '/api/orders/danger/clear-other-data/'
      const response = await api.post(endpoint, { password })
      const data = response.data as Record<string, number>
      const text = dangerAction === 'clear-orders'
        ? `${data.deleted ?? 0} order(s) deleted.`
        : dangerAction === 'reset-inventory'
          ? `${data.products_reset ?? 0} product(s) reset · ${data.movements_deleted ?? 0} movement(s) deleted.`
          : `${data.total_deleted ?? 0} other platform record(s) deleted. Users, products, and inventory were preserved.`
      setMessage({ ok: true, text })
      closeDangerModal()
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      setMessage({ ok: false, text: detail || 'Action failed. Check your password and try again.' })
    } finally {
      setProcessing(false)
    }
  }

  const closeDangerModal = () => {
    if (processing) return
    setDangerAction(null)
    setPassword('')
    setShowPassword(false)
  }

  const selectedDanger = DANGER_ITEMS.find((item) => item.action === dangerAction)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Database size={20} color={C.navy} />
        <Text style={styles.title}>Data Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {message ? (
          <View style={[styles.message, message.ok ? styles.successMessage : styles.errorMessage]}>
            {message.ok ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
            <Text style={[styles.messageText, { color: message.ok ? '#10b981' : '#ef4444' }]}>{message.text}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardIntro}>
            <View style={[styles.iconBox, { backgroundColor: '#6366f118' }]}><Download size={17} color="#6366f1" /></View>
            <View style={styles.introText}>
              <Text style={styles.cardTitle}>Export Data</Text>
              <Text style={styles.cardDescription}>Download a CSV or JSON export of your store data.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exportControls} contentContainerStyle={styles.exportControlsContent}>
            <View style={styles.formatGroup}>
              {EXPORT_FORMATS.map((item) => (
                <TouchableOpacity key={item} onPress={() => setFormat(item)} style={[styles.formatButton, format === item && styles.formatButtonActive]}>
                  <Text style={[styles.formatText, format === item && styles.formatTextActive]}>{item.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.controlDivider} />
            {EXPORT_ITEMS.map((item) => (
              <TouchableOpacity key={item.type} style={styles.exportButton} onPress={() => exportData(item.type)} disabled={loadingExport === item.type}>
                <Download size={14} color="#6366f1" />
                <Text style={styles.exportButtonText}>{loadingExport === item.type ? 'Opening...' : `Export ${item.label}`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIntro}>
            <View style={[styles.iconBox, { backgroundColor: '#10b98118' }]}><Upload size={17} color="#10b981" /></View>
            <View style={styles.introText}>
              <Text style={styles.cardTitle}>Import Data</Text>
              <Text style={styles.cardDescription}>Bulk-import products or categories from a CSV file.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.importControls} contentContainerStyle={styles.importControlsContent}>
            <TouchableOpacity style={styles.importButton} onPress={() => importData('products')} disabled={Boolean(loadingImport)}>
              <Upload size={14} color="#10b981" />
              <Text style={styles.importButtonText}>{loadingImport === 'products' ? 'Importing...' : 'Import Products'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.importButton} onPress={() => importData('categories')} disabled={Boolean(loadingImport)}>
              <Upload size={14} color="#10b981" />
              <Text style={styles.importButtonText}>{loadingImport === 'categories' ? 'Importing...' : 'Import Categories'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.dangerCard}>
          <View style={styles.dangerBanner}>
            <AlertTriangle size={15} color="#fff" />
            <Text style={styles.dangerBannerText}>Danger Zone</Text>
          </View>
          <View style={styles.dangerBody}>
            <View style={styles.cardIntro}>
              <View style={[styles.iconBox, { backgroundColor: '#ef444418' }]}><Trash2 size={17} color="#ef4444" /></View>
              <View style={styles.introText}>
                <Text style={styles.cardTitle}>Permanent Actions</Text>
                <Text style={styles.cardDescription}>These actions erase platform data and cannot be undone.</Text>
              </View>
            </View>
            {DANGER_ITEMS.map((item) => (
              <View key={item.action} style={styles.dangerRow}>
                <View style={styles.dangerRowText}>
                  <Text style={styles.dangerActionTitle}>{item.label}</Text>
                  <Text style={styles.dangerActionDescription}>{item.message}</Text>
                </View>
                <TouchableOpacity style={styles.dangerButton} onPress={() => setDangerAction(item.action)}>
                  <Text style={styles.dangerButtonText}>{item.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footerText}>Full data pipeline integrations coming soon.</Text>
      </ScrollView>

      <Modal visible={Boolean(selectedDanger)} transparent animationType="fade" onRequestClose={closeDangerModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={18} color="#fff" />
              <View style={styles.introText}>
                <Text style={styles.modalTitle}>{selectedDanger?.label}</Text>
                <Text style={styles.modalSubtitle}>This action cannot be reversed.</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.warningText}>{selectedDanger?.message}</Text>
              <Text style={styles.inputLabel}>Enter your admin password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={C.mutedLight}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.passwordInput}
                />
                <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={closeDangerModal} disabled={processing} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={executeDangerAction} disabled={!password.trim() || processing} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>{processing ? 'Processing...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.navy, fontSize: 20, fontWeight: '800' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16 },
  cardIntro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  introText: { flex: 1 },
  cardTitle: { color: C.navy, fontSize: 14, fontWeight: '800' },
  cardDescription: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  exportControls: { marginTop: 14 },
  exportControlsContent: { alignItems: 'center', gap: 8, paddingRight: 4 },
  formatGroup: { flexDirection: 'row', gap: 6 },
  controlDivider: { width: 1, height: 24, backgroundColor: C.border, marginHorizontal: 2 },
  formatButton: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: '#6366f140' },
  formatButtonActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  formatText: { color: '#6366f1', fontSize: 10, fontWeight: '800' },
  formatTextActive: { color: '#fff' },
  actionGrid: { gap: 8, marginTop: 12 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: '#6366f140', backgroundColor: '#6366f10d' },
  exportButtonText: { color: '#6366f1', fontSize: 11, fontWeight: '800' },
  importControls: { marginTop: 14 },
  importControlsContent: { alignItems: 'center', gap: 8, paddingRight: 4 },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: '#10b98140', backgroundColor: '#10b9810d' },
  importButtonText: { color: '#10b981', fontSize: 11, fontWeight: '800' },
  dangerCard: { borderWidth: 2, borderColor: '#ef4444', borderRadius: 14, overflow: 'hidden' },
  dangerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ef4444' },
  dangerBannerText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dangerBody: { padding: 16, backgroundColor: '#fff5f5', gap: 10 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff' },
  dangerRowText: { flex: 1 },
  dangerActionTitle: { color: C.navy, fontSize: 12, fontWeight: '800' },
  dangerActionDescription: { color: C.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  dangerButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: '#ef444440', backgroundColor: '#ef44440d' },
  dangerButtonText: { color: '#ef4444', fontSize: 10, fontWeight: '800' },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  successMessage: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  errorMessage: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  messageText: { flex: 1, fontSize: 12, fontWeight: '700' },
  footerText: { color: C.mutedLight, fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { width: '100%', maxWidth: 420, overflow: 'hidden', borderRadius: 16, backgroundColor: C.card },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, backgroundColor: '#ef4444' },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalSubtitle: { color: '#fee2e2', fontSize: 11, marginTop: 2 },
  modalBody: { padding: 18 },
  warningText: { color: C.muted, fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 10, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca' },
  inputLabel: { color: C.navy, fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 9 },
  passwordInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, color: C.navy, fontSize: 13 },
  eyeButton: { padding: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  cancelButtonText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  confirmButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#ef4444' },
  confirmButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
})
