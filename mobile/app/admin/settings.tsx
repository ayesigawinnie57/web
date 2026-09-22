import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Settings as SettingsIcon, Users, Truck, ChevronDown, Plus, Trash2 } from 'lucide-react-native'
import api from '../lib/api'
import { C } from '../theme'

type Tab = 'Platform' | 'Users' | 'Delivery'
type Platform = { ui_active: boolean; allow_selling: boolean; initial_charge: string; commission: string; withdrawal_minimum: string; withdrawal_fee: string; vat: string; free_delivery_threshold: string }
type Staff = { id: number; name: string; email: string; phone: string; assigned_pages?: string[] }
const PAGES = ['Dashboard', 'Products', 'Flash Sales', 'Categories', 'Orders', 'Users', 'Payments', 'Settings']
const SETTINGS_TABS = [
  { label: 'Platform', icon: SettingsIcon, description: 'Visibility & charges' },
  { label: 'Users', icon: Users, description: 'Staff accounts' },
  { label: 'Delivery', icon: Truck, description: 'Fees & districts' },
] as const
const CHARGES: Array<{ key: keyof Platform; label: string; description: string; suffix: string }> = [
  { key: 'initial_charge', label: 'Initial Charge', description: 'One-time fee to activate a trader account.', suffix: 'UGX' },
  { key: 'commission', label: 'Commission', description: 'Percentage cut taken from each sale.', suffix: '%' },
  { key: 'withdrawal_minimum', label: 'Withdrawal Minimum', description: 'Minimum amount a trader can withdraw.', suffix: 'UGX' },
  { key: 'withdrawal_fee', label: 'Withdrawal Fee', description: 'Flat fee charged per withdrawal request.', suffix: 'UGX' },
  { key: 'vat', label: 'VAT', description: 'Tax percentage applied to transactions.', suffix: '%' },
  { key: 'free_delivery_threshold', label: 'Free Delivery Threshold', description: 'Order amount above which delivery is free.', suffix: 'UGX' },
]

function Field({ label, value, onChange, secure = false }: { label: string; value: string; onChange: (value: string) => void; secure?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} secureTextEntry={secure} placeholderTextColor={C.mutedLight} /></View>
}

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>('Platform')
  const [toast, setToast] = useState('')
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2500) }
  const renderTab = ({ label, icon: Icon, description }: (typeof SETTINGS_TABS)[number]) => <TouchableOpacity key={label} style={[styles.tab, tab === label && styles.tabActive]} onPress={() => setTab(label)}><Icon size={16} color={tab === label ? C.navy : C.muted} /><Text style={[styles.tabText, tab === label && styles.tabTextActive]}>{label}</Text><Text style={styles.tabDescription}>{description}</Text></TouchableOpacity>
  const content = tab === 'Platform' ? <PlatformTab showToast={showToast} /> : tab === 'Users' ? <UsersTab showToast={showToast} /> : <DeliveryTab showToast={showToast} />
  return <View style={styles.container}>{toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}<View style={styles.header}><SettingsIcon size={20} color={C.navy} /><Text style={styles.title}>Settings</Text></View><View style={styles.tabs}>{SETTINGS_TABS.map(renderTab)}</View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{content}</ScrollView></View>
}

