import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import {
  ArrowLeft, Bell, ShoppingBag, UserCheck, Tag, Info,
  CheckCheck, Trash2, X, PackageCheck, Truck, Star,
} from 'lucide-react-native'
import { C } from './theme'
import { useNotifications, type Notification, type NotificationType } from './lib/NotificationContext'

const ICON_MAP: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  order:          { icon: ShoppingBag, color: C.green,   bg: '#DCFCE7' },
  welcome:        { icon: UserCheck,   color: '#6366F1', bg: '#EEF2FF' },
  promo:          { icon: Tag,         color: '#F59E0B', bg: '#FEF3C7' },
  system:         { icon: Info,        color: C.muted,   bg: C.border  },
  service_rating: { icon: Star,        color: '#F59E0B', bg: '#FEF3C7' },
  product_rating: { icon: Star,        color: C.green,   bg: '#DCFCE7' },
}

// pick a richer icon for specific order titles
function OrderIcon({ title, color }: { title: string; color: string }) {
  if (title.toLowerCase().includes('ship')) return <Truck size={20} color={color} />
  if (title.toLowerCase().includes('confirm')) return <PackageCheck size={20} color={color} />
  return <ShoppingBag size={20} color={color} />
}

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead, markSelectedRead, deleteNotification, deleteSelected } = useNotifications()

  const [selected, setSelected] = useState<string[]>([])
  const selecting = selected.length > 0

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handlePress = (n: Notification) => {
    if (selecting) { toggleSelect(n.id); return }
    markRead(n.id)
    router.push(`/notification/${n.id}` as any)
  }

  const handleLongPress = (n: Notification) => toggleSelect(n.id)

  const bulkDelete = () => { deleteSelected(selected); setSelected([]) }
  const bulkMarkRead = () => { markSelectedRead(selected); setSelected([]) }
  const cancelSelect = () => setSelected([])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selecting ? (
          <>
            <TouchableOpacity onPress={cancelSelect}>
              <X size={22} color={C.navy} />
            </TouchableOpacity>
            <Text style={styles.title}>{selected.length} selected</Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity onPress={bulkMarkRead} accessibilityLabel="Mark selected read">
                <CheckCheck size={20} color={C.green} />
              </TouchableOpacity>
              <TouchableOpacity onPress={bulkDelete} accessibilityLabel="Delete selected">
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={C.navy} />
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <Bell size={19} color={C.navy} />
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setSelected(notifications.map(n => n.id))} accessibilityLabel="Select notifications">
                  <Text style={styles.selectText}>Select</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={markAllRead} accessibilityLabel="Mark all as read">
                  <CheckCheck size={20} color={C.green} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setSelected(notifications.map(n => n.id))} accessibilityLabel="Select notifications">
                <Text style={styles.selectText}>Select</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={44} color={C.border} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>You'll see order updates, offers, and more here.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {notifications.map(n => {
            const { icon: Icon, color, bg } = ICON_MAP[n.type]
            const isSelected = selected.includes(n.id)
            const isOrderNotification = n.type.startsWith(String.fromCharCode(111, 114, 100))
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.item, !n.read && styles.itemUnread, isSelected && styles.itemSelected]}
                onPress={() => handlePress(n)}
                onLongPress={() => handleLongPress(n)}
                delayLongPress={350}
                activeOpacity={0.75}
              >
                {/* selection circle */}
                {selecting && (
                  <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                    {isSelected && <CheckCheck size={12} color="#fff" />}
                  </View>
                )}

                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  {isOrderNotification
                    ? <OrderIcon title={n.title} color={color} />
                    : <Icon size={20} color={color} />}
                </View>

                <View style={styles.body}>
                  <View style={styles.topRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.time}>{n.time}</Text>
                  </View>
                  <Text style={styles.itemBody} numberOfLines={2}>{n.body.split('|')[0]}</Text>
                </View>

                <View style={styles.rightCol}>
                  {!n.read && <View style={styles.dot} />}
                  {!selecting && (
                    <TouchableOpacity
                      onPress={() => deleteNotification(n.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete notification"
                    >
                      <Trash2 size={15} color={C.mutedLight} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { color: C.navy, fontSize: 18, fontWeight: '800' },
  badge: { backgroundColor: '#ef4444', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bulkActions: { flexDirection: 'row', gap: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  selectText: { color: C.green, fontSize: 12, fontWeight: '800' },

  list: { padding: 16, gap: 10, paddingBottom: 100 },
  item: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: C.border },
  itemUnread: { borderColor: C.green, backgroundColor: '#F0FDF4' },
  itemSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },

  selectCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.mutedLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  selectCircleActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },

  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { color: C.navy, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { color: C.mutedLight, fontSize: 11, flexShrink: 0 },
  itemBody: { color: C.muted, fontSize: 13, lineHeight: 18 },
  rightCol: { alignItems: 'center', gap: 8, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: C.navy, fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },


})
