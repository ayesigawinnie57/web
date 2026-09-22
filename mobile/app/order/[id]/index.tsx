import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Platform, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Package, MapPin, FileText, CheckCircle, Clock, Truck, XCircle, ShoppingBag, Star, CreditCard } from 'lucide-react-native'
import { ordersApi, productsApi, type ApiOrder } from '../../lib/products'
import { pushNotification } from '../../lib/NotificationContext'
import { C } from '../../theme'
import PaymentModal from '../../components/PaymentModal'

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'ready_for_pickup', 'delivered'] as const

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: 'Pending',    color: '#92400e', bg: '#fef3c7', icon: Clock      },
  processing: { label: 'Confirmed',  color: '#1e40af', bg: '#dbeafe', icon: Package    },
  shipped:    { label: 'Shipped',    color: '#6d28d9', bg: '#ede9fe', icon: Truck      },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#b45309', bg: '#fef9c3', icon: Package },
  delivered:  { label: 'Delivered',  color: '#166534', bg: '#dcfce7', icon: CheckCircle},
  cancelled:  { label: 'Cancelled',  color: '#991b1b', bg: '#fee2e2', icon: XCircle   },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function expectedDelivery(createdAt: string) {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + 3)
  return d.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function OrderDetailScreen() {
  const { id: code } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  // slug -> true means already reviewed, false means eligible to review
  const [reviewStatus, setReviewStatus] = useState<Record<string, boolean>>({})
  const notifiedStatus = useRef<string | null>(null)

  const fetchOrder = async () => {
    try {
      const { data } = await ordersApi.get(String(code))
        setOrder(data)
        if (notifiedStatus.current === data.status) return
        notifiedStatus.current = data.status
        const deliveryDate = expectedDelivery(data.created_at)
        const itemNames = data.items.map(i => i.product?.name ?? 'Item').join(', ')
        if (data.status === 'processing') {
          pushNotification({
            type: 'order',
            title: `✅ Order Confirmed — ${data.code}`,
            body: `Great news! Your order has been confirmed and is being prepared for dispatch.\n\nOrder No: ${data.code}\nItems: ${itemNames}\n\n📦 Expected Delivery\n${deliveryDate}\n\nWe'll let you know once it ships!`,
            time: 'Just now',
          })
        } else if (data.status === 'shipped') {
          pushNotification({
            type: 'order',
            title: `🚚 Order Shipped — ${data.code}`,
            body: `Your order is on its way! Our delivery team has picked it up and is heading to you.\n\nOrder No: ${data.code}\nItems: ${itemNames}\n\n📅 Estimated Arrival\n${deliveryDate}\n\nPlease be available to receive your package.`,
            time: 'Just now',
          })
        } else if (data.status === 'delivered') {
          pushNotification({
            type: 'order',
            title: `🎉 Order Delivered — ${data.code}`,
            body: `Your order has arrived! We hope you love your purchase.\n\nOrder No: ${data.code}\nItems: ${itemNames}\n\nEnjoy your new gadget(s) from Majo Gadgets!`,
            time: 'Just now',
          })
          // Check eligibility for each item and push notification only for unreviewed ones
          data.items.forEach((item: any) => {
            const slug = item.product?.slug
            if (!slug) return
            productsApi.checkEligibility(slug).then(({ data: elig }) => {
              setReviewStatus(prev => ({ ...prev, [slug]: !elig.eligible }))
              if (elig.eligible) {
                pushNotification({
                  type: 'product_rating',
                  title: '⭐ How do you like your new gadget?',
                  body: `You've received your order! Share your experience with ${item.product?.name ?? 'your product'} and help other Majo customers make better choices.|${slug}`,
                  time: 'Just now',
                })
              }
            }).catch(() => {})
          })
        }
    } catch { Alert.alert('Error', 'Could not load order details.') }
  }

  useEffect(() => {
    fetchOrder().finally(() => setLoading(false))
    const interval = setInterval(fetchOrder, 15000)
    return () => clearInterval(interval)
  }, [code])

  const handlePay = async () => {
    if (!order) return
    setPaying(true)
    setPayError('')
    try {
      const { data } = await ordersApi.pay(order.code)
      if (!data?.redirect_url) throw new Error('Pesapal did not return a payment link.')
      const paymentUrl = String(data.redirect_url).trim()
      if (Platform.OS === 'web') {
        setPaymentUrl(paymentUrl)
      } else {
        const canOpen = await Linking.canOpenURL(paymentUrl)
        if (!canOpen) throw new Error('This device cannot open the payment page.')
        await Linking.openURL(paymentUrl)
      }
    } catch (error: any) {
      const response = error?.response?.data
      setPayError(
        response?.detail
        ?? response?.error
        ?? (error?.response ? `Payment initiation failed (${error.response.status}).` : error?.message)
        ?? 'Payment initiation failed. Please try again.'
      )
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    )
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Order not found.</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/orders' as any)}><Text style={styles.backLink}>← Go Back</Text></TouchableOpacity>
      </View>
    )
  }

  const meta = STATUS_META[order.status] ?? STATUS_META.pending
  const StatusIcon = meta.icon
  const isCancelled = order.status === 'cancelled'
  const isPending = order.status === 'pending'
  const isDelivered = order.status === 'delivered'
  const currentStep = STATUS_STEPS.indexOf(order.status as any)

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${order.code}? This cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true)
            try {
              const { data } = await ordersApi.cancel(order.code)
              setOrder(data)
              notifiedStatus.current = 'cancelled'
              pushNotification({
                type: 'order',
                title: `❌ Order Cancelled — ${order.code}`,
                body: `Your order has been successfully cancelled.\n\nOrder No: ${order.code}\nItems: ${order.items.map(i => i.product?.name ?? 'Item').join(', ')}\n\nIf this was a mistake or you'd like to reorder, visit the shop anytime. We're always here for you at Majo Gadgets.`,
                time: 'Just now',
              })
            } catch (e: any) {
              Alert.alert('Failed', e?.response?.data?.detail ?? 'Could not cancel order.')
            } finally {
              setCancelling(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PaymentModal url={paymentUrl} onClose={() => setPaymentUrl('')} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/orders' as any)} style={styles.backBtn}>
          <ArrowLeft size={20} color={C.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSub}>Order No: <Text style={styles.headerCode}>{order.code}</Text></Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: meta.color }]}>
            <StatusIcon size={22} color="#fff" />
          </View>
          <View style={styles.deliveryCol}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.statusBannerLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={styles.deliveryDivider} />
          <View style={styles.deliveryCol}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.statusBannerDate}>{formatDate(order.updated_at)}</Text>
          </View>
        </View>

        {/* Expected delivery — hidden once delivered or cancelled */}
        {!isCancelled && !isDelivered && (
          <View style={styles.etaCard}>
            <View style={styles.etaIconWrap}>
              <Truck size={20} color={C.green} />
            </View>
            <View style={styles.etaInfo}>
              <Text style={styles.etaLabel}>Expected Delivery</Text>
              <Text style={styles.etaDate}>{expectedDelivery(order.created_at)}</Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.etaBadgeText}>3 days</Text>
            </View>
          </View>
        )}

        {/* Progress tracker — hidden for cancelled */}
        {!isCancelled && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order Progress</Text>
            </View>
            <View style={styles.progressRow}>
              {STATUS_STEPS.map((step, i) => {
                const done = currentStep >= i
                const active = i === currentStep
                const stepMeta = STATUS_META[step]
                const StepIcon = stepMeta.icon
                return (
                  <View key={step} style={styles.progressStep}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressLineLeft, { backgroundColor: i === 0 ? 'transparent' : currentStep >= i ? C.green : C.border }]} />
                      <View style={[
                        styles.progressDot,
                        done ? { backgroundColor: C.green, borderColor: C.green } : { backgroundColor: C.card, borderColor: C.border },
                        active && { borderColor: C.green },
                      ]}>
                        <StepIcon size={12} color={done ? '#fff' : C.mutedLight} />
                      </View>
                      <View style={[styles.progressLineRight, { backgroundColor: i === STATUS_STEPS.length - 1 ? 'transparent' : currentStep > i ? C.green : C.border }]} />
                    </View>
                    <Text style={[styles.progressLabel, done && { color: C.navy, fontWeight: '700' }]} numberOfLines={1}>
                      {stepMeta.label}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Order items */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <ShoppingBag size={15} color={C.green} />
            <Text style={styles.sectionTitle}>Items Ordered</Text>
            <Text style={styles.sectionCount}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Text>
          </View>
          {order.items.map((item, i) => {
            const slug = item.product?.slug
            const alreadyReviewed = slug ? reviewStatus[slug] === true : false
            const canReview = isDelivered && slug && reviewStatus[slug] === false
            return (
              <View key={item.id} style={[styles.itemRow, i < order.items.length - 1 && styles.itemDivider]}>
                {item.product?.image
                  ? <Image source={{ uri: item.product.image }} style={styles.itemThumb} resizeMode="cover" />
                  : <View style={styles.itemThumbEmpty}><Package size={18} color={C.mutedLight} /></View>
                }
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product?.name ?? 'Product'}</Text>
                  <Text style={styles.itemCategory}>{item.product?.category?.name ?? ''}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  {alreadyReviewed && (
                    <View style={styles.reviewedBadge}>
                      <CheckCircle size={11} color={C.green} />
                      <Text style={styles.reviewedBadgeText}>Reviewed</Text>
                    </View>
                  )}
                  {canReview && (
                    <TouchableOpacity
                      style={styles.rateBtn}
                      onPress={() => router.push({ pathname: '/product-review/[slug]', params: { slug: slug! } } as any)}
                    >
                      <Star size={12} color="#fff" fill="#fff" />
                      <Text style={styles.rateBtnText}>Rate Product</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.itemPriceCol}>
                  <Text style={styles.itemPrice}>UGX {(Number(item.price) * item.quantity).toLocaleString()}</Text>
                  <Text style={styles.itemUnit}>UGX {Number(item.price).toLocaleString()} each</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FileText size={15} color={C.green} />
            <Text style={styles.sectionTitle}>Payment Summary</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>UGX {Number(order.subtotal).toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={styles.priceValue}>UGX {Number(order.delivery_fee).toLocaleString()}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>UGX {Number(order.total).toLocaleString()}</Text>
          </View>
          {(order.status === 'pending' || order.status === 'processing') && (
            <View style={styles.paymentAction}>
              {payError ? <Text style={styles.payError}>{payError}</Text> : null}
              <TouchableOpacity style={[styles.payBtn, paying && styles.payBtnDisabled]} disabled={paying} onPress={handlePay}>
                {paying ? <ActivityIndicator color="#fff" /> : <><CreditCard size={15} color="#fff" /><Text style={styles.payBtnText}>Pay Now</Text></>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delivery info */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MapPin size={15} color={C.green} />
            <Text style={styles.sectionTitle}>Delivery Information</Text>
          </View>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryCol}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{order.delivery_address || '—'}</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryCol}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.phone || '—'}</Text>
            </View>
          </View>
          {order.note ? (
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
              <FileText size={14} color={C.mutedLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Note</Text>
                <Text style={styles.infoValue}>{order.note}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Order meta */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Clock size={15} color={C.green} />
            <Text style={styles.sectionTitle}>Order Info</Text>
          </View>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryCol}>
              <Text style={styles.infoLabel}>Placed on</Text>
              <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryCol}>
              <Text style={styles.infoLabel}>Last updated</Text>
              <Text style={styles.infoValue}>{formatDate(order.updated_at)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />

        {/* Cancel button — only for pending orders */}
        {isPending && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            {cancelling
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <>
                  <XCircle size={16} color="#ef4444" />
                  <Text style={styles.cancelBtnText}>Cancel Order</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Locked message — confirmed or beyond */}
        {!isPending && !isCancelled && (
          <View style={styles.lockedNote}>
            <CheckCircle size={14} color={C.green} />
            <Text style={styles.lockedNoteText}>Order confirmed — cancellation is no longer available.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: C.muted, marginBottom: 12 },
  backLink: { fontSize: 14, color: C.green, fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  headerCode: { fontWeight: '800', color: C.navy, letterSpacing: 1 },

  scroll: { padding: 16, gap: 12 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16 },
  statusIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusBannerLabel: { fontSize: 16, fontWeight: '800' },
  statusBannerDate: { fontSize: 11, color: C.muted, marginTop: 3 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.navy, flex: 1 },
  sectionCount: { fontSize: 11, color: C.muted, fontWeight: '600' },

  progressRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20 },
  progressStep: { flex: 1, alignItems: 'center' },
  progressTrack: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  progressLineLeft: { flex: 1, height: 2 },
  progressLineRight: { flex: 1, height: 2 },
  progressDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  progressLabel: { fontSize: 10, color: C.mutedLight, fontWeight: '600', marginTop: 6, textAlign: 'center' },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  itemThumb: { width: 56, height: 56, borderRadius: 10 },
  itemThumbEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontSize: 13, fontWeight: '700', color: C.navy, lineHeight: 18 },
  itemCategory: { fontSize: 11, color: C.mutedLight, textTransform: 'capitalize' },
  itemQty: { fontSize: 11, color: C.muted },
  itemPriceCol: { alignItems: 'flex-end' },
  itemPrice: { fontSize: 13, fontWeight: '800', color: C.navy },
  itemUnit: { fontSize: 10, color: C.mutedLight, marginTop: 3 },

  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rateBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  reviewedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reviewedBadgeText: { fontSize: 11, fontWeight: '700', color: C.green },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  priceLabel: { fontSize: 13, color: C.muted },
  priceValue: { fontSize: 13, color: C.navy, fontWeight: '600' },
  totalRow: { borderBottomWidth: 0 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: C.navy },
  totalValue: { fontSize: 15, fontWeight: '800', color: C.green },
  paymentAction: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  payError: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  payBtn: { height: 44, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  etaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', padding: 14 },
  etaIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  etaInfo: { flex: 1 },
  etaLabel: { fontSize: 11, color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  etaDate: { fontSize: 13, color: '#14532d', fontWeight: '800' },
  etaBadge: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  etaBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#ef4444', backgroundColor: '#fff1f2' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  lockedNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  lockedNoteText: { flex: 1, fontSize: 12, color: '#166534', fontWeight: '600' },

  deliveryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
  deliveryCol: { flex: 1 },
  deliveryDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: C.mutedLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 13, color: C.navy, fontWeight: '600', lineHeight: 18 },
})