function PlatformTab({ showToast }: { showToast: (message: string) => void }) {
  const [settings, setSettings] = useState<Platform>({ ui_active: false, allow_selling: false, initial_charge: '', commission: '', withdrawal_minimum: '', withdrawal_fee: '', vat: '', free_delivery_threshold: '' })
  const [loading, setLoading] = useState(true)
  const [chargesOpen, setChargesOpen] = useState(false)
  const [editing, setEditing] = useState<keyof Platform | null>(null)
  const [draft, setDraft] = useState('')
  useEffect(() => { api.get('/api/settings/platform/').then(({ data }) => setSettings(current => ({ ...current, ...data }))).catch(() => {}).finally(() => setLoading(false)) }, [])
  const toggle = async (key: 'ui_active' | 'allow_selling') => { if (key === 'ui_active' && settings.ui_active) { Alert.alert('Deactivate the Site?', 'This will hide the storefront from regular users.', [{ text: 'Cancel' }, { text: 'Yes, Deactivate', style: 'destructive', onPress: () => saveToggle(key) }]); return } saveToggle(key) }
  const saveToggle = async (key: 'ui_active' | 'allow_selling') => { const value = !settings[key]; try { await api.patch('/api/settings/platform/', { [key]: value }); setSettings(current => ({ ...current, [key]: value })); showToast('Setting updated.') } catch { showToast('Failed to update setting.') } }
  const saveCharge = async (key: keyof Platform) => { try { await api.patch('/api/settings/platform/', { [key]: draft }); setSettings(current => ({ ...current, [key]: draft })); setEditing(null); showToast('Charge updated.') } catch { showToast('Failed to update charge.') } }
  if (loading) return <ActivityIndicator color={C.green} style={styles.loader} />
  return <View style={styles.stack}><Text style={styles.sectionLabel}>Visibility</Text><ToggleRow label="Activate UI" description="Make the storefront visible and accessible to customers." value={settings.ui_active} onPress={() => toggle('ui_active')} /><ToggleRow label="Allow Selling" description="Let vendors list and sell products on the platform." value={settings.allow_selling} onPress={() => toggle('allow_selling')} /><TouchableOpacity style={styles.accordionHeader} onPress={() => setChargesOpen(open => !open)}><View><Text style={styles.cardTitle}>Charges & Rates</Text><Text style={styles.muted}>{chargesOpen ? 'Tap to collapse' : 'Insert commission, VAT, fees...'}</Text></View><ChevronDown size={18} color={C.muted} /></TouchableOpacity>{chargesOpen && <View style={styles.chargeList}>{CHARGES.map(charge => { const value = settings[charge.key] as string; const isEditing = editing === charge.key; return <View key={charge.key} style={styles.chargeRow}><View style={styles.chargeCopy}><Text style={styles.cardTitle}>{charge.label}</Text><Text style={styles.muted}>{charge.description}</Text></View>{isEditing ? <View style={styles.editCharge}><TextInput style={styles.chargeInput} value={draft} onChangeText={setDraft} keyboardType="numeric" autoFocus /><Text style={styles.suffix}>{charge.suffix}</Text><TouchableOpacity style={styles.saveButton} onPress={() => saveCharge(charge.key)}><Text style={styles.saveText}>Save</Text></TouchableOpacity></View> : <View style={styles.editCharge}>{Number(value) > 0 && <Text style={styles.chargeValue}>{Number(value).toLocaleString()} {charge.suffix}</Text>}<TouchableOpacity style={styles.outlineButton} onPress={() => { setEditing(charge.key); setDraft(value || '') }}><Text style={styles.outlineText}>{Number(value) > 0 ? 'Update' : 'Insert'}</Text></TouchableOpacity></View>}</View> })}</View>}</View>
}

function ToggleRow({ label, description, value, onPress }: { label: string; description: string; value: boolean; onPress: () => void }) {
  return <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.cardTitle}>{label}</Text><Text style={styles.muted}>{description}</Text></View><Switch value={value} onValueChange={onPress} trackColor={{ false: '#CBD5E1', true: '#22C55E' }} thumbColor="#fff" /></View>
}

