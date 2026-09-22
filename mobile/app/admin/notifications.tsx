import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Bell, CheckCheck, Info, ShoppingBag, Tag, UserCheck } from 'lucide-react-native'
import { useNotifications, type NotificationType } from '../lib/NotificationContext'
import { C } from '../theme'

const META: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  order: { icon: ShoppingBag, color: C.green, bg: '#DCFCE7' },
  welcome: { icon: UserCheck, color: '#6366F1', bg: '#EEF2FF' },
  promo: { icon: Tag, color: '#F59E0B', bg: '#FEF3C7' },
  system: { icon: Info, color: C.muted, bg: C.border },
  service_rating: { icon: Info, color: C.muted, bg: C.border },
  product_rating: { icon: Info, color: C.muted, bg: C.border },
}

export default function AdminNotifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}><Bell size={20} color={C.navy} /><Text style={styles.title}>Admin Notifications</Text>{unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}</View>
        {unreadCount > 0 && <TouchableOpacity onPress={markAllRead} accessibilityLabel="Mark all admin notifications read"><CheckCheck size={20} color="#F97316" /></TouchableOpacity>}
      </View>
      {notifications.length === 0 ? <View style={styles.empty}><Bell size={44} color={C.border} /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.emptyText}>Admin alerts will appear here.</Text></View> : <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>{notifications.map(item => { const meta = META[item.type]; const Icon = meta.icon; return <TouchableOpacity key={item.id} style={[styles.item, !item.read && styles.unread]} onPress={() => markRead(item.id)}><View style={[styles.iconWrap, { backgroundColor: meta.bg }]}><Icon size={19} color={meta.color} /></View><View style={styles.copy}><View style={styles.itemTop}><Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.time}>{item.time}</Text></View><Text style={styles.body} numberOfLines={3}>{item.body.split('|')[0]}</Text></View>{!item.read && <View style={styles.dot} />}</TouchableOpacity> })}</ScrollView>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.navy, fontSize: 18, fontWeight: '800' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: { padding: 16, gap: 10, paddingBottom: 90 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  unread: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { flex: 1, color: C.navy, fontSize: 14, fontWeight: '700' },
  time: { color: C.mutedLight, fontSize: 10 },
  body: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316', marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: C.navy, fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptyText: { color: C.muted, fontSize: 13, marginTop: 8 },
})
