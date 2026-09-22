import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Pencil, Trash2, Plus, Grid2X2 } from 'lucide-react-native'
import { C } from '../../theme'
import { productsApi, type ApiCategory } from '../../lib/products'

export default function AdminCategories() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    productsApi.categories()
      .then(({ data }) => setCategories(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(() => Alert.alert('Error', 'Failed to load categories.'))
      .finally(() => setLoading(false))
  }, []))

  const categoryRows = categories.reduce<ApiCategory[][]>((rows, category, index) => {
    if (index % 2 === 0) rows.push([category])
    else rows[rows.length - 1].push(category)
    return rows
  }, [])

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete Category', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await productsApi.deleteCategory(id)
            setCategories((prev) => prev.filter((c) => c.id !== id))
          } catch {
            Alert.alert('Error', 'Failed to delete category.')
          }
        },
      },
    ])
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={C.green} size="large" /></View>

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories ({categories.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/admin/categories/add' as any)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        {categoryRows.length === 0 ? (
          <View style={styles.empty}>
            <Grid2X2 size={40} color={C.mutedLight} />
            <Text style={styles.emptyText}>No categories yet</Text>
          </View>
        ) : categoryRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map(item => (
              <View key={item.uuid} style={styles.row}>
            {item.image
              ? <Image key={`${item.id}:${item.image}`} source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
              : <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Grid2X2 size={22} color={C.mutedLight} />
                </View>
            }
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.slug}>{item.slug}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#6366f118' }]}
                onPress={() => router.push(`/admin/categories/${item.id}` as any)}
              >
                <Pencil size={15} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ef444418' }]}
                onPress={() => handleDelete(item.id, item.name)}
              >
                <Trash2 size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>
              </View>
            ))}
            {row.length === 1 && <View style={styles.emptySlot} />}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: '800', color: C.navy },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  grid: { padding: 16 },
  row: { width: '48%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 10 },
  emptySlot: { width: '48%' },
  thumb: { width: '100%', height: 110, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  info: { gap: 4, marginTop: 8, minHeight: 38 },
  name: { fontSize: 13, fontWeight: '700', color: C.navy },
  slug: { fontSize: 11, color: C.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: C.muted, fontSize: 14, fontWeight: '600' },
})
