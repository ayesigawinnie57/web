import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Plus } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { tradersApi, type ApiTraderSale, type ApiTraderProduct } from '../lib/api'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

function last30Days() {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function last7Days() {
  return last30Days().slice(-7)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#071A2B] text-white text-[11px] font-semibold px-3 py-2 rounded-lg shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.name === 'Revenue' ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  )
}

export default function TraderSales() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [sales, setSales] = useState<ApiTraderSale[]>([])
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product: '', product_name: '', quantity: '1', unit_price: '', customer_name: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState<'7' | '30'>('30')

  useEffect(() => {
    Promise.all([
      tradersApi.sales(traderUuid!).then(r => setSales(r.data)),
      tradersApi.products(traderUuid!).then(r => setProducts(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0)

  // Build daily chart data
  const chartData = useMemo(() => {
    const days = range === '7' ? last7Days() : last30Days()
    const byDay: Record<string, { revenue: number; sales: number }> = {}
    for (const d of days) byDay[d] = { revenue: 0, sales: 0 }
    for (const s of sales) {
      const k = toDateKey(s.created_at)
      if (byDay[k]) { byDay[k].revenue += Number(s.total); byDay[k].sales += 1 }
    }
    return days.map(d => ({
      date: new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }),
      Revenue: byDay[d].revenue,
      Sales: byDay[d].sales,
    }))
  }, [sales, range])

  // This period vs previous period comparison
  const comparison = useMemo(() => {
    const days = range === '7' ? 7 : 30
    const now = Date.now()
    const periodMs = days * 86400 * 1000
    const thisPeriod = sales.filter(s => now - new Date(s.created_at).getTime() < periodMs)
    const prevPeriod = sales.filter(s => {
      const age = now - new Date(s.created_at).getTime()
      return age >= periodMs && age < periodMs * 2
    })
    return {
      thisRevenue: thisPeriod.reduce((s, x) => s + Number(x.total), 0),
      prevRevenue: prevPeriod.reduce((s, x) => s + Number(x.total), 0),
      thisSales: thisPeriod.length,
      prevSales: prevPeriod.length,
    }
  }, [sales, range])

  const revChange = comparison.prevRevenue
    ? Math.round(((comparison.thisRevenue - comparison.prevRevenue) / comparison.prevRevenue) * 100)
    : null

  const handleProductChange = (productId: string) => {
    const p = products.find(x => String(x.id) === productId)
    setForm(f => ({ ...f, product: productId, product_name: p?.name ?? '', unit_price: p ? p.price : f.unit_price }))
  }

  const handleSave = async () => {
    if (!form.product_name.trim() || !form.unit_price) { setError('Product name and price are required.'); return }
    setSaving(true); setError('')
    try {
      const total = Number(form.unit_price) * Number(form.quantity)
      const r = await tradersApi.createSale(traderUuid!, {
        product: form.product ? Number(form.product) : null,
        product_name: form.product_name,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        total,
        customer_name: form.customer_name,
        note: form.note,
      })
      setSales(p => [r.data, ...p])
      setModal(false)
      setForm({ product: '', product_name: '', quantity: '1', unit_price: '', customer_name: '', note: '' })
    } catch { setError('Failed to record sale.') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">Sales</h1>
        </div>
        <button onClick={() => { setError(''); setModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80">
          <Plus size={14} /> Record Sale
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'text-[#22C55E]' },
          { label: 'Total Sales', value: String(sales.length), color: 'text-[#071A2B]' },
          { label: `This ${range}d Revenue`, value: fmt(comparison.thisRevenue), color: 'text-[#6366f1]' },
          {
            label: 'vs Previous Period',
            value: revChange === null ? 'N/A' : `${revChange > 0 ? '+' : ''}${revChange}%`,
            color: revChange === null ? 'text-[#94A3B8]' : revChange >= 0 ? 'text-[#22C55E]' : 'text-red-500',
          },
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

      {/* Revenue bar chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4">
        <p className="text-[12px] font-bold text-[#071A2B] mb-3">Daily Revenue</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Revenue" fill="#22C55E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales count + comparison line chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6">
        <p className="text-[12px] font-bold text-[#071A2B] mb-3">Daily Sales Count</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sales table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : sales.length === 0 ? (
        <p className="text-center text-[#64748B] text-[14px] py-20">No sales recorded yet.</p>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>{['Product', 'Customer', 'Qty', 'Unit Price', 'Total', 'When'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sales.map(s => (
                  <tr key={s.uuid}>
                    <td className="px-4 py-3 font-bold text-[#071A2B]">{s.product_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.customer_name || '—'}</td>
                    <td className="px-4 py-3">{s.quantity}</td>
                    <td className="px-4 py-3">{fmt(s.unit_price)}</td>
                    <td className="px-4 py-3 font-bold text-[#22C55E]">{fmt(s.total)}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{timeAgo(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-4">Record Sale</p>
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Product</label>
                <select value={form.product} onChange={e => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {!form.product && (
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Or enter product name</label>
                  <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
                </div>
              )}
              {[
                { k: 'quantity', label: 'Quantity', type: 'number' },
                { k: 'unit_price', label: 'Unit Price (UGX)', type: 'number' },
                { k: 'customer_name', label: 'Customer Name (optional)', type: 'text' },
              ].map(({ k, label, type }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}</label>
                  <input type={type} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
              {form.unit_price && form.quantity && (
                <p className="text-[12px] font-bold text-[#22C55E]">
                  Total: {fmt(Number(form.unit_price) * Number(form.quantity))}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#22C55E] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
