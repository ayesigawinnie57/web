import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, DollarSign, TrendingDown, TrendingUp, ReceiptText } from 'lucide-react'
import { tradersApi, type ApiTraderDashboard, type ApiTraderExpense, type ApiTraderSale } from '../lib/api'

const fmt = (n: number | string) => `UGX ${Number(n).toLocaleString()}`

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + '18' }}>
        <Icon size={18} color={color} />
      </div>
      <p className="text-[18px] font-extrabold text-[#071A2B]">{value}</p>
      <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">{label}</p>
    </div>
  )
}

export default function TraderAccounting() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [dashboard, setDashboard] = useState<ApiTraderDashboard | null>(null)
  const [sales, setSales] = useState<ApiTraderSale[]>([])
  const [expenses, setExpenses] = useState<ApiTraderExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' })

  const load = () => {
    setLoading(true)
    Promise.all([
      tradersApi.dashboard(traderUuid!).then(r => setDashboard(r.data)),
      tradersApi.sales(traderUuid!).then(r => setSales(r.data)),
      tradersApi.expenses(traderUuid!).then(r => setExpenses(r.data)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [traderUuid])

  const totalRevenue = useMemo(() => sales.reduce((sum, item) => sum + Number(item.total), 0), [sales])
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount), 0), [expenses])

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) {
      setError('Description and amount are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const created = await tradersApi.createExpense(traderUuid!, {
        description: form.description,
        amount: Number(form.amount),
        date: form.date,
        note: form.note,
      })

      setExpenses(prev => [created.data, ...prev])
      setModal(false)
      setForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' })
      setDashboard(prev => prev ? { ...prev, total_expenses: Number(prev.total_expenses) + Number(created.data.amount) } : prev)
    } catch {
      setError('Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">Accounting</h1>
        </div>
        <button
          onClick={() => { setError(''); setModal(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80"
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Revenue" value={fmt(dashboard?.total_revenue ?? totalRevenue)} icon={TrendingUp} color="#22C55E" />
            <StatCard label="Expenses" value={fmt(dashboard?.total_expenses ?? totalExpenses)} icon={TrendingDown} color="#ef4444" />
            <StatCard label="Net Profit" value={fmt(dashboard?.net_profit ?? totalRevenue - totalExpenses)} icon={DollarSign} color={Number(dashboard?.net_profit ?? (totalRevenue - totalExpenses)) >= 0 ? '#10b981' : '#ef4444'} />
            <StatCard label="Sales" value={String(dashboard?.total_sales ?? sales.length)} icon={ReceiptText} color="#6366f1" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <p className="text-[14px] font-extrabold text-[#071A2B]">Sales</p>
                <span className="text-[11px] font-bold text-[#22C55E]">{fmt(totalRevenue)}</span>
              </div>
              {sales.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12px] text-[#94A3B8]">No sales recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>{['Product', 'Customer', 'Qty', 'Total'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {sales.map(item => (
                        <tr key={item.uuid}>
                          <td className="px-4 py-3 font-bold text-[#071A2B]">{item.product_name}</td>
                          <td className="px-4 py-3 text-[#64748B]">{item.customer_name || '—'}</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 font-bold text-[#22C55E]">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <p className="text-[14px] font-extrabold text-[#071A2B]">Expenses</p>
                <span className="text-[11px] font-bold text-[#ef4444]">{fmt(totalExpenses)}</span>
              </div>
              {expenses.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12px] text-[#94A3B8]">No expenses added yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>{['Description', 'Date', 'Amount', 'Note'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {expenses.map(item => (
                        <tr key={item.uuid}>
                          <td className="px-4 py-3 font-bold text-[#071A2B]">{item.description}</td>
                          <td className="px-4 py-3 text-[#64748B]">{item.date}</td>
                          <td className="px-4 py-3 font-bold text-[#ef4444]">{fmt(item.amount)}</td>
                          <td className="px-4 py-3 text-[#64748B]">{item.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-4">Add Expense</p>
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]"
              />
              <input
                type="number"
                placeholder="Amount (UGX)"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]"
              />
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]"
              />
              <textarea
                rows={3}
                placeholder="Note (optional)"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B] resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
