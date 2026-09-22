import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TextInput, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Users, ShieldCheck, User, Search, Trash2 } from 'lucide-react-native'
import { C } from '../../theme'
import api from '../../lib/api'

type AppUser = {
  id: number
  name: string
  email: string
  phone: string
  avatar: string | null
  is_staff: boolean
  created_at: string
}

export default function AdminUsers() {
  const insets = useSafeAreaInsets()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'staff'>('users')
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useFocusEffect(useCallback(() => {
    setLoading(true)
    api.get<AppUser[]>('/api/auth/admin/users/')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []))

  const normalUsers = users.filter(u => !u.is_staff)
  const staffUsers = users.filter(u => u.is_staff)
  const list = tab === 'staff' ? staffUsers : normalUsers
  const filtered = search.trim()
    ? list.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : list

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await api.delete(`/api/auth/admin/users/${id}/`)
      setUsers(current => current.filter(user => user.id !== id))
    } catch {}
    setDeletingId(null)
    setConfirmId(null)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={20} color={C.navy} />
          <Text style={styles.title}>Users</Text>
        </View>
        <Text style={styles.count}>{users.length} total</Text>
      </View>

      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => { setTab('users'); setSearch(''); setConfirmId(null) }}
        >
          <User size={13} color={tab === 'users' ? C.navy : C.muted} />
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
          <Text style={[styles.tabCount, tab === 'users' && styles.tabCountActive]}>{normalUsers.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'staff' && styles.tabActive]}
          onPress={() => { setTab('staff'); setSearch(''); setConfirmId(null) }}
        >
          <ShieldCheck size={13} color={tab === 'staff' ? C.navy : C.muted} />
          <Text style={[styles.tabText, tab === 'staff' && styles.tabTextActive]}>Staff</Text>
          <Text style={[styles.tabCount, tab === 'staff' && styles.tabCountActive]}>{staffUsers.length}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={15} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={C.mutedLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading
        ? <ActivityIndicator color={C.green} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 && (
              <Text style={styles.empty}>No users found.</Text>
            )}
            {filtered.map(u => (
              <View key={u.id} style={styles.card}>
                {u.avatar
                  ? <Image source={{ uri: u.avatar }} style={styles.avatar} />
                  : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <User size={20} color={C.muted} />
                    </View>
                  )
                }
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                    {u.is_staff && (
                      <View style={styles.staffBadge}>
                        <ShieldCheck size={11} color="#6366f1" />
                        <Text style={styles.staffText}>Staff</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                  {u.phone ? <Text style={styles.phone}>{u.phone}</Text> : null}
                </View>
                <Text style={styles.date}>{new Date(u.created_at).toLocaleDateString()}</Text>
                {confirmId === u.id ? (
                  <View style={styles.confirmActions}>
                    <TouchableOpacity style={styles.confirmButton} onPress={() => handleDelete(u.id)} disabled={deletingId === u.id}>
                      <Text style={styles.confirmText}>{deletingId === u.id ? '...' : 'Confirm'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmId(null)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmId(u.id)} accessibilityLabel={`Delete ${u.name}`}>
                    <Trash2 size={15} color={C.mutedLight} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: C.navy },
  count: { fontSize: 12, fontWeight: '600', color: C.muted },
  tabsWrap: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4, marginHorizontal: 16, marginTop: 16, padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  tabText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: C.navy },
  tabCount: { color: C.mutedLight, backgroundColor: C.card, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, fontSize: 10, fontWeight: '700' },
  tabCountActive: { color: C.muted, backgroundColor: '#F1F5F9' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: C.navy },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  empty: { textAlign: 'center', color: C.muted, marginTop: 40, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: C.navy, flexShrink: 1 },
  staffBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#6366f118', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  staffText: { fontSize: 10, fontWeight: '700', color: '#6366f1' },
  email: { fontSize: 12, color: C.muted },
  phone: { fontSize: 11, color: C.mutedLight },
  date: { fontSize: 11, color: C.mutedLight, alignSelf: 'flex-start' },
  deleteButton: { padding: 8, borderRadius: 8 },
  confirmActions: { alignItems: 'flex-end', gap: 5 },
  confirmButton: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cancelButton: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  cancelText: { color: C.muted, fontSize: 10, fontWeight: '700' },
})
