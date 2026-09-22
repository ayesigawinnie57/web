import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import {
  AlertTriangle,
  Boxes,
  CreditCard,
  DollarSign,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native'
import { C } from '../../theme'
import api from '../../lib/api'

type ApiAccountingDashboard = {
  total_revenue: number
  cogs: number
  gross_profit: number
  total_expenses: number
  net_profit: number
  gross_margin: number
  cash_bank: number
  inventory_cost: number
  inventory_sales_value: number
  receivables: number
  payables: number
  today_revenue: number
  today_expenses: number
  today_orders: number
  today_refunds: number
  accounts: { name: string; type: string; balance: number; currency: string }[]
  monthly: { month: string; revenue: number; count: number }[]
}

type ApiSupplier = {
  id: number
  name: string
  contact_name: string
  email: string
  phone: string
  country: string
  address: string
  payment_terms: string
  notes: string
  created_at: string
}

type ApiPurchase = {
  id: number
  supplier: number
  supplier_name: string
  product: number
  product_name: string
  purchase_date: string
  quantity: number
  unit_cost: string
  shipping_cost: string
  customs_cost: string
  other_cost: string
  amount_paid: string
  landed_cost: string
  outstanding: string
  status: string
}

type ApiExpenseCategory = {
  id: number
  name: string
  group: string
}

type ApiExpense = {
  id: number
  date: string
  category: number
  category_name: string
  category_group: string
  description: string
  amount: string
  payment_method: string
  vendor: string
  notes: string
}

type ApiAccount = {
  id: number
  name: string
  type: string
  balance: string
  currency: string
  notes: string
}

type ApiTransfer = {
  id: number
  from_account_name: string
  to_account_name: string
  amount: string
  date: string
}

type ApiReceivable = {
  id: number
  customer_name: string
  invoice_ref: string
  amount: string
  amount_paid: string
  balance: string
  due_date: string
  status: string
}

type ApiPayable = {
  id: number
  supplier_name: string
  invoice_ref: string
  amount: string
  amount_paid: string
  balance: string
  due_date: string
  status: string
}

type ApiTaxRecord = {
  id: number
  tax_type: string
  period_start: string
  period_end: string
  taxable_amount: string
  tax_amount: string
  status: string
}

type ApiRefund = {
  id: number
  customer_name: string
  product_name: string
  return_reason: string
  refund_amount: string
  refund_method: string
  restock: boolean
  status: string
}

type ApiEmployee = {
  id: number
  name: string
  email: string
  phone: string
  role: string
  salary: string
  commission_pct: string
  joined_at: string | null
}

type ApiFixedAsset = {
  id: number
  name: string
  purchase_price: string
  purchase_date: string
  useful_life_years: number
  annual_depreciation: string
  location: string
}

type ApiAuditLog = {
  id: number
  user_name: string | null
  action: string
  model_name: string
  object_id: string
  created_at: string
}

const fmt = (n: number | string) => `UGX ${Number(n || 0).toLocaleString()}`
const pct = (n: number) => `${n.toFixed(2)}%`

const TABS = [
  'Dashboard',
  'Sales',
  'Purchases',
  'Expenses',
  'Accounts',
  'Receivables',
  'Payables',
  'Taxes',
  'Refunds',
  'Suppliers',
  'Employees',
  'Assets',
  'Audit',
] as const

type TabKey = (typeof TABS)[number]

const STATUS_COLOR: Record<string, string> = {
  paid: '#10b981',
  completed: '#10b981',
  approved: '#10b981',
  filed: '#10b981',
  active: '#10b981',
  pending: '#f59e0b',
  open: '#6366f1',
  partial: '#f59e0b',
  overdue: '#ef4444',
  rejected: '#ef4444',
  failed: '#ef4444',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#94a3b8'
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}> 
        <Icon size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function SectionHeader({ title, action, secondaryAction }: { title: string; action?: string; secondaryAction?: string }) {
  const showAction = (label: string) => Alert.alert(`Add ${label}`, `The ${label.toLowerCase()} form is ready to be connected to the accounting API.`)
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      {(action || secondaryAction) && (
        <View style={styles.headerActions}>
          {secondaryAction ? (
            <TouchableOpacity style={styles.secondaryAction} onPress={() => showAction(secondaryAction)}>
              <Text style={styles.secondaryActionText}>{secondaryAction}</Text>
            </TouchableOpacity>
          ) : null}
          {action ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => showAction(action)}>
              <Plus size={12} color="#fff" />
              <Text style={styles.primaryActionText}>{action}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  )
}

export default function AdminAccounting() {
  const [activeTab, setActiveTab] = useState<TabKey>('Dashboard')
  const [dashboard, setDashboard] = useState<ApiAccountingDashboard | null>(null)
  const [salesRows, setSalesRows] = useState<any[]>([])
  const [purchaseRows, setPurchaseRows] = useState<ApiPurchase[]>([])
  const [expenseRows, setExpenseRows] = useState<ApiExpense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ApiExpenseCategory[]>([])
  const [accountRows, setAccountRows] = useState<ApiAccount[]>([])
  const [transferRows, setTransferRows] = useState<ApiTransfer[]>([])
  const [receivableRows, setReceivableRows] = useState<ApiReceivable[]>([])
  const [payableRows, setPayableRows] = useState<ApiPayable[]>([])
  const [taxRows, setTaxRows] = useState<ApiTaxRecord[]>([])
  const [refundRows, setRefundRows] = useState<ApiRefund[]>([])
  const [supplierRows, setSupplierRows] = useState<ApiSupplier[]>([])
  const [employeeRows, setEmployeeRows] = useState<ApiEmployee[]>([])
  const [assetRows, setAssetRows] = useState<ApiFixedAsset[]>([])
  const [auditRows, setAuditRows] = useState<ApiAuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardRes, salesRes, purchasesRes, expensesRes, categoriesRes, accountsRes, transfersRes, receivablesRes, payablesRes, taxesRes, refundsRes, suppliersRes, employeesRes, assetsRes, auditRes] = await Promise.all([
        api.get<ApiAccountingDashboard>('/api/accounting/dashboard/'),
        api.get<any>('/api/orders/admin/'),
        api.get<ApiPurchase[]>('/api/accounting/purchases/'),
        api.get<ApiExpense[]>('/api/accounting/expenses/'),
        api.get<ApiExpenseCategory[]>('/api/accounting/expense-categories/'),
        api.get<ApiAccount[]>('/api/accounting/accounts/'),
        api.get<ApiTransfer[]>('/api/accounting/transfers/'),
        api.get<ApiReceivable[]>('/api/accounting/receivables/'),
        api.get<ApiPayable[]>('/api/accounting/payables/'),
        api.get<ApiTaxRecord[]>('/api/accounting/taxes/'),
        api.get<ApiRefund[]>('/api/accounting/refunds/'),
        api.get<ApiSupplier[]>('/api/accounting/suppliers/'),
        api.get<ApiEmployee[]>('/api/accounting/employees/'),
        api.get<ApiFixedAsset[]>('/api/accounting/assets/'),
        api.get<ApiAuditLog[]>('/api/accounting/audit/'),
      ])

      const toArray = (value: any) => (Array.isArray(value) ? value : value?.results ?? [])

      setDashboard(dashboardRes.data)
      setSalesRows(toArray(salesRes.data))
      setPurchaseRows(toArray(purchasesRes.data))
      setExpenseRows(toArray(expensesRes.data))
      setExpenseCategories(toArray(categoriesRes.data))
      setAccountRows(toArray(accountsRes.data))
      setTransferRows(toArray(transfersRes.data))
      setReceivableRows(toArray(receivablesRes.data))
      setPayableRows(toArray(payablesRes.data))
      setTaxRows(toArray(taxesRes.data))
      setRefundRows(toArray(refundsRes.data))
      setSupplierRows(toArray(suppliersRes.data))
      setEmployeeRows(toArray(employeesRes.data))
      setAssetRows(toArray(assetsRes.data))
      setAuditRows(toArray(auditRes.data))
    } catch {
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    loadData()
  }, [loadData]))

  const totalAccountsValue = useMemo(
    () => accountRows.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    [accountRows]
  )

  const profitMetrics = dashboard ? [
    { label: 'Revenue', value: fmt(dashboard.total_revenue), color: '#22C55E' },
    { label: 'COGS', value: fmt(dashboard.cogs), color: '#f59e0b' },
    { label: 'Gross Profit', value: fmt(dashboard.gross_profit), color: '#6366f1' },
    { label: 'Expenses', value: fmt(dashboard.total_expenses), color: '#ef4444' },
    { label: 'Net Profit', value: fmt(dashboard.net_profit), color: dashboard.net_profit >= 0 ? '#22C55E' : '#ef4444' },
    { label: 'Gross Margin', value: pct(dashboard.gross_margin), color: '#0ea5e9' },
  ] : []

  const renderDashboard = () => (
    <View style={styles.tabContent}>
      {dashboard ? (
        <>
          <View style={styles.darkPanel}>
            <Text style={styles.darkPanelTitle}>Profit & Loss</Text>
            <View style={styles.darkGrid}>
              {profitMetrics.map(({ label, value, color }) => (
                <View key={label} style={styles.darkStat}>
                  <Text style={styles.darkLabel}>{label}</Text>
                  <Text style={[styles.darkValue, { color }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Today's Sales" value={fmt(dashboard.today_revenue)} icon={TrendingUp} color="#22C55E" />
            <StatCard label="Today's Expenses" value={fmt(dashboard.today_expenses)} icon={TrendingDown} color="#ef4444" />
            <StatCard label="Today's Orders" value={String(dashboard.today_orders)} icon={ShoppingBag} color="#6366f1" />
            <StatCard label="Today's Refunds" value={fmt(dashboard.today_refunds)} icon={ReceiptText} color="#f59e0b" />
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Cash & Bank" value={fmt(dashboard.cash_bank)} icon={CreditCard} color="#0ea5e9" />
            <StatCard label="Inventory Cost" value={fmt(dashboard.inventory_cost)} icon={Package} color="#8b5cf6" sub={`Sales: ${fmt(dashboard.inventory_sales_value)}`} />
            <StatCard label="Receivables" value={fmt(dashboard.receivables)} icon={TrendingUp} color="#10b981" />
            <StatCard label="Payables" value={fmt(dashboard.payables)} icon={TrendingDown} color="#ef4444" />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Accounts</Text>
            </View>
            {dashboard.accounts.map((item, idx) => (
              <View key={`${item.name}-${idx}`} style={[styles.rowItem, idx < dashboard.accounts.length - 1 && styles.rowItemBorder]}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.type.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.rowValue}>{item.currency} {Number(item.balance).toLocaleString()}</Text>
              </View>
            ))}
          </View>

          {dashboard.monthly.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Monthly Revenue</Text>
              </View>
              <View style={styles.chartList}>
                {dashboard.monthly.slice(-6).map((month) => {
                  const max = Math.max(...dashboard.monthly.map((m) => m.revenue), 1)
                  return (
                    <View key={month.month} style={styles.chartRow}>
                      <Text style={styles.chartMonth}>{month.month}</Text>
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFill, { width: `${(month.revenue / max) * 100}%` }]} />
                      </View>
                      <Text style={styles.chartValue}>{fmt(month.revenue)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No accounting data available.</Text>
      )}
    </View>
  )

  const renderSales = () => (
    <View style={styles.card}>
      <SectionHeader title="Sales & Revenue" />
      {salesRows.length === 0 ? (
        <Text style={styles.emptyText}>No orders yet.</Text>
      ) : (
        salesRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.code}</Text>
              <Text style={styles.rowMeta}>{row.user_name ?? '—'} · {new Date(row.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.total)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderPurchases = () => (
    <View style={styles.card}>
      <SectionHeader title="Purchases & COGS" action="Add" />
      {purchaseRows.length === 0 ? (
        <Text style={styles.emptyText}>No purchases yet.</Text>
      ) : (
        purchaseRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}> 
              <Text style={styles.rowTitle}>{row.product_name}</Text>
              <Text style={styles.rowMeta}>{row.supplier_name} · {row.purchase_date}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.landed_cost)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderExpenses = () => (
    <View style={styles.card}>
      <SectionHeader title="Expenses" action="Add" secondaryAction="Category" />
      {expenseRows.length === 0 ? (
        <Text style={styles.emptyText}>No expenses yet.</Text>
      ) : (
        expenseRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.description}</Text>
              <Text style={styles.rowMeta}>{row.category_group}/{row.category_name} · {row.date}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={[styles.rowValue, { color: '#ef4444' }]}>{fmt(row.amount)}</Text>
              <Text style={styles.rowMeta}>{row.payment_method}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderAccounts = () => (
    <View style={styles.card}>
      <SectionHeader title={`Accounts · ${fmt(totalAccountsValue)}`} action="Account" secondaryAction="Transfer" />
      {accountRows.length === 0 ? (
        <Text style={styles.emptyText}>No accounts yet.</Text>
      ) : (
        accountRows.map((row, idx) => (
          <View key={row.id} style={[styles.rowItem, idx < accountRows.length - 1 && styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.rowMeta}>{row.type}</Text>
            </View>
            <Text style={styles.rowValue}>{row.currency} {Number(row.balance).toLocaleString()}</Text>
          </View>
        ))
      )}

      {transferRows.length > 0 && (
        <View style={styles.transferSection}>
          <Text style={styles.subSectionTitle}>Transfers</Text>
          {transferRows.slice(0, 6).map((transfer) => (
            <View key={transfer.id} style={[styles.rowItem, styles.rowItemBorder]}>
              <Text style={styles.rowMeta}>{transfer.from_account_name} → {transfer.to_account_name}</Text>
              <Text style={styles.rowValue}>{fmt(transfer.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )

  const renderReceivables = () => (
    <View style={styles.card}>
      <SectionHeader title="Receivables" action="Add" />
      {receivableRows.length === 0 ? (
        <Text style={styles.emptyText}>No receivables yet.</Text>
      ) : (
        receivableRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.customer_name}</Text>
              <Text style={styles.rowMeta}>{row.invoice_ref || '—'} · Due {row.due_date}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.balance)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderPayables = () => (
    <View style={styles.card}>
      <SectionHeader title="Payables" action="Add" />
      {payableRows.length === 0 ? (
        <Text style={styles.emptyText}>No payables yet.</Text>
      ) : (
        payableRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.supplier_name}</Text>
              <Text style={styles.rowMeta}>{row.invoice_ref || '—'} · Due {row.due_date}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={[styles.rowValue, { color: '#ef4444' }]}>{fmt(row.balance)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderTaxes = () => (
    <View style={styles.card}>
      <SectionHeader title="Tax Records" action="Add" />
      {taxRows.length === 0 ? (
        <Text style={styles.emptyText}>No tax records yet.</Text>
      ) : (
        taxRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.tax_type.toUpperCase()}</Text>
              <Text style={styles.rowMeta}>{row.period_start} – {row.period_end}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.tax_amount)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderRefunds = () => (
    <View style={styles.card}>
      <SectionHeader title="Refunds & Returns" action="Add" />
      {refundRows.length === 0 ? (
        <Text style={styles.emptyText}>No refunds yet.</Text>
      ) : (
        refundRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.customer_name}</Text>
              <Text style={styles.rowMeta}>{row.product_name} · {row.return_reason}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={[styles.rowValue, { color: '#ef4444' }]}>{fmt(row.refund_amount)}</Text>
              <StatusBadge status={row.status} />
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderSuppliers = () => (
    <View style={styles.card}>
      <SectionHeader title="Suppliers" action="Add" />
      {supplierRows.length === 0 ? (
        <Text style={styles.emptyText}>No suppliers yet.</Text>
      ) : (
        supplierRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.rowMeta}>{row.contact_name} · {row.country}</Text>
            </View>
            <Text style={styles.rowMeta}>{row.payment_terms || '—'}</Text>
          </View>
        ))
      )}
    </View>
  )

  const renderEmployees = () => (
    <View style={styles.card}>
      <SectionHeader title="Employees & Payroll" action="Add" />
      {employeeRows.length === 0 ? (
        <Text style={styles.emptyText}>No employees yet.</Text>
      ) : (
        employeeRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.rowMeta}>{row.role} · {row.email || '—'}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.salary)}</Text>
              <Text style={styles.rowMeta}>{row.commission_pct}%</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderAssets = () => (
    <View style={styles.card}>
      <SectionHeader title="Fixed Assets" action="Add" />
      {assetRows.length === 0 ? (
        <Text style={styles.emptyText}>No assets yet.</Text>
      ) : (
        assetRows.slice(0, 8).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.rowMeta}>{row.location || '—'} · {row.purchase_date}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.rowValue}>{fmt(row.purchase_price)}</Text>
              <Text style={styles.rowMeta}>{row.useful_life_years} yrs</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )

  const renderAudit = () => (
    <View style={styles.card}>
      <SectionHeader title="Audit Log" />
      {auditRows.length === 0 ? (
        <Text style={styles.emptyText}>No audit entries yet.</Text>
      ) : (
        auditRows.slice(0, 10).map((row) => (
          <View key={row.id} style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.action}</Text>
              <Text style={styles.rowMeta}>{row.model_name} · {row.user_name || 'system'}</Text>
            </View>
            <Text style={styles.rowMeta}>{new Date(row.created_at).toLocaleDateString()}</Text>
          </View>
        ))
      )}
    </View>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard()
      case 'Sales': return renderSales()
      case 'Purchases': return renderPurchases()
      case 'Expenses': return renderExpenses()
      case 'Accounts': return renderAccounts()
      case 'Receivables': return renderReceivables()
      case 'Payables': return renderPayables()
      case 'Taxes': return renderTaxes()
      case 'Refunds': return renderRefunds()
      case 'Suppliers': return renderSuppliers()
      case 'Employees': return renderEmployees()
      case 'Assets': return renderAssets()
      case 'Audit': return renderAudit()
      default: return renderDashboard()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <DollarSign size={20} color={C.navy} />
          <Text style={styles.title}>Accounting</Text>
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <RefreshCw size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((item) => {
          const active = activeTab === item
          return (
            <TouchableOpacity
              key={item}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={C.green} /></View>
      ) : (
        <ScrollView style={styles.contentScroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderTabContent()}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: C.navy },
  refreshBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginHorizontal: 16, marginBottom: 12, padding: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.border, borderRadius: 12, zIndex: 2, elevation: 2 },
  tab: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tabActive: { backgroundColor: C.navy, borderColor: C.navy },
  tabText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  contentScroller: { flex: 1 },
  scrollContent: { padding: 16, gap: 18, paddingBottom: 30 },
  tabContent: { gap: 18 },
  darkPanel: { backgroundColor: C.navy, borderRadius: 16, padding: 16 },
  darkPanelTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 16 },
  darkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  darkStat: { width: '47%', },
  darkLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  darkValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 14, fontWeight: '800', color: C.navy },
  statSub: { marginTop: 4, fontSize: 10, color: C.muted, fontWeight: '600' },
  statLabel: { marginTop: 4, color: C.muted, fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.navy },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: C.navy },
  primaryActionText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  secondaryAction: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: C.border },
  secondaryActionText: { color: C.muted, fontSize: 10, fontWeight: '800' },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 12, fontWeight: '700', color: C.navy },
  rowMeta: { fontSize: 11, color: C.mutedLight, marginTop: 2 },
  rowValue: { fontSize: 12, fontWeight: '800', color: C.navy },
  alignRight: { alignItems: 'flex-end' },
  badge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  emptyText: { padding: 18, textAlign: 'center', color: C.muted, fontSize: 12 },
  transferSection: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  subSectionTitle: { fontSize: 12, fontWeight: '800', color: C.navy, paddingHorizontal: 16, paddingBottom: 8 },
  chartList: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartMonth: { fontSize: 11, color: C.muted, width: 42 },
  chartBarTrack: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 999, overflow: 'hidden' },
  chartBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#22C55E' },
  chartValue: { fontSize: 11, fontWeight: '700', color: C.navy, width: 68, textAlign: 'right' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