function UsersTab({ showToast }: { showToast: (message: string) => void }) {
  const [staff, setStaff] = useState<Staff[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(''); const [addOpen, setAddOpen] = useState(false); const [pagesOpen, setPagesOpen] = useState<Staff | null>(null); const [pages, setPages] = useState<string[]>([]); const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const load = useCallback(() => { setLoading(true); api.get('/api/auth/admin/users/').then(({ data }) => setStaff((Array.isArray(data) ? data : data?.results ?? []).filter((item: Staff & { is_staff: boolean }) => item.is_staff))).catch(() => {}).finally(() => setLoading(false)) }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const filtered = staff.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase()))
  const addStaff = async () => { try { await api.post('/api/auth/admin/users/', { ...form, is_staff: true }); setAddOpen(false); setForm({ name: '', email: '', phone: '', password: '' }); load(); showToast('Staff user added.') } catch { showToast('Failed to add user.') } }
  const deleteStaff = (item: Staff) => Alert.alert('Delete Staff User?', `Delete ${item.name}?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/auth/admin/users/${item.id}/`); load(); showToast('User deleted.') } catch { showToast('Failed to delete user.') } } }])
  const savePages = async () => { if (!pagesOpen) return; try { await api.patch(`/api/auth/admin/users/${pagesOpen.id}/`, { assigned_pages: pages }); setPagesOpen(null); load(); showToast('Pages assigned.') } catch { showToast('Failed to assign pages.') } }
  return <View style={styles.stack}><View style={styles.staffToolbar}><TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search staff..." placeholderTextColor={C.mutedLight} /><TouchableOpacity style={styles.primaryButton} onPress={() => setAddOpen(true)}><Plus size={14} color="#fff" /><Text style={styles.primaryText}>Add Staff</Text></TouchableOpacity></View>{loading ? <ActivityIndicator color={C.green} style={styles.loader} /> : <View style={styles.stack}>{filtered.map(item => <View key={item.id} style={styles.staffRow}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text></View><View style={styles.staffCopy}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.muted}>{item.email}</Text><Text style={styles.pageSummary}>{item.assigned_pages?.length ? item.assigned_pages.join(', ') : 'All pages'}</Text></View><TouchableOpacity style={styles.outlineButton} onPress={() => { setPagesOpen(item); setPages(item.assigned_pages ?? []) }}><Text style={styles.outlineText}>Pages</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => deleteStaff(item)}><Trash2 size={16} color="#EF4444" /></TouchableOpacity></View>)}{filtered.length === 0 && <Text style={styles.empty}>No staff users found.</Text>}</View>}{addOpen && <View style={styles.modal}><TouchableOpacity style={styles.modalBackdrop} onPress={() => setAddOpen(false)} /><View style={styles.modalCard}><Text style={styles.modalTitle}>Add Staff User</Text><Text style={styles.muted}>This user will be created as staff.</Text><Field label="Name" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} /><Field label="Email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} /><Field label="Phone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} /><Field label="Password" value={form.password} onChange={value => setForm(current => ({ ...current, password: value }))} secure /><View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setAddOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={addStaff}><Text style={styles.primaryText}>Add Staff</Text></TouchableOpacity></View></View></View>}{pagesOpen && <View style={styles.modal}><TouchableOpacity style={styles.modalBackdrop} onPress={() => setPagesOpen(null)} /><View style={styles.modalCard}><Text style={styles.modalTitle}>Assign Pages</Text><Text style={styles.muted}>Leave all unchecked for all pages.</Text>{PAGES.map(page => <TouchableOpacity key={page} style={styles.pageOption} onPress={() => setPages(current => current.includes(page) ? current.filter(item => item !== page) : [...current, page])}><View style={[styles.checkbox, pages.includes(page) && styles.checkboxActive]} /> <Text style={styles.cardTitle}>{page}</Text></TouchableOpacity>)}<View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setPagesOpen(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={savePages}><Text style={styles.primaryText}>Save</Text></TouchableOpacity></View></View></View>}</View>
}

const REGIONS: Record<string, string[]> = {
  Central: ['Buikwe', 'Kampala', 'Masaka', 'Mityana', 'Mpigi', 'Mubende', 'Mukono', 'Wakiso'],
  Western: ['Bushenyi', 'Hoima', 'Kabale', 'Kabarole', 'Mbarara', 'Ntungamo', 'Rubirizi', 'Sheema'],
  Eastern: ['Bugiri', 'Busia', 'Iganga', 'Jinja', 'Kamuli', 'Mbale', 'Soroti', 'Tororo'],
  Northern: ['Abim', 'Adjumani', 'Arua', 'Gulu', 'Kitgum', 'Lira', 'Moroto', 'Nebbi'],
}

