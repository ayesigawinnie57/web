import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ArrowDownToLine, ArrowRight, Building2, Check, Clock3, Landmark, Settings, Smartphone, Wallet } from 'lucide-react-native'
import api from '../../lib/api'
import { C } from '../../theme'

type Method = '' | 'mobile_money' | 'bank'
type Earning = {
  id: number
  order_code: string
  product_name: string
  quantity: number
  seller_amount: string
  created_at: string
  available_at: string
  status: 'active' | 'reversed'
  return_request_status: string | null
}
type Withdrawal = {
  id: number
  payout_amount: string
  payout_provider: string
  status: string
  transfer_reference: string
  admin_note: string
  created_at: string
}
type WalletData = {
  total_earned: string
  locked_balance: string
  pending_withdrawal: string
  available_balance: string
  payout_minimum: string
  withdrawal_fee: string
  payout_hold_days: number
  payout_account: { method: Method; provider: string; account_name: string; account_number: string; branch: string }
  earnings: Earning[]
  withdrawals: Withdrawal[]
}
type Payout = {
  payout_method: Method
  payout_provider: string
  payout_account_name: string
  payout_account_number: string
  payout_branch: string
}

const NETWORKS = ['MTN', 'Airtel']
const BANKS = [
  'ABC Capital Bank', 'Absa Bank Uganda', 'Access Bank Uganda', 'Afriland First Bank Uganda',
  'Bank of Africa Uganda', 'Bank of Baroda Uganda',
  'Bank of India Uganda', 'Cairo Bank Uganda', 'Centenary Bank', 'Citibank Uganda',
  'dfcu Bank', 'Diamond Trust Bank Uganda', 'Ecobank Uganda', 'Equity Bank Uganda',
  'Exim Bank Uganda', 'Finance Trust Bank', 'Guaranty Trust Bank Uganda',
  'Housing Finance Bank', 'I&M Bank Uganda', 'KCB Bank Uganda', 'NCBA Bank Uganda',
  'Opportunity Bank Uganda', 'Orient Bank', 'PostBank Uganda', 'Stanbic Bank Uganda',
  'Standard Chartered Bank Uganda', 'Tropical Bank', 'United Bank for Africa Uganda',
  'Yako Bank',
]
const money = (value: string | number) => `UGX ${Number(value || 0).toLocaleString('en-UG')}`

function progressFor(earning: Earning) {
  const start = new Date(earning.created_at).getTime()
  const end = new Date(earning.available_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 100
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100))
}

