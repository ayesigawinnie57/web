import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Store, CheckCircle, XCircle, Clock, RefreshCw, ChevronRight, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react-native'
import api from '../../lib/api'
import { C } from '../../theme'

type Trader = {
  id: number
  uuid?: string
  status: 'pending' | 'approved' | 'rejected'
  full_name: string
  email: string
  phone: string
  national_id: string
  business_name: string
  business_type: string
  business_reg_no: string
  tin: string
  location: string
  district: string
  website: string
  product_categories: string
  monthly_volume: string
  experience: string
  admin_note?: string
  reviewed_by_name?: string
  reviewed_at?: string
  created_at: string
}

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
type Filter = typeof FILTERS[number]
const STATUS = {
  pending: { color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  approved: { color: '#10B981', bg: '#F0FDF4', icon: CheckCircle },
  rejected: { color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
}

function timeAgo(iso?: string) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <View style={styles.infoCard}><Text style={styles.sectionTitle}>{title}</Text>{rows.map(([label, value]) => <View key={label} style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={3}>{value || '—'}</Text></View>)}</View>
}

export default function AdminTraders() {
  const router = useRouter()
  const [traders, setTraders] = useState<Trader[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Trader | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/api/traders/admin/').then(({ data }) => setTraders(Array.isArray(data) ? data : data?.results ?? [])).catch(() => setError('Failed to load trader applications.')).finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const counts = useMemo(() => ({
    all: traders.length,
    pending: traders.filter(item => item.status === 'pending').length,
    approved: traders.filter(item => item.status === 'approved').length,
    rejected: traders.filter(item => item.status === 'rejected').length,
  }), [traders])
  const filtered = filter === 'all' ? traders : traders.filter(item => item.status === filter)

  const approve = async () => {
    if (!selected) return
    setActing(true); setError('')
    try {
      const { data } = await api.post(`/api/traders/admin/${selected.id}/approve/`, { admin_note: '' })
      setTraders(items => items.map(item => item.id === selected.id ? data : item)); setSelected(data)
    } catch { setError('Failed to approve trader.') }
    finally { setActing(false) }
  }

  const reject = async () => {
    if (!selected || !rejectNote.trim()) return
    setActing(true); setError('')
    try {
      const { data } = await api.post(`/api/traders/admin/${selected.id}/reject/`, { admin_note: rejectNote.trim() })
      setTraders(items => items.map(item => item.id === selected.id ? data : item)); setSelected(data); setRejectModal(false); setRejectNote('')
    } catch { setError('Failed to reject trader.') }
    finally { setActing(false) }
  }

  if (selected) {
    const cfg = STATUS[selected.status]
    const StatusIcon = cfg.icon
    return <View style={styles.container}>
      <View style={styles.detailHeader}><TouchableOpacity style={styles.backButton} onPress={() => setSelected(null)}><ArrowLeft size={19} color={C.navy} /></TouchableOpacity><View style={styles.detailHeaderCopy}><Text style={styles.detailTitle} numberOfLines={1}>{selected.business_name}</Text><Text style={styles.detailSub} numberOfLines={1}>{selected.full_name} · {selected.email}</Text></View><View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}><StatusIcon size={12} color={cfg.color} /><Text style={[styles.statusBadgeText, { color: cfg.color }]}>{selected.status}</Text></View></View>
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <InfoSection title="Personal Info" rows={[["Name", selected.full_name], ["Email", selected.email], ["Phone", selected.phone], ["National ID", selected.national_id]]} />
        <InfoSection title="Business Info" rows={[["Business", selected.business_name], ["Type", selected.business_type?.replace('_', ' ')], ["Reg No.", selected.business_reg_no], ["TIN", selected.tin], ["Location", selected.location], ["District", selected.district], ["Website", selected.website]]} />
        <InfoSection title="What They Want to Sell" rows={[["Products / Categories", selected.product_categories], ["Monthly Volume", selected.monthly_volume], ["Experience", selected.experience]]} />
        {selected.admin_note ? <InfoSection title="Admin Note" rows={[["Note", selected.admin_note], ["Reviewed", `${selected.reviewed_by_name ?? ''} ${timeAgo(selected.reviewed_at)}`]]} /> : null}
        <View style={styles.actionRow}><TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => setRejectModal(true)} disabled={acting || selected.status === 'rejected'}><Text style={styles.actionText}>{selected.status === 'rejected' ? 'Rejected' : 'Reject'}</Text></TouchableOpacity><TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={approve} disabled={acting || selected.status === 'approved'}><Text style={styles.actionText}>{acting ? 'Processing...' : selected.status === 'approved' ? 'Approved' : 'Approve'}</Text></TouchableOpacity></View>
      </ScrollView>
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}><View style={styles.modal}><TouchableOpacity style={styles.modalBackdrop} onPress={() => setRejectModal(false)} /><View style={styles.rejectModal}><Text style={styles.modalTitle}>Reject Application</Text><Text style={styles.modalSub}>Provide a reason for rejection.</Text><TextInput style={styles.rejectInput} value={rejectNote} onChangeText={setRejectNote} placeholder="Reason..." placeholderTextColor={C.mutedLight} multiline numberOfLines={3} /><View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setRejectModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.rejectConfirm} onPress={reject} disabled={acting || !rejectNote.trim()}><Text style={styles.actionText}>{acting ? 'Rejecting...' : 'Reject'}</Text></TouchableOpacity></View></View></View></Modal>
    </View>
  }

  return <View style={[styles.container, { paddingTop: 0 }]}><View style={styles.header}><View style={styles.headerLeft}><Store size={20} color={C.navy} /><Text style={styles.title}>Trader Applications</Text></View><TouchableOpacity onPress={load} disabled={loading}><RefreshCw size={16} color={loading ? C.mutedLight : C.muted} /></TouchableOpacity></View>{error ? <Text style={styles.error}>{error}</Text> : null}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map(item => <TouchableOpacity key={item} style={[styles.filter, filter === item && styles.filterActive]} onPress={() => setFilter(item)}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text><Text style={[styles.filterCount, filter === item && styles.filterCountActive]}>{counts[item]}</Text></TouchableOpacity>)}</ScrollView>{loading ? <ActivityIndicator color={C.green} style={styles.loader} /> : <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>{filtered.length === 0 ? <Text style={styles.empty}>No {filter} traders found.</Text> : filtered.map(item => { const cfg = STATUS[item.status]; const Icon = cfg.icon; return <TouchableOpacity key={item.id} style={styles.traderCard} onPress={() => setSelected(item)}><View style={styles.traderIcon}><Store size={20} color={C.navy} /></View><View style={styles.traderCopy}><Text style={styles.business} numberOfLines={1}>{item.business_name}</Text><Text style={styles.person} numberOfLines={1}>{item.full_name} · {item.email}</Text><Text style={styles.date}>{timeAgo(item.created_at)}</Text></View><View style={[styles.statusPill, { backgroundColor: cfg.bg }]}><Icon size={12} color={cfg.color} /><Text style={[styles.statusPillText, { color: cfg.color }]}>{item.status}</Text></View><ChevronRight size={16} color={C.mutedLight} /></TouchableOpacity> })}</ScrollView>}</View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }, headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { color: C.navy, fontSize: 18, fontWeight: '800' }, filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 }, filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }, filterActive: { backgroundColor: C.navy, borderColor: C.navy }, filterText: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: '#fff' }, filterCount: { color: C.muted, backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 5, fontSize: 10, fontWeight: '800' }, filterCountActive: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' }, list: { padding: 16, gap: 10, paddingBottom: 90 }, traderCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, traderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }, traderCopy: { flex: 1, minWidth: 0 }, business: { color: C.navy, fontSize: 14, fontWeight: '800' }, person: { color: C.muted, fontSize: 11, marginTop: 3 }, date: { color: C.mutedLight, fontSize: 10, marginTop: 3 }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 }, statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' }, empty: { color: C.muted, textAlign: 'center', paddingTop: 48, fontSize: 14 }, loader: { marginTop: 40 }, error: { color: '#EF4444', fontSize: 12, paddingHorizontal: 16, paddingTop: 10 }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }, backButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, detailHeaderCopy: { flex: 1, minWidth: 0 }, detailTitle: { color: C.navy, fontSize: 16, fontWeight: '800' }, detailSub: { color: C.muted, fontSize: 10, marginTop: 3 }, statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' }, detailContent: { padding: 16, paddingBottom: 100, gap: 10 }, infoCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14 }, sectionTitle: { color: C.mutedLight, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }, infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, infoLabel: { color: C.mutedLight, fontSize: 11, fontWeight: '600' }, infoValue: { color: C.navy, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' }, actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 }, actionButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 }, rejectButton: { backgroundColor: '#DC2626' }, approveButton: { backgroundColor: '#22C55E' }, actionText: { color: '#fff', fontSize: 13, fontWeight: '800' }, modal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }, modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }, rejectModal: { width: '100%', backgroundColor: C.card, borderRadius: 16, padding: 20 }, modalTitle: { color: C.navy, fontSize: 17, fontWeight: '800' }, modalSub: { color: C.muted, fontSize: 12, marginTop: 4, marginBottom: 14 }, rejectInput: { minHeight: 86, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.navy, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 }, cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border }, cancelText: { color: C.muted, fontSize: 13, fontWeight: '700' }, rejectConfirm: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#DC2626' },
  filters: { height: 50, minWidth: '100%', flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16 },
  filter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, minHeight: 34, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterActive: { minHeight: 36, backgroundColor: C.navy, borderColor: C.navy },
  filterCount: { minWidth: 18, height: 18, textAlign: 'center', lineHeight: 18, color: C.muted, backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 5, fontSize: 10, fontWeight: '800' },
  filterCountActive: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' },
})
