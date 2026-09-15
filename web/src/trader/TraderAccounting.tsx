import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, DollarSign } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { tradersApi, type ApiTraderExpense, type ApiTraderSale } from '../lib/api'

const fmt = (n: number | string) => `UGX ${Number(n).toLocaleString()}`
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)

function last30Days() {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}
function last7Days() { return last30Days().slice(-7) }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#071A2B] text-white text-[11px] font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

export default function TraderAccounting() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [sales, setSales] = useState<ApiTraderSale[]>([])
  const [expenses, setExpenses] = useState<ApiTraderExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' })
  const [range, setRange] = useState<'7' | '30'>('30')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      tradersApi.sales(traderUuid!).then(r => setSales(r.data)),
      tradersApi.expenses(traderUuid!).then(r => setExpenses(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  const totalRevenue = useMemo(() => sales.reduce((s, x) => s + Number(x.total), 0), [sales])
  const totalExpenses = useMemo(() => expenses.reduce((s, x) => s + Number(x.amount), 0), [expenses])
  const netProfit = totalRevenue - totalExpenses

  // Chart data — revenue vs expenses per day
  const chartData = useMemo(() => {
    const days = range === '7' ? last7Days() : last30Days()
    const rev: Record<string, number> = {}
    const exp: Record<string, number> = {}
    for (const d of days) { rev[d] = 0; exp[d] = 0 }
    for (const s of sales) { const k = s.created_at.slice(0, 10); if (rev[k] !== undefined) rev[k] += Number(s.total) }
    for (const e of expenses) { const k = e.date; if (exp[k] !== undefined) exp[k] += Number(e.amount) }
    return days.map(d => ({
      date: new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }),
      Revenue: rev[d],
      Expenses: exp[d],
      'Net Profit': rev[d] - exp[d],
    }))
  }, [sales, expenses, range])

  // Period comparison
  const comparison = useMemo(() => {
    const days = range === '7' ? 7 : 30
    const now = Date.now(); const ms = days * 86400 * 1000
    const thisRev = sales.filter(s => now - new Date(s.created_at).getTime() < ms).reduce((s, x) => s + Number(x.total), 0)
    const prevRev = sales.filter(s => { const a = now - new Date(s.created_at).getTime(); return a >= ms && a < ms * 2 }).reduce((s, x) => s + Number(x.total), 0)
    const thisExp = expenses.filter(e => now - new Date(e.date).getTime() < ms).reduce((s, x) => s + Number(x.amount), 0)
    const prevExp = expenses.filter(e => { const a = now - new Date(e.date).getTime(); return a >= ms && a < ms * 2 }).reduce((s, x) => s + Number(x.amount), 0)
    const revChange = prevRev ? Math.round(((thisRev - prevRev) / prevRev) * 100) : null
    const expChange = prevExp ? Math.round(((thisExp - prevExp) / prevExp) * 100) : null
    return { thisRev, prevRev, thisExp, prevExp, revChange, expChange }
  }, [sales, expenses, range])

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) { setError('Description and amount are required.'); return }
    setSaving(true); setError('')
    try {
      const created = await tradersApi.createExpense(traderUuid!, {
        description: form.description, amount: Number(form.amount), date: form.date, note: form.note,
      })
      setExpenses(prev => [created.data, ...prev])
      setModal(false)
      setForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' })
    } catch { setError('Failed to save expense.') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
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
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Revenue', value: fmt(totalRevenue), color: 'text-[#22C55E]' },
              { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-red-500' },
              { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500' },
              { label: 'Total Sales', value: String(sales.length), color: 'text-[#6366f1]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-1 min-w-0">
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide leading-tight">{label}</p>
                <p className={`font-extrabold break-words leading-tight ${color} text-[clamp(13px,2.5vw,18px)]`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Range toggle */}
          <div className="flex items-center gap-2 mb-4">
            {(['7', '30'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${range === r ? 'bg-[#071A2B] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Last {r} days
              </button>
            ))}
          </div>

          {/* Period comparison cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              {
                label: `Revenue (last ${range}d)`, value: fmt(comparison.thisRev),
                change: comparison.revChange, color: 'text-[#22C55E]',
              },
              {
                label: `Expenses (last ${range}d)`, value: fmt(comparison.thisExp),
                change: comparison.expChange, color: 'text-red-500',
              },
            ].map(({ label, value, change, color }) => (
              <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 min-w-0">
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide leading-tight mb-1">{label}</p>
                <p className={`font-extrabold break-words leading-tight ${color} text-[clamp(13px,2.5vw,18px)]`}>{value}</p>
                {change !== null && (
                  <p className={`text-[11px] font-bold mt-1 ${change >= 0 ? 'text-[#22C55E]' : 'text-red-500'}`}>
                    {change > 0 ? '+' : ''}{change}% vs prev period
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Revenue vs Expenses bar chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4">
            <p className="text-[12px] font-bold text-[#071A2B] mb-3">Revenue vs Expenses</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue" fill="#22C55E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Net Profit line chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6">
            <p className="text-[12px] font-bold text-[#071A2B] mb-3">Net Profit Trend</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Net Profit" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tables */}
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
              <input type="text" placeholder="Description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
              <input type="number" placeholder="Amount (UGX)" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
              <textarea rows={3} placeholder="Note (optional)" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B] resize-none" />
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
