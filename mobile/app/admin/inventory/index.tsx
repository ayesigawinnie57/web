import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { AlertTriangle, Boxes, CheckCircle2, PackageX, Plus, RefreshCw } from 'lucide-react-native'
import { C } from '../../theme'
import api from '../../lib/api'
import { productsApi, type ApiProduct } from '../../lib/products'

type ApiInventorySummary = {
  total: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  low_stock_items: { id: number; name: string; stock: number }[]
  out_of_stock_items: { id: number; name: string; stock: number }[]
}

type ApiStockMovement = {
  id: number
  product: number
  product_name: string
  type: 'in' | 'out' | 'adjust' | 'return'
  quantity: number
  note: string
  created_by_name: string | null
  created_at: string
}

const TYPE_COLOR: Record<string, string> = {
  in: '#10b981',
  out: '#ef4444',
  adjust: '#6366f1',
  return: '#f59e0b',
}

const MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjust', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
] as const

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
}

export default function AdminInventory() {
  const [summary, setSummary] = useState<ApiInventorySummary | null>(null)
  const [movements, setMovements] = useState<ApiStockMovement[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    product: '',
    type: 'in',
    quantity: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryResponse, movementsResponse, productsResponse] = await Promise.all([
        api.get<ApiInventorySummary>('/api/inventory/summary/'),
        api.get<ApiStockMovement[]>('/api/inventory/movements/'),
        productsApi.listAll(),
      ])

      setSummary(summaryResponse.data)
      setMovements(Array.isArray(movementsResponse.data) ? movementsResponse.data : (movementsResponse.data as any).results ?? [])
      setProducts(productsResponse)
      setError('')
    } catch {
      setError('Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    load()
  }, [load]))

  const handleAdd = async () => {
    if (!form.product || !form.quantity) {
      Alert.alert('Missing data', 'Select a product and enter a quantity.')
      return
    }

    setSaving(true)
    try {
      await api.post('/api/inventory/movements/', {
        product: Number(form.product),
        type: form.type,
        quantity: form.type === 'out' ? -Math.abs(Number(form.quantity)) : Math.abs(Number(form.quantity)),
        note: form.note,
      })

      setModal(false)
      setForm({ product: '', type: 'in', quantity: '', note: '' })
      await load()
    } catch {
      setError('Failed to save movement.')
    } finally {
      setSaving(false)
    }
  }

  const stats = summary
    ? [
        { label: 'Total Products', value: summary.total, icon: Boxes, color: '#6366f1' },
        { label: 'In Stock', value: summary.in_stock, icon: CheckCircle2, color: '#10b981' },
        { label: 'Low Stock', value: summary.low_stock, icon: AlertTriangle, color: '#f59e0b' },
        { label: 'Out of Stock', value: summary.out_of_stock, icon: PackageX, color: '#ef4444' },
      ]
    : []

  const selectedProduct = products.find((item) => String(item.id) === form.product)

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleWrap}>
          <Boxes size={20} color={C.navy} />
          <Text style={styles.headerTitle}>Inventory</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => load()} style={styles.iconButton} accessibilityLabel="Refresh inventory">
            <RefreshCw size={16} color={C.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModal(true)} style={styles.primaryButton}>
            <Plus size={13} color="#fff" />
            <Text style={styles.primaryButtonText}>Add Movement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#22C55E" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            {stats.map(({ label, value, icon: Icon, color }) => (
              <View key={label} style={styles.statCard}>
                <View style={[styles.iconTile, { backgroundColor: `${color}18` }]}>
                  <Icon size={16} color={color} />
                </View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {(summary && (summary.low_stock_items.length > 0 || summary.out_of_stock_items.length > 0)) && (
            <View style={styles.alertGrid}>
              {summary.low_stock_items.length > 0 && (
                <View style={styles.alertCard}>
                  <Text style={[styles.alertHeading, { color: '#f59e0b' }]}>⚠ Low Stock</Text>
                  <View style={styles.alertList}>
                    {summary.low_stock_items.map((item) => (
                      <View key={item.id} style={styles.alertRow}>
                        <Text style={styles.alertItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.alertItemValue, { color: '#f59e0b' }]}>{item.stock} left</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {summary.out_of_stock_items.length > 0 && (
                <View style={styles.alertCard}>
                  <Text style={[styles.alertHeading, { color: '#ef4444' }]}>✕ Out of Stock</Text>
                  <View style={styles.alertList}>
                    {summary.out_of_stock_items.map((item) => (
                      <View key={item.id} style={styles.alertRow}>
                        <Text style={styles.alertItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.alertItemValue, { color: '#ef4444' }]}>0</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.movementsCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>Recent Stock Movements</Text>
            </View>

            {movements.length === 0 ? (
              <Text style={styles.emptyText}>No movements recorded yet.</Text>
            ) : (
              movements.map((movement) => (
                <View key={movement.id} style={styles.movementRow}>
                  <View style={[styles.pill, { backgroundColor: `${TYPE_COLOR[movement.type]}18` }]}>
                    <Text style={[styles.pillText, { color: TYPE_COLOR[movement.type] }]}>{movement.type}</Text>
                  </View>

                  <View style={styles.movementMeta}>
                    <Text style={styles.movementName} numberOfLines={1}>{movement.product_name}</Text>
                    {movement.note ? <Text style={styles.movementNote} numberOfLines={1}>{movement.note}</Text> : null}
                  </View>

                  <Text style={[styles.movementQuantity, { color: TYPE_COLOR[movement.type] }]}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </Text>
                  <Text style={styles.movementTime}>{timeAgo(movement.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {modal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Stock Movement</Text>

            <View style={styles.modalFields}>
              <Text style={styles.fieldLabel}>Product</Text>
              <View style={styles.productPickerWrap}>
                {selectedProduct ? (
                  <Text style={styles.selectedProductText}>{selectedProduct.name}</Text>
                ) : (
                  <Text style={styles.placeholderText}>Select product...</Text>
                )}
              </View>

              <View style={styles.optionList}>
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.optionItem,
                      String(product.id) === form.product && styles.optionItemActive,
                    ]}
                    onPress={() => setForm((prev) => ({ ...prev, product: String(product.id) }))}
                  >
                    <Text style={[
                      styles.optionItemText,
                      String(product.id) === form.product && styles.optionItemTextActive,
                    ]}>
                      {product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {MOVEMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typePill, form.type === type.value && styles.typePillActive]}
                    onPress={() => setForm((prev) => ({ ...prev, type: type.value }))}
                  >
                    <Text style={[styles.typePillText, form.type === type.value && styles.typePillTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                value={form.quantity}
                onChangeText={(value) => setForm((prev) => ({ ...prev, quantity: value }))}
                keyboardType="numeric"
                placeholder="Quantity"
                placeholderTextColor={C.mutedLight}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Note</Text>
              <TextInput
                value={form.note}
                onChangeText={(value) => setForm((prev) => ({ ...prev, note: value }))}
                placeholder="Note (optional)"
                placeholderTextColor={C.mutedLight}
                style={styles.input}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleAdd} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.navy,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.navy,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginHorizontal: 18,
    marginTop: 12,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
  },
  iconTile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.navy,
  },
  statLabel: {
    marginTop: 4,
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  alertGrid: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
  },
  alertHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  alertList: {
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  alertItemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: C.navy,
  },
  alertItemValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  movementsCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.navy,
  },
  emptyText: {
    color: C.mutedLight,
    fontSize: 12,
    padding: 18,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  movementMeta: {
    flex: 1,
    minWidth: 0,
  },
  movementName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.navy,
  },
  movementNote: {
    fontSize: 11,
    color: C.mutedLight,
    marginTop: 2,
  },
  movementQuantity: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'right',
  },
  movementTime: {
    fontSize: 11,
    color: C.mutedLight,
    minWidth: 48,
    textAlign: 'right',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  modalBox: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 16,
  },
  modalFields: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.navy,
    marginTop: 2,
  },
  productPickerWrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  selectedProductText: {
    color: C.navy,
    fontSize: 13,
    fontWeight: '700',
  },
  placeholderText: {
    color: C.mutedLight,
    fontSize: 13,
  },
  optionList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 6,
    backgroundColor: '#F8FAFC',
  },
  optionItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionItemActive: {
    backgroundColor: '#E2E8F0',
  },
  optionItemText: {
    fontSize: 12,
    color: C.navy,
    fontWeight: '600',
  },
  optionItemTextActive: {
    fontWeight: '800',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
  },
  typePillActive: {
    backgroundColor: '#071A2B',
    borderColor: '#071A2B',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.navy,
  },
  typePillTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.navy,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: C.navy,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
})