export default function TraderPayments() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [payout, setPayout] = useState<Payout>({
    payout_method: '', payout_provider: '', payout_account_name: '', payout_account_number: '', payout_branch: '',
  })
  const [editing, setEditing] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const animation = useRef(new Animated.Value(0)).current

  const load = useCallback(async () => {
    if (!uuid) return
    const { data } = await api.get<WalletData>(`/api/traders/${uuid}/wallet/`)
    setWallet(data)
    setPayout({
      payout_method: data.payout_account.method || '',
      payout_provider: data.payout_account.provider || '',
      payout_account_name: data.payout_account.account_name || '',
      payout_account_number: data.payout_account.account_number || '',
      payout_branch: data.payout_account.branch || '',
    })
  }, [uuid])

  useFocusEffect(useCallback(() => {
    load().catch(() => setError('Could not load your payments. Please try again.'))
  }, [load]))

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(animation, { toValue: 1, duration: 2800, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [animation])

  const completePayout = Boolean(payout.payout_method && payout.payout_provider && payout.payout_account_name.trim() && payout.payout_account_number.trim())
  const options = payout.payout_method === 'bank' ? BANKS : NETWORKS
  const pendingReturnCount = useMemo(
    () => wallet?.earnings.filter(item => item.status === 'active' && item.return_request_status && item.return_request_status !== 'rejected').length ?? 0,
    [wallet],
  )

  const savePayout = async () => {
    if (!uuid || !completePayout) return
    setBusy(true); setError(''); setNotice('')
    try {
      await api.patch(`/api/traders/${uuid}/account/`, payout)
      await load()
      setEditing(false)
      setNotice('Payout account saved.')
    } catch {
      setError('Could not save your payout account.')
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!uuid || !amount) return
    setBusy(true); setError(''); setNotice('')
    try {
      await api.post(`/api/traders/${uuid}/wallet/`, { amount })
      await load()
      setAmount('')
      setNotice('Withdrawal request submitted. An admin will process the transfer.')
    } catch (requestError: any) {
      setError(requestError?.response?.data?.amount || requestError?.response?.data?.detail || 'Could not submit withdrawal request.')
    } finally {
      setBusy(false)
    }
  }

  if (!wallet) return <View style={styles.center}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading payments…</Text>{error ? <Text style={styles.error}>{error}</Text> : null}</View>

  const total = Number(wallet.total_earned)
  const available = Number(wallet.available_balance)
  const markerX = animation.interpolate({ inputRange: [0, 1], outputRange: [0, 250] })

  return <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <View><Text style={styles.eyebrow}>TRADER PORTAL</Text><Text style={styles.title}>Payments</Text><Text style={styles.muted}>Earnings, release dates, and withdrawals.</Text></View>
      <TouchableOpacity style={styles.settingsButton} onPress={() => setEditing(value => !value)} accessibilityLabel="Edit payout account settings">
        <Settings size={19} color={C.navy} /><Text style={styles.settingsText}>Settings</Text>
      </TouchableOpacity>
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.success}>{notice}</Text> : null}

    <View style={styles.walletCard}>
      <View style={styles.walletHeader}><View><Text style={styles.walletLabel}>WALLET BALANCE</Text><Text style={styles.walletAmount}>{money(wallet.total_earned)}</Text><Text style={styles.walletHint}>Successful, non-returned orders</Text></View><Wallet size={23} color={C.green} /></View>
      <View style={styles.routeBox}>
        <View style={styles.routeLabels}><Text style={styles.routeLabel}>Paid order</Text><Text style={styles.routeLabel}>Your account</Text></View>
        <View style={styles.routeTrack}>
          <View style={[styles.routeProgress, { width: `${total ? Math.max(8, Math.min(100, available / total * 100)) : 0}%` }]} />
          {total > 0 ? <Animated.View style={[styles.movingCoin, { transform: [{ translateX: markerX }] }]}><ArrowRight size={15} color={C.navy} /></Animated.View> : null}
        </View>
        <View style={styles.routeIcons}><CreditCardIcon /><View style={styles.destinationIcon}>{wallet.payout_account.method === 'bank' ? <Landmark size={17} color={C.navy} /> : wallet.payout_account.method ? <Smartphone size={17} color={C.navy} /> : <Building2 size={17} color={C.navy} />}</View></View>
        <Text style={styles.routeHint}>Funds unlock after the {wallet.payout_hold_days}-day return period. Return requests pause those earnings until resolved.</Text>
      </View>
      <View style={styles.balanceGrid}>
        <Balance label="Locked" value={money(wallet.locked_balance)} icon={<Clock3 size={15} color="rgba(255,255,255,.65)" />} />
        <Balance label="Available" value={money(wallet.available_balance)} icon={<ArrowDownToLine size={15} color="rgba(255,255,255,.65)" />} />
        <Balance label="Withdrawing" value={money(wallet.pending_withdrawal)} icon={<ArrowDownToLine size={15} color="rgba(255,255,255,.65)" />} />
      </View>
    </View>

    {editing ? <View style={styles.card}>
      <Text style={styles.cardTitle}>Payout account settings</Text>
      <Text style={styles.muted}>Choose where future withdrawals should be sent.</Text>
      <Text style={styles.fieldLabel}>METHOD</Text>
      <View style={styles.methodRow}>
        {(['mobile_money', 'bank'] as const).map(method => <TouchableOpacity key={method} style={[styles.methodButton, payout.payout_method === method && styles.methodSelected]} onPress={() => setPayout({ ...payout, payout_method: method, payout_provider: '' })}><Text style={[styles.methodText, payout.payout_method === method && styles.methodTextSelected]}>{method === 'bank' ? 'Bank' : 'Mobile Money'}</Text></TouchableOpacity>)}
      </View>
      {payout.payout_method ? <>
        <Text style={styles.fieldLabel}>{payout.payout_method === 'bank' ? 'BANK' : 'NETWORK'}</Text>
        <TouchableOpacity style={styles.selectInput} onPress={() => setSelecting(true)}><Text style={payout.payout_provider ? styles.inputText : styles.placeholder}>{payout.payout_provider || `Select ${payout.payout_method === 'bank' ? 'a bank' : 'MTN or Airtel'}`}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
      </> : null}
      <Text style={styles.fieldLabel}>ACCOUNT HOLDER NAME</Text>
      <TextInput value={payout.payout_account_name} onChangeText={value => setPayout({ ...payout, payout_account_name: value })} style={styles.input} placeholder="Name on the account" />
      <Text style={styles.fieldLabel}>{payout.payout_method === 'bank' ? 'ACCOUNT NUMBER' : 'MOBILE MONEY NUMBER'}</Text>
      <TextInput value={payout.payout_account_number} onChangeText={value => setPayout({ ...payout, payout_account_number: value })} style={styles.input} placeholder="Account or phone number" keyboardType="number-pad" />
      {payout.payout_method === 'bank' ? <>
        <Text style={styles.fieldLabel}>BRANCH (OPTIONAL)</Text>
        <TextInput value={payout.payout_branch} onChangeText={value => setPayout({ ...payout, payout_branch: value })} style={styles.input} placeholder="Branch" />
      </> : null}
      <TouchableOpacity style={[styles.primaryButton, (!completePayout || busy) && styles.disabled]} disabled={!completePayout || busy} onPress={savePayout}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save payout account'}</Text></TouchableOpacity>
    </View> : null}

    <View style={styles.columns}>
      <View style={styles.card}>
        <View style={styles.activityHeader}><View><Text style={styles.cardTitle}>Earning activity</Text><Text style={styles.muted}>Each order has its own release timer.</Text></View>{pendingReturnCount ? <Text style={styles.returnBadge}>{pendingReturnCount} return hold(s)</Text> : null}</View>
        {wallet.earnings.length === 0 ? <Text style={styles.empty}>Completed-order earnings will appear here.</Text> : wallet.earnings.map(item => {
          const progress = progressFor(item)
          const returnHeld = item.status === 'active' && Boolean(item.return_request_status) && item.return_request_status !== 'rejected'
          const released = progress >= 100 && !returnHeld && item.status === 'active'
          const fill = item.status === 'reversed' ? '#EF4444' : returnHeld ? '#F59E0B' : released ? C.green : '#3B82F6'
          return <View key={item.id} style={styles.earning}>
            <View style={styles.earningTop}><View style={styles.earningTitle}><Text style={styles.productName}>{item.product_name}</Text><Text style={styles.muted}>Order {item.order_code} · Qty {item.quantity}</Text></View><Text style={styles.earningAmount}>{money(item.seller_amount)}</Text></View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${item.status === 'reversed' ? 100 : returnHeld ? Math.min(95, progress) : progress}%`, backgroundColor: fill }]} /></View>
            <Text style={[styles.statusText, { color: fill }]}>{item.status === 'reversed' ? 'Returned / reversed' : returnHeld ? 'Return in review — payout paused' : released ? 'Available' : `Unlocks ${new Date(item.available_at).toLocaleDateString()}`}</Text>
          </View>
        })}
      </View>
      <View style={styles.sideColumn}>
        <View style={styles.card}>
          <View style={styles.destinationHeader}><View><Text style={styles.cardTitle}>Payout destination</Text><Text style={styles.muted}>Where withdrawals are sent.</Text></View><TouchableOpacity onPress={() => setEditing(value => !value)} accessibilityLabel="Edit payout account"><Settings size={18} color={C.muted} /></TouchableOpacity></View>
          {wallet.payout_account.method ? <Text style={styles.destinationDetail}>{wallet.payout_account.provider} · {wallet.payout_account.account_name}{'\n'}{wallet.payout_account.account_number}</Text> : <Text style={styles.empty}>Add your account details before requesting a withdrawal.</Text>}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Withdraw available funds</Text>
          <Text style={styles.muted}>An admin transfers the money and records a payment reference.</Text>
          <Text style={styles.fieldLabel}>AMOUNT (UGX)</Text>
          <TextInput value={amount} onChangeText={setAmount} style={styles.input} keyboardType="decimal-pad" placeholder={`Available: ${Number(wallet.available_balance).toLocaleString()}`} />
          <TouchableOpacity style={[styles.primaryButton, (!completePayout || available <= 0 || !amount || busy) && styles.disabled]} disabled={!completePayout || available <= 0 || !amount || busy} onPress={withdraw}><Text style={styles.primaryText}>{busy ? 'Submitting…' : 'Request withdrawal'}</Text></TouchableOpacity>
          <Text style={styles.feeText}>Minimum {money(wallet.payout_minimum)} · Fee {money(wallet.withdrawal_fee)}</Text>
        </View>
      </View>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Withdrawal history</Text>
      {wallet.withdrawals.length ? wallet.withdrawals.map(row => <View key={row.id} style={styles.historyRow}><View style={styles.earningTitle}><Text style={styles.productName}>{money(row.payout_amount)} · {row.payout_provider}</Text><Text style={styles.muted}>{new Date(row.created_at).toLocaleDateString()}{row.transfer_reference ? ` · ${row.transfer_reference}` : ''}</Text>{row.admin_note ? <Text style={styles.muted}>{row.admin_note}</Text> : null}</View><Text style={[styles.statusText, { color: row.status === 'paid' ? '#15803D' : row.status === 'rejected' ? '#DC2626' : '#B45309' }]}>{row.status}</Text></View>) : <Text style={styles.empty}>No withdrawal requests yet.</Text>}
    </View>

    <Modal visible={selecting} transparent animationType="fade" onRequestClose={() => setSelecting(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setSelecting(false)}>
        <View style={styles.optionSheet}>
          <Text style={styles.cardTitle}>Choose {payout.payout_method === 'bank' ? 'your bank' : 'mobile network'}</Text>
          <ScrollView style={styles.optionsList}>
            {options.map(option => <TouchableOpacity key={option} style={styles.optionRow} onPress={() => { setPayout({ ...payout, payout_provider: option }); setSelecting(false) }}>
              <Text style={styles.inputText}>{option}</Text>{payout.payout_provider === option ? <Check size={17} color={C.green} /> : null}
            </TouchableOpacity>)}
          </ScrollView>
          <TouchableOpacity onPress={() => setSelecting(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  </ScrollView>
}

function CreditCardIcon() {
  return <View style={styles.cardSource}><Wallet size={16} color={C.navy} /></View>
}

function Balance({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <View style={styles.balance}><View style={styles.balanceLabel}>{icon}<Text style={styles.balanceCaption}>{label}</Text></View><Text style={styles.balanceValue}>{value}</Text></View>
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 110, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  eyebrow: { color: C.green, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  title: { color: C.navy, fontSize: 24, fontWeight: '900', marginTop: 3 },
  muted: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  settingsButton: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, alignItems: 'center', gap: 3 },
  settingsText: { color: C.navy, fontSize: 9, fontWeight: '700' },
  error: { padding: 11, color: '#B91C1C', backgroundColor: '#FEF2F2', borderRadius: 8, fontSize: 12 },
  success: { padding: 11, color: '#166534', backgroundColor: '#F0FDF4', borderRadius: 8, fontSize: 12 },
  walletCard: { backgroundColor: C.navy, borderRadius: 16, padding: 17, gap: 15 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletLabel: { color: 'rgba(255,255,255,.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  walletAmount: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 5 },
  walletHint: { color: 'rgba(255,255,255,.6)', fontSize: 11, marginTop: 3 },
  routeBox: { borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 12, backgroundColor: 'rgba(255,255,255,.04)' },
  routeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  routeLabel: { color: 'rgba(255,255,255,.68)', fontSize: 10, fontWeight: '700' },
  routeTrack: { height: 7, backgroundColor: 'rgba(255,255,255,.16)', borderRadius: 10, marginVertical: 15, justifyContent: 'center' },
  routeProgress: { height: 7, backgroundColor: C.green, borderRadius: 10 },
  movingCoin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  routeIcons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSource: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  destinationIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  routeHint: { color: 'rgba(255,255,255,.62)', fontSize: 10, lineHeight: 15, marginTop: 9 },
  balanceGrid: { flexDirection: 'row', gap: 8 },
  balance: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 9, padding: 9 },
  balanceLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceCaption: { color: 'rgba(255,255,255,.62)', fontSize: 9, fontWeight: '700', flexShrink: 1 },
  balanceValue: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 6 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 15 },
  cardTitle: { color: C.navy, fontSize: 14, fontWeight: '900' },
  fieldLabel: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: .7, marginTop: 13, marginBottom: 5 },
  methodRow: { flexDirection: 'row', gap: 9 },
  methodButton: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  methodSelected: { borderColor: C.green, backgroundColor: '#F0FDF4' },
  methodText: { fontSize: 12, fontWeight: '700', color: C.muted },
  methodTextSelected: { color: C.navy },
  selectInput: { minHeight: 43, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { minHeight: 43, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 11, fontSize: 12, color: C.navy, backgroundColor: '#fff' },
  inputText: { color: C.navy, fontSize: 12 },
  placeholder: { color: C.mutedLight, fontSize: 12 },
  chevron: { color: C.muted, fontSize: 17 },
  primaryButton: { marginTop: 14, minHeight: 43, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { color: C.navy, fontWeight: '900', fontSize: 12 },
  disabled: { opacity: .48 },
  feeText: { color: C.mutedLight, textAlign: 'center', fontSize: 9, marginTop: 8 },
  columns: { gap: 14 },
  sideColumn: { gap: 14 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  returnBadge: { color: '#92400E', backgroundColor: '#FEF3C7', fontSize: 9, fontWeight: '800', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12 },
  earning: { borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 12 },
  earningTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  earningTitle: { flex: 1 },
  productName: { color: C.navy, fontSize: 11, fontWeight: '800' },
  earningAmount: { color: C.navy, fontSize: 11, fontWeight: '900' },
  progressTrack: { height: 5, backgroundColor: '#E2E8F0', borderRadius: 8, marginTop: 9, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', marginTop: 6 },
  destinationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destinationDetail: { marginTop: 12, padding: 11, borderRadius: 8, backgroundColor: C.bg, color: C.navy, fontSize: 11, lineHeight: 18, fontWeight: '700' },
  empty: { color: C.muted, fontSize: 11, textAlign: 'center', paddingVertical: 16 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 11 },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(7,26,43,.5)', padding: 20 },
  optionSheet: { backgroundColor: '#fff', borderRadius: 14, padding: 17, maxHeight: '80%' },
  optionsList: { marginTop: 10 },
  optionRow: { minHeight: 44, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelButton: { marginTop: 12, alignItems: 'center', padding: 10 },
  cancelText: { color: C.muted, fontWeight: '800', fontSize: 12 },
})
