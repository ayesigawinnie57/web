import { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingBag, Package,
  CreditCard, Plus, ReceiptText,
} from 'lucide-react'
import {
  accountingApi,
  type ApiAccountingDashboard, type ApiSupplier, type ApiPurchase,
  type ApiExpense, type ApiExpenseCategory, type ApiAccount, type ApiTransfer,
  type ApiReceivable, type ApiPayable, type ApiTaxRecord, type ApiRefund,
  type ApiEmployee, type ApiFixedAsset, type ApiAuditLog,
} from '../../lib/api'

const fmt = (n: number | string) => `UGX ${Number(n).toLocaleString()}`
const pct = (n: number) => `${n.toFixed(2)}%`

const TABS = [
  'Dashboard', 'Sales', 'Purchases', 'Expenses', 'Accounts',
  'Receivables', 'Payables', 'Taxes', 'Refunds', 'Suppliers',
  'Employees', 'Assets', 'Audit',
]

const STATUS_COLOR: Record<string, string> = {
  paid: '#10b981', completed: '#10b981', approved: '#10b981', filed: '#10b981', active: '#10b981',
  pending: '#f59e0b', open: '#6366f1', partial: '#f59e0b',
  overdue: '#ef4444', rejected: '#ef4444', failed: '#ef4444',
}