function DeliveryTab({ showToast }: { showToast: (message: string) => void }) {
  const [fee, setFee] = useState('')
  const [districts, setDistricts] = useState<Array<{ id: number; name: string; price: string; region: string }>>([])
  const [region, setRegion] = useState('Central')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [districtModal, setDistrictModal] = useState<string | null>(null)
  const [modalEditing, setModalEditing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.get('/api/settings/delivery/'), api.get('/api/settings/districts/')])
      .then(([delivery, districtResponse]) => {
        setFee(delivery.data?.global_fee ?? '')
        setDistricts(Array.isArray(districtResponse.data) ? districtResponse.data : districtResponse.data?.results ?? [])
      })
      .catch(() => showToast('Failed to load delivery settings.'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { load() }, [load])

  const saveFee = async () => {
    setSaving(true)
    try { await api.patch('/api/settings/delivery/', { global_fee: fee }); showToast('Delivery fee updated.') }
    catch { showToast('Failed to update delivery fee.') }
    finally { setSaving(false) }
  }

  const saveDistrict = async (name: string) => {
    const existing = districts.find(item => item.name === name)
    setSaving(true)
    try {
      if (existing?.id) await api.patch(`/api/settings/districts/${existing.id}/`, { name, price: draft, region })
      else await api.post('/api/settings/districts/', { name, price: draft, region })
      setEditing(null); setDraft(''); setDistrictModal(null); setModalEditing(false); load(); showToast('Price saved.')
    } catch { showToast('Failed to save price.') }
    finally { setSaving(false) }
  }

  if (loading) return <ActivityIndicator color={C.green} style={styles.loader} />
  return <View style={styles.stack}>
    <View style={styles.card}><Text style={styles.cardTitle}>Global Delivery Fee</Text><Text style={styles.muted}>Default fee when no district price is set.</Text><View style={styles.feeRow}><TextInput style={styles.input} value={fee} onChangeText={setFee} keyboardType="numeric" placeholder="e.g. 5000" placeholderTextColor={C.mutedLight} /><Text style={styles.suffix}>UGX</Text><TouchableOpacity style={styles.saveButton} onPress={saveFee} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionTabs}>{Object.keys(REGIONS).map(item => <TouchableOpacity key={item} style={[styles.regionTab, region === item && styles.regionTabActive]} onPress={() => { setRegion(item); setEditing(null) }}><Text style={[styles.regionText, region === item && styles.regionTextActive]}>{item}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.districtGrid}>{REGIONS[region].map(name => { const saved = districts.find(item => item.name === name); return <TouchableOpacity key={name} style={styles.districtCard} onPress={() => { setDistrictModal(name); setDraft(saved?.price ?? ''); setModalEditing(false) }}><Text style={styles.districtName} numberOfLines={1}>{name}</Text><View style={styles.districtActions}><Text style={styles.districtPrice} numberOfLines={1}>{saved?.price ? `Delivery: UGX ${Number(saved.price).toLocaleString()}` : 'Delivery: —'}</Text><Text style={styles.editWord}>Edit</Text></View></TouchableOpacity>})}</View>
    {districtModal && <View style={styles.modal}><TouchableOpacity style={styles.modalBackdrop} onPress={() => setDistrictModal(null)} /><View style={styles.modalCard}><Text style={styles.modalTitle}>{districtModal}</Text><Text style={styles.muted}>District delivery fee</Text><View style={styles.modalFeeRow}><TextInput style={[styles.input, !modalEditing && styles.disabledInput]} value={draft} onChangeText={setDraft} editable={modalEditing} keyboardType="numeric" placeholder="Delivery fee" placeholderTextColor={C.mutedLight} /><Text style={styles.suffix}>UGX</Text></View><View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setDistrictModal(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>{modalEditing ? <TouchableOpacity style={styles.primaryButton} onPress={() => saveDistrict(districtModal)} disabled={saving}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity> : <TouchableOpacity style={styles.primaryButton} onPress={() => setModalEditing(true)}><Text style={styles.primaryText}>Edit</Text></TouchableOpacity>}</View></View></View>}
  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg }, content: { padding: 16, paddingBottom: 100 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }, title: { color: C.navy, fontSize: 18, fontWeight: '800' }, tabs: { backgroundColor: '#F1F5F9', padding: 5, gap: 4 }, tab: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 9, backgroundColor: 'transparent' }, tabActive: { backgroundColor: C.card }, tabText: { color: C.muted, fontSize: 12, fontWeight: '800' }, tabTextActive: { color: C.navy }, tabDescription: { color: C.mutedLight, fontSize: 9, marginTop: 2 }, stack: { gap: 10 }, sectionLabel: { color: C.mutedLight, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 }, toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, toggleCopy: { flex: 1 }, card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16 }, cardTitle: { color: C.navy, fontSize: 13, fontWeight: '800' }, muted: { color: C.muted, fontSize: 11, lineHeight: 16 }, accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, chargeList: { backgroundColor: C.card, borderWidth: 1, borderTopWidth: 0, borderColor: C.border, paddingHorizontal: 14 }, chargeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, chargeCopy: { flex: 1 }, editCharge: { flexDirection: 'row', alignItems: 'center', gap: 5 }, chargeInput: { width: 78, borderWidth: 1, borderColor: C.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, textAlign: 'right', color: C.navy }, chargeValue: { color: C.navy, fontSize: 11, fontWeight: '800' }, suffix: { color: C.muted, fontSize: 10, fontWeight: '800' }, outlineButton: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }, outlineText: { color: C.muted, fontSize: 10, fontWeight: '800' }, saveButton: { backgroundColor: C.navy, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }, saveText: { color: '#fff', fontSize: 10, fontWeight: '800' }, staffToolbar: { flexDirection: 'row', gap: 8 }, search: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, color: C.navy, fontSize: 12 }, primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: C.navy, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 }, primaryText: { color: '#fff', fontSize: 11, fontWeight: '800' }, staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12 }, avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' }, staffCopy: { flex: 1 }, pageSummary: { color: '#6366F1', fontSize: 9, marginTop: 2 }, deleteButton: { padding: 7 }, pageOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: C.border }, checkboxActive: { backgroundColor: C.green, borderColor: C.green }, modal: { ...StyleSheet.absoluteFillObject, zIndex: 10, alignItems: 'center', justifyContent: 'center', padding: 20 }, modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }, modalCard: { width: '100%', maxHeight: '90%', backgroundColor: C.card, borderRadius: 16, padding: 20 }, modalTitle: { color: C.navy, fontSize: 17, fontWeight: '800', marginBottom: 4 }, field: { gap: 5, marginTop: 10 }, fieldLabel: { color: C.muted, fontSize: 11, fontWeight: '700' }, input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, color: C.navy, fontSize: 13 }, modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 }, cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingVertical: 10 }, cancelText: { color: C.muted, fontSize: 11, fontWeight: '800' }, pageOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: C.border }, checkboxActive: { backgroundColor: C.green, borderColor: C.green }, toast: { position: 'absolute', top: 12, left: 20, right: 20, zIndex: 20, backgroundColor: C.green, borderRadius: 10, padding: 12 }, toastText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' }, loader: { marginTop: 40 }, empty: { color: C.muted, textAlign: 'center', paddingVertical: 30 }, feeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  regionTabs: { gap: 5, paddingVertical: 2 },
  regionTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: '#F1F5F9' },
  regionTabActive: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  regionText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  regionTextActive: { color: C.navy },
  districtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  districtCard: { width: '23.5%', minWidth: 78, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 8 },
  districtActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3, marginTop: 6 },
  districtTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  districtName: { color: C.navy, fontSize: 10, fontWeight: '800' },
  districtPrice: { color: C.muted, fontSize: 8, fontWeight: '700', flexShrink: 1 },
  editWordButton: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 1 },
  editWord: { color: C.green, fontSize: 9, fontWeight: '800' },
  districtEdit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  disabledInput: { backgroundColor: '#F8FAFC', color: C.muted },
  modal: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 26, 43, 0.48)' },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: C.card, borderRadius: 20, padding: 22, shadowColor: '#071A2B', shadowOpacity: 0.2, shadowRadius: 18, elevation: 12 },
  modalTitle: { color: C.navy, fontSize: 20, fontWeight: '900', marginBottom: 5 },
  modalFeeRow: { backgroundColor: C.bg, borderRadius: 12, padding: 8, paddingLeft: 12, marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 11 },
  primaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 11 },
  cancelText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
})