function Badge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#94a3b8'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: color + '18', color }}>
      {status}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + '18' }}>
        <Icon size={16} color={color} />
      </div>
      <p className="text-[14px] font-extrabold text-[#071A2B] leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-[#94A3B8] font-semibold">{sub}</p>}
      <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">{label}</p>
    </div>
  )
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[14px] font-extrabold text-[#071A2B]">{title}</p>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#071A2B] text-white text-[11px] font-bold hover:opacity-80">
          <Plus size={12} /> Add
        </button>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-[12px] text-[#94A3B8] py-8 text-center">{text}</p>
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ data }: { data: ApiAccountingDashboard }) {
  return (
    <div className="flex flex-col gap-6">
      {/* P&L Summary */}
      <div className="bg-[#071A2B] rounded-xl p-5 text-white">
        <p className="text-[11px] text-white/50 font-bold uppercase tracking-wide mb-4">Profit & Loss</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Revenue', value: fmt(data.total_revenue), color: '#22C55E' },
            { label: 'COGS', value: fmt(data.cogs), color: '#f59e0b' },
            { label: 'Gross Profit', value: fmt(data.gross_profit), color: '#6366f1' },
            { label: 'Expenses', value: fmt(data.total_expenses), color: '#ef4444' },
            { label: 'Net Profit', value: fmt(data.net_profit), color: data.net_profit >= 0 ? '#22C55E' : '#ef4444' },
            { label: 'Gross Margin', value: pct(data.gross_margin), color: '#0ea5e9' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/40 font-semibold">{label}</p>
              <p className="text-[15px] font-extrabold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Sales" value={fmt(data.today_revenue)} icon={TrendingUp} color="#22C55E" />
        <StatCard label="Today's Expenses" value={fmt(data.today_expenses)} icon={TrendingDown} color="#ef4444" />
        <StatCard label="Today's Orders" value={String(data.today_orders)} icon={ShoppingBag} color="#6366f1" />
        <StatCard label="Today's Refunds" value={fmt(data.today_refunds)} icon={ReceiptText} color="#f59e0b" />
      </div>

      {/* Balance sheet snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Cash & Bank" value={fmt(data.cash_bank)} icon={CreditCard} color="#0ea5e9" />
        <StatCard label="Inventory Cost" value={fmt(data.inventory_cost)} icon={Package} color="#8b5cf6" sub={`Sales value: ${fmt(data.inventory_sales_value)}`} />
        <StatCard label="Receivables" value={fmt(data.receivables)} icon={TrendingUp} color="#10b981" />
        <StatCard label="Payables" value={fmt(data.payables)} icon={TrendingDown} color="#ef4444" />
      </div>

      {/* Accounts */}
      {data.accounts.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
            <p className="text-[13px] font-extrabold text-[#071A2B]">Accounts</p>
          </div>
          {data.accounts.map((a, i) => (
            <div key={i} className={`flex justify-between items-center px-5 py-3 ${i < data.accounts.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
              <div>
                <p className="text-[12px] font-bold text-[#071A2B]">{a.name}</p>
                <p className="text-[10px] text-[#94A3B8] capitalize">{a.type.replace('_', ' ')}</p>
              </div>
              <p className="text-[13px] font-extrabold text-[#071A2B]">{a.currency} {Number(a.balance).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly revenue bar */}
      {data.monthly.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-[13px] font-extrabold text-[#071A2B] mb-4">Monthly Revenue</p>
          <div className="flex flex-col gap-2">
            {data.monthly.slice(-6).map(m => {
              const max = Math.max(...data.monthly.map(x => x.revenue), 1)
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#64748B] w-16 shrink-0">{m.month}</span>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-[#071A2B] w-28 text-right shrink-0">{fmt(m.revenue)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    import('../../lib/api').then(({ adminOrdersApi }) =>
      adminOrdersApi.list().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
    )
  }, [])
  return (
    <div>
      <SectionHeader title="Sales & Revenue" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>{['Order','Customer','Date','Total','Delivery Fee','Status','Payment'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#94A3B8]">No orders yet.</td></tr>
              ) : rows.map((o: any) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-bold text-[#071A2B]">{o.code}</td>
                  <td className="px-4 py-2.5 text-[#64748B]">{o.user_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[#64748B]">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 font-bold text-[#071A2B]">{fmt(o.total)}</td>
                  <td className="px-4 py-2.5 text-[#64748B]">{fmt(o.delivery_fee)}</td>
                  <td className="px-4 py-2.5"><Badge status={o.status} /></td>
                  <td className="px-4 py-2.5 text-[#64748B]">{o.payment?.payment_method || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Purchases Tab ─────────────────────────────────────────────────────────────
function PurchasesTab({ suppliers }: { suppliers: ApiSupplier[] }) {
  const [rows, setRows] = useState<ApiPurchase[]>([])
  const [modal, setModal] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ supplier: '', product: '', purchase_date: '', quantity: '', unit_cost: '', shipping_cost: '0', customs_cost: '0', other_cost: '0', amount_paid: '0', invoice_ref: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    accountingApi.purchases().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
    import('../../lib/api').then(({ adminProductsApi }) => adminProductsApi.listAll().then(setProducts))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const r = await accountingApi.createPurchase({ ...form, supplier: Number(form.supplier), product: Number(form.product), quantity: Number(form.quantity), unit_cost: Number(form.unit_cost), shipping_cost: Number(form.shipping_cost), customs_cost: Number(form.customs_cost), other_cost: Number(form.other_cost), amount_paid: Number(form.amount_paid) })
      setRows(p => [r.data, ...p]); setModal(false)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <SectionHeader title="Purchases & COGS" onAdd={() => setModal(true)} />
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>{['Product','Supplier','Date','Qty','Unit Cost','Landed Cost','Paid','Outstanding','Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-[#94A3B8]">No purchases yet.</td></tr>
                : rows.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-bold text-[#071A2B]">{p.product_name}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{p.supplier_name}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{p.purchase_date}</td>
                    <td className="px-4 py-2.5">{p.quantity}</td>
                    <td className="px-4 py-2.5">{fmt(p.unit_cost)}</td>
                    <td className="px-4 py-2.5 font-bold text-[#071A2B]">{fmt(p.landed_cost)}</td>
                    <td className="px-4 py-2.5 text-[#10b981]">{fmt(p.amount_paid)}</td>
                    <td className="px-4 py-2.5 text-[#ef4444]">{fmt(p.outstanding)}</td>
                    <td className="px-4 py-2.5"><Badge status={p.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-[15px] font-extrabold text-[#071A2B] mb-4">New Purchase</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="col-span-2 w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                <option value="">Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} className="col-span-2 w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                <option value="">Product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {[['purchase_date','Date','date'],['quantity','Qty','number'],['unit_cost','Unit Cost','number'],['shipping_cost','Shipping','number'],['customs_cost','Customs','number'],['other_cost','Other Cost','number'],['amount_paid','Amount Paid','number'],['invoice_ref','Invoice Ref','text']].map(([k, label, type]) => (
                <div key={k}>
                  <p className="text-[10px] text-[#94A3B8] mb-1">{label}</p>
                  <input type={type} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-[10px] text-[#94A3B8] mb-1">Notes</p>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[12px] font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ categories }: { categories: ApiExpenseCategory[] }) {
  const [rows, setRows] = useState<ApiExpense[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ date: '', category: '', description: '', amount: '', payment_method: 'cash', vendor: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    accountingApi.expenses().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const r = await accountingApi.createExpense({ ...form, category: Number(form.category), amount: Number(form.amount) })
      setRows(p => [r.data, ...p]); setModal(false)
    } finally { setSaving(false) }
  }

  const total = rows.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <SectionHeader title={`Expenses — ${fmt(total)}`} onAdd={() => setModal(true)} />
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>{['Date','Category','Description','Amount','Method','Vendor'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-[#94A3B8]">No expenses yet.</td></tr>
                : rows.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 text-[#64748B]">{e.date}</td>
                    <td className="px-4 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">{e.category_group}/{e.category_name}</span></td>
                    <td className="px-4 py-2.5 font-bold text-[#071A2B]">{e.description}</td>
                    <td className="px-4 py-2.5 font-bold text-[#ef4444]">{fmt(e.amount)}</td>
                    <td className="px-4 py-2.5 text-[#64748B] capitalize">{e.payment_method.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{e.vendor || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[15px] font-extrabold text-[#071A2B] mb-4">New Expense</p>
            <div className="flex flex-col gap-3">
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                <option value="">Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.group} / {c.name}</option>)}
              </select>
              <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
              <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                {['mobile_money','card','cash','bank','other'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              <input placeholder="Vendor" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[12px] font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Accounts Tab ──────────────────────────────────────────────────────────────
function AccountsTab() {
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [transfers, setTransfers] = useState<ApiTransfer[]>([])
  const [modal, setModal] = useState<'account' | 'transfer' | null>(null)
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '', currency: 'UGX', notes: '' })
  const [tForm, setTForm] = useState({ from_account: '', to_account: '', amount: '', date: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    accountingApi.accounts().then(r => setAccounts(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
    accountingApi.transfers().then(r => setTransfers(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
  }
  useEffect(() => { load() }, [])

  const saveAccount = async () => {
    setSaving(true)
    try { const r = await accountingApi.createAccount({ ...form, balance: Number(form.balance) }); setAccounts(p => [...p, r.data]); setModal(null) }
    finally { setSaving(false) }
  }
  const saveTransfer = async () => {
    setSaving(true)
    try { await accountingApi.createTransfer({ ...tForm, from_account: Number(tForm.from_account), to_account: Number(tForm.to_account), amount: Number(tForm.amount) }); load(); setModal(null) }
    finally { setSaving(false) }
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-extrabold text-[#071A2B]">Accounts — {fmt(total)}</p>
        <div className="flex gap-2">
          <button onClick={() => setModal('transfer')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-[#64748B] hover:opacity-80">Transfer</button>
          <button onClick={() => setModal('account')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#071A2B] text-white text-[11px] font-bold hover:opacity-80"><Plus size={12} /> Account</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {accounts.map(a => (
          <div key={a.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[10px] text-[#94A3B8] capitalize mb-1">{a.type.replace('_', ' ')}</p>
            <p className="text-[14px] font-extrabold text-[#071A2B]">{a.name}</p>
            <p className="text-[16px] font-extrabold text-[#22C55E] mt-1">{a.currency} {Number(a.balance).toLocaleString()}</p>
          </div>
        ))}
        {accounts.length === 0 && <div className="col-span-4"><EmptyState text="No accounts yet." /></div>}
      </div>
      {transfers.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0]"><p className="text-[12px] font-extrabold text-[#071A2B]">Transfers</p></div>
          {transfers.map((t, i) => (
            <div key={t.id} className={`flex justify-between items-center px-5 py-3 text-[12px] ${i < transfers.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
              <span className="text-[#64748B]">{t.from_account_name} → {t.to_account_name}</span>
              <span className="font-bold text-[#071A2B]">{fmt(t.amount)}</span>
              <span className="text-[#94A3B8]">{t.date}</span>
            </div>
          ))}
        </div>
      )}
      {modal === 'account' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[15px] font-extrabold text-[#071A2B] mb-4">New Account</p>
            <div className="flex flex-col gap-3">
              <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                {['bank','mobile_money','cash','gateway','other'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <input type="number" placeholder="Opening Balance" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={saveAccount} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[12px] font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {modal === 'transfer' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[15px] font-extrabold text-[#071A2B] mb-4">Transfer Between Accounts</p>
            <div className="flex flex-col gap-3">
              <select value={tForm.from_account} onChange={e => setTForm(f => ({ ...f, from_account: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                <option value="">From...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={tForm.to_account} onChange={e => setTForm(f => ({ ...f, to_account: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">
                <option value="">To...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="number" placeholder="Amount" value={tForm.amount} onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
              <input type="date" value={tForm.date} onChange={e => setTForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={saveTransfer} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[12px] font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Simple list+add tabs ──────────────────────────────────────────────────────
function SimpleListTab<T extends { id: number }>({
  title, cols, rows, renderRow, modal, setModal, children, onSave, saving,
}: {
  title: string; cols: string[]; rows: T[]; renderRow: (r: T) => React.ReactNode
  modal: boolean; setModal: (v: boolean) => void; children?: React.ReactNode
  onSave: () => void; saving: boolean
}) {
  return (
    <div>
      <SectionHeader title={title} onAdd={() => setModal(true)} />
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>{cols.map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-8 text-[#94A3B8]">No records yet.</td></tr>
                : rows.map(r => <tr key={r.id}>{renderRow(r)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-[15px] font-extrabold text-[#071A2B] mb-4">Add {title}</p>
            <div className="flex flex-col gap-3">{children}</div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[12px] font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReceivablesTab() {
  const [rows, setRows] = useState<ApiReceivable[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_email: '', invoice_ref: '', amount: '', amount_paid: '0', due_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.receivables().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createReceivable({ ...form, amount: Number(form.amount), amount_paid: Number(form.amount_paid) }); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Receivables" cols={['Customer','Invoice','Amount','Paid','Balance','Due','Status']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.customer_name}</td><td className="px-4 py-2.5 text-[#64748B]">{r.invoice_ref||'—'}</td><td className="px-4 py-2.5">{fmt(r.amount)}</td><td className="px-4 py-2.5 text-[#10b981]">{fmt(r.amount_paid)}</td><td className="px-4 py-2.5 font-bold">{fmt(r.balance)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.due_date}</td><td className="px-4 py-2.5"><Badge status={r.status}/></td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      {[['customer_name','Customer','text'],['customer_email','Email','email'],['invoice_ref','Invoice Ref','text'],['amount','Amount','number'],['amount_paid','Amount Paid','number'],['due_date','Due Date','date']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function PayablesTab({ suppliers }: { suppliers: ApiSupplier[] }) {
  const [rows, setRows] = useState<ApiPayable[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ supplier: '', invoice_ref: '', amount: '', amount_paid: '0', due_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.payables().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createPayable({ ...form, supplier: Number(form.supplier), amount: Number(form.amount), amount_paid: Number(form.amount_paid) }); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Payables" cols={['Supplier','Invoice','Amount','Paid','Balance','Due','Status']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.supplier_name}</td><td className="px-4 py-2.5 text-[#64748B]">{r.invoice_ref||'—'}</td><td className="px-4 py-2.5">{fmt(r.amount)}</td><td className="px-4 py-2.5 text-[#10b981]">{fmt(r.amount_paid)}</td><td className="px-4 py-2.5 font-bold text-[#ef4444]">{fmt(r.balance)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.due_date}</td><td className="px-4 py-2.5"><Badge status={r.status}/></td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      <select value={form.supplier} onChange={e => setForm(f => ({...f,supplier:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none"><option value="">Supplier...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      {[['invoice_ref','Invoice Ref','text'],['amount','Amount','number'],['amount_paid','Paid','number'],['due_date','Due Date','date']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function TaxesTab() {
  const [rows, setRows] = useState<ApiTaxRecord[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tax_type: 'vat', period_start: '', period_end: '', taxable_amount: '', tax_amount: '', status: 'pending', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.taxes().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createTax({ ...form, taxable_amount: Number(form.taxable_amount), tax_amount: Number(form.tax_amount) }); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Tax Records" cols={['Type','Period','Taxable','Tax Amount','Status']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B] capitalize">{r.tax_type.replace('_',' ')}</td><td className="px-4 py-2.5 text-[#64748B]">{r.period_start} – {r.period_end}</td><td className="px-4 py-2.5">{fmt(r.taxable_amount)}</td><td className="px-4 py-2.5 font-bold">{fmt(r.tax_amount)}</td><td className="px-4 py-2.5"><Badge status={r.status}/></td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      <select value={form.tax_type} onChange={e => setForm(f => ({...f,tax_type:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none">{['vat','income_tax','withholding','paye','other'].map(t => <option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>)}</select>
      {[['period_start','Period Start','date'],['period_end','Period End','date'],['taxable_amount','Taxable Amount','number'],['tax_amount','Tax Amount','number']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function RefundsTab() {
  const [rows, setRows] = useState<ApiRefund[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ customer_name: '', product_name: '', return_reason: '', product_condition: '', refund_amount: '', refund_method: '', restock: false, return_delivery_cost: '0' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.refunds().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createRefund({ ...form, refund_amount: Number(form.refund_amount), return_delivery_cost: Number(form.return_delivery_cost) }); setRows(p => [r.data, ...p]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Refunds & Returns" cols={['Customer','Product','Reason','Amount','Method','Restock','Status']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.customer_name}</td><td className="px-4 py-2.5 text-[#64748B]">{r.product_name||'—'}</td><td className="px-4 py-2.5 text-[#64748B] max-w-[150px] truncate">{r.return_reason}</td><td className="px-4 py-2.5 font-bold text-[#ef4444]">{fmt(r.refund_amount)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.refund_method||'—'}</td><td className="px-4 py-2.5">{r.restock ? '✓' : '—'}</td><td className="px-4 py-2.5"><Badge status={r.status}/></td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      {[['customer_name','Customer','text'],['product_name','Product','text'],['return_reason','Reason','text'],['product_condition','Condition','text'],['refund_amount','Refund Amount','number'],['refund_method','Refund Method','text'],['return_delivery_cost','Return Delivery Cost','number']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
      <label className="flex items-center gap-2 text-[12px] text-[#64748B]"><input type="checkbox" checked={form.restock} onChange={e => setForm(f => ({...f,restock:e.target.checked}))} /> Restock item</label>
    </SimpleListTab>
  )
}

function SuppliersTab() {
  const [rows, setRows] = useState<ApiSupplier[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', contact_name: '', email: '', phone: '', country: 'Uganda', address: '', payment_terms: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.suppliers().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createSupplier(form); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Suppliers" cols={['Name','Contact','Email','Phone','Country','Terms']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.name}</td><td className="px-4 py-2.5 text-[#64748B]">{r.contact_name||'—'}</td><td className="px-4 py-2.5 text-[#64748B]">{r.email||'—'}</td><td className="px-4 py-2.5 text-[#64748B]">{r.phone||'—'}</td><td className="px-4 py-2.5 text-[#64748B]">{r.country}</td><td className="px-4 py-2.5 text-[#64748B]">{r.payment_terms||'—'}</td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      {[['name','Name','text'],['contact_name','Contact Name','text'],['email','Email','email'],['phone','Phone','text'],['country','Country','text'],['payment_terms','Payment Terms','text']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function EmployeesTab() {
  const [rows, setRows] = useState<ApiEmployee[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', salary: '', commission_pct: '0', joined_at: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.employees().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createEmployee({ ...form, salary: Number(form.salary), commission_pct: Number(form.commission_pct) }); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Employees & Payroll" cols={['Name','Role','Email','Phone','Salary','Commission','Joined']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.name}</td><td className="px-4 py-2.5 text-[#64748B]">{r.role||'—'}</td><td className="px-4 py-2.5 text-[#64748B]">{r.email||'—'}</td><td className="px-4 py-2.5 text-[#64748B]">{r.phone||'—'}</td><td className="px-4 py-2.5 font-bold">{fmt(r.salary)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.commission_pct}%</td><td className="px-4 py-2.5 text-[#64748B]">{r.joined_at||'—'}</td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      {[['name','Name','text'],['email','Email','email'],['phone','Phone','text'],['role','Role','text'],['salary','Salary','number'],['commission_pct','Commission %','number'],['joined_at','Joined Date','date']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function AssetsTab() {
  const [rows, setRows] = useState<ApiFixedAsset[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', purchase_price: '', purchase_date: '', useful_life_years: '3', location: '', notes: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { accountingApi.assets().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  const save = async () => { setSaving(true); try { const r = await accountingApi.createAsset({ ...form, purchase_price: Number(form.purchase_price), useful_life_years: Number(form.useful_life_years) }); setRows(p => [...p, r.data]); setModal(false) } finally { setSaving(false) } }
  return (
    <SimpleListTab title="Fixed Assets" cols={['Name','Purchase Price','Date','Life (yrs)','Annual Depr.','Location']} rows={rows}
      renderRow={r => <><td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.name}</td><td className="px-4 py-2.5">{fmt(r.purchase_price)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.purchase_date}</td><td className="px-4 py-2.5 text-[#64748B]">{r.useful_life_years}</td><td className="px-4 py-2.5 text-[#f59e0b]">{fmt(r.annual_depreciation)}</td><td className="px-4 py-2.5 text-[#64748B]">{r.location||'—'}</td></>}
      modal={modal} setModal={setModal} onSave={save} saving={saving}>
      {[['name','Name','text'],['purchase_price','Purchase Price','number'],['purchase_date','Purchase Date','date'],['useful_life_years','Useful Life (years)','number'],['location','Location','text']].map(([k,l,t]) => (
        <input key={k} type={t} placeholder={l} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12px] outline-none" />
      ))}
    </SimpleListTab>
  )
}

function AuditTab() {
  const [rows, setRows] = useState<ApiAuditLog[]>([])
  useEffect(() => { accountingApi.auditLog().then(r => setRows(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])) }, [])
  return (
    <div>
      <SectionHeader title="Audit Trail" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>{['When','User','Action','Model','ID','Reason'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-[#94A3B8]">No audit records yet.</td></tr>
                : rows.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-bold text-[#071A2B]">{r.user_name ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge status={r.action} /></td>
                    <td className="px-4 py-2.5 text-[#64748B]">{r.model_name}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">#{r.object_id}</td>
                    <td className="px-4 py-2.5 text-[#64748B]">{r.reason || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminAccounting() {
  const [tab, setTab] = useState('Dashboard')
  const [dashboard, setDashboard] = useState<ApiAccountingDashboard | null>(null)
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [categories, setCategories] = useState<ApiExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      accountingApi.dashboard().then(r => setDashboard(r.data)),
      accountingApi.suppliers().then(r => setSuppliers(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
      accountingApi.expenseCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
    ]).catch(() => setError('Failed to load accounting data.')).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign size={20} color="#071A2B" />
        <h1 className="text-xl font-extrabold text-[#071A2B]">Accounting</h1>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-4">{error}</p>}

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${tab === t ? 'bg-[#071A2B] text-white' : 'text-[#64748B] hover:text-[#071A2B]'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {tab === 'Dashboard' && dashboard && <DashboardTab data={dashboard} />}
          {tab === 'Sales' && <SalesTab />}
          {tab === 'Purchases' && <PurchasesTab suppliers={suppliers} />}
          {tab === 'Expenses' && <ExpensesTab categories={categories} />}
          {tab === 'Accounts' && <AccountsTab />}
          {tab === 'Receivables' && <ReceivablesTab />}
          {tab === 'Payables' && <PayablesTab suppliers={suppliers} />}
          {tab === 'Taxes' && <TaxesTab />}
          {tab === 'Refunds' && <RefundsTab />}
          {tab === 'Suppliers' && <SuppliersTab />}
          {tab === 'Employees' && <EmployeesTab />}
          {tab === 'Assets' && <AssetsTab />}
          {tab === 'Audit' && <AuditTab />}
        </>
      )}
    </div>
  )
}
