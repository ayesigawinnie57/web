import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, LoaderCircle, Megaphone, Wallet } from 'lucide-react'
import {
  advertisingApi,
  type ApiAdminAdvertisingCampaign,
  type ApiAdminAdvertisingTransaction,
} from '../lib/api'

type CampaignAction = 'approve' | 'reject' | 'pause' | 'resume' | 'cancel'
type ActionDialog = { campaign: ApiAdminAdvertisingCampaign; action: CampaignAction } | null

const money = (value: string | number) =>
  `UGX ${Number(value).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`
const inputClass = 'w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#22C55E]'

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response
    if (response?.data?.detail) return response.data.detail
  }
  return fallback
}

function Status({ value }: { value: ApiAdminAdvertisingCampaign['status'] }) {
  const color = value === 'active' ? 'bg-green-50 text-green-700'
    : value === 'pending_review' ? 'bg-amber-50 text-amber-800'
      : value === 'rejected' || value === 'cancelled' ? 'bg-red-50 text-red-700'
        : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${color}`}>{value.replaceAll('_', ' ')}</span>
}

export default function AdminAdvertising() {
  const [campaigns, setCampaigns] = useState<ApiAdminAdvertisingCampaign[]>([])
  const [transactions, setTransactions] = useState<ApiAdminAdvertisingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [reason, setReason] = useState('')
  const [traderUuid, setTraderUuid] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjustmentRequestKey, setAdjustmentRequestKey] = useState(() => crypto.randomUUID())

  const load = useCallback(async () => {
    try {
      const [campaignResult, transactionResult] = await Promise.all([
        advertisingApi.adminCampaigns(),
        advertisingApi.adminTransactions(),
      ])
      setCampaigns(campaignResult.data.results)
      setTransactions(transactionResult.data.results)
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Advertising campaigns could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([advertisingApi.adminCampaigns(), advertisingApi.adminTransactions()])
      .then(([campaignResult, transactionResult]) => {
        if (active) {
          setCampaigns(campaignResult.data.results)
          setTransactions(transactionResult.data.results)
          setError('')
        }
      })
      .catch(loadError => {
        if (active) setError(errorMessage(loadError, 'Advertising campaigns could not be loaded.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleCampaigns = useMemo(
    () => filter === 'all' ? campaigns : campaigns.filter(campaign => campaign.status === filter),
    [campaigns, filter],
  )

  const submitAction = async () => {
    if (!dialog) return
    if (['reject', 'pause', 'cancel'].includes(dialog.action) && !reason.trim()) {
      setError('A reason is required for this campaign action.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await advertisingApi.adminUpdateCampaign(dialog.campaign.id, dialog.action, reason.trim())
      setNotice(`Campaign ${dialog.action === 'approve' ? 'approved' : `${dialog.action}d`}.`)
      setDialog(null)
      setReason('')
      await load()
    } catch (actionError) {
      setError(errorMessage(actionError, 'Campaign action could not be completed.'))
    } finally {
      setBusy(false)
    }
  }

  const adjustWallet = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await advertisingApi.adminAdjustWallet({
        trader_uuid: traderUuid.trim(),
        amount: adjustmentAmount,
        reason: adjustmentReason.trim(),
      }, adjustmentRequestKey)
      setTraderUuid('')
      setAdjustmentAmount('')
      setAdjustmentReason('')
      setAdjustmentRequestKey(crypto.randomUUID())
      setNotice('Advertising wallet adjustment recorded in the ledger.')
      await load()
    } catch (adjustError) {
      setError(errorMessage(adjustError, 'Wallet adjustment could not be recorded.'))
    } finally {
      setBusy(false)
    }
  }

  const askAction = (campaign: ApiAdminAdvertisingCampaign, action: CampaignAction) => {
    setReason('')
    setError('')
    setDialog({ campaign, action })
  }

  if (loading) return <div className="flex justify-center py-32"><LoaderCircle className="h-8 w-8 animate-spin text-[#22C55E]" /></div>

  const pending = campaigns.filter(campaign => campaign.status === 'pending_review').length
  const active = campaigns.filter(campaign => campaign.status === 'active').length
  const suspicious = campaigns.reduce((total, campaign) => total + (campaign.suspicious_clicks ?? 0), 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-8 md:p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071A2B] text-[#22C55E]"><Megaphone size={21} /></div>
        <div><h1 className="text-xl font-extrabold text-[#071A2B]">Advertising management</h1><p className="text-[12px] text-[#64748B]">Review sponsored campaigns, activity and dedicated wallet adjustments.</p></div>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] font-semibold text-green-800">{notice}</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4"><p className="text-xl font-extrabold text-[#071A2B]">{campaigns.length}</p><p className="text-[11px] font-semibold text-[#64748B]">Total campaigns</p></div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4"><p className="text-xl font-extrabold text-[#071A2B]">{pending}</p><p className="text-[11px] font-semibold text-[#64748B]">Pending review</p></div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4"><p className="text-xl font-extrabold text-[#071A2B]">{active}</p><p className="text-[11px] font-semibold text-[#64748B]">Active campaigns</p></div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4"><p className={`text-xl font-extrabold ${suspicious ? 'text-amber-700' : 'text-[#071A2B]'}`}>{suspicious}</p><p className="text-[11px] font-semibold text-[#64748B]">Suspicious clicks</p></div>
      </section>

      <form onSubmit={adjustWallet} className="grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="flex items-center gap-2 lg:col-span-5"><Wallet size={16} className="text-[#1E3A8A]" /><h2 className="text-[13px] font-extrabold text-[#071A2B]">Adjust advertising wallet</h2></div>
        <label className="text-[11px] font-bold text-[#475569]">Trader UUID<input required value={traderUuid} onChange={event => setTraderUuid(event.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="text-[11px] font-bold text-[#475569]">Amount (UGX)<input required type="number" step="1" placeholder="Positive to credit, negative to debit" value={adjustmentAmount} onChange={event => setAdjustmentAmount(event.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="text-[11px] font-bold text-[#475569] sm:col-span-2">Reason<input required maxLength={500} value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} className={`${inputClass} mt-1`} /></label>
        <button disabled={busy} className="rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50">Record adjustment</button>
        <p className="text-[10px] text-[#64748B] sm:col-span-2 lg:col-span-5">Every adjustment is audited and recorded as an immutable wallet ledger entry. Use a negative amount to debit.</p>
      </form>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-[#071A2B]">Campaigns</h2>
          <select aria-label="Filter campaigns" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] font-semibold">
            {['all', 'pending_review', 'active', 'paused', 'budget_exhausted', 'scheduled', 'completed', 'rejected', 'cancelled'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
          </select>
        </div>
        {visibleCampaigns.length ? visibleCampaigns.map(campaign => (
          <article key={campaign.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-[#071A2B]">{campaign.name}</h3><Status value={campaign.status} /></div>
                <p className="mt-1 text-[11px] text-[#64748B]">{campaign.trader_name} · {campaign.offers.map(offer => offer.name).join(', ')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {campaign.status === 'pending_review' && <>
                  <button type="button" onClick={() => askAction(campaign, 'approve')} className="rounded-md bg-green-700 px-3 py-1.5 text-[11px] font-bold text-white">Approve</button>
                  <button type="button" onClick={() => askAction(campaign, 'reject')} className="rounded-md border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-700">Reject</button>
                </>}
                {campaign.status === 'active' && <button type="button" onClick={() => askAction(campaign, 'pause')} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold">Pause</button>}
                {campaign.status === 'paused' && <button type="button" onClick={() => askAction(campaign, 'resume')} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold">Resume</button>}
                {['active', 'paused', 'pending_review', 'scheduled'].includes(campaign.status) && <button type="button" onClick={() => askAction(campaign, 'cancel')} className="rounded-md border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-700">Cancel</button>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4 lg:grid-cols-8">
              <div><p className="text-[#94A3B8]">CPC max</p><p className="mt-0.5 font-bold">{money(campaign.max_cpc)}</p></div>
              <div><p className="text-[#94A3B8]">Daily budget</p><p className="mt-0.5 font-bold">{money(campaign.daily_budget)}</p></div>
              <div><p className="text-[#94A3B8]">Total budget</p><p className="mt-0.5 font-bold">{money(campaign.total_budget)}</p></div>
              <div><p className="text-[#94A3B8]">Spend</p><p className="mt-0.5 font-bold">{money(campaign.spent)}</p></div>
              <div><p className="text-[#94A3B8]">Wallet</p><p className="mt-0.5 font-bold">{money(campaign.wallet_balance)}</p></div>
              <div><p className="text-[#94A3B8]">Impressions</p><p className="mt-0.5 font-bold">{campaign.impressions.toLocaleString()}</p></div>
              <div><p className="text-[#94A3B8]">Clicks / CTR</p><p className="mt-0.5 font-bold">{campaign.clicks} / {Number(campaign.ctr).toFixed(2)}%</p></div>
              <div><p className="text-[#94A3B8]">Suspicious</p><p className={`mt-0.5 font-bold ${(campaign.suspicious_clicks ?? 0) ? 'text-amber-700' : ''}`}>{campaign.suspicious_clicks ?? 0}</p></div>
            </div>
            <p className="mt-3 text-[10px] text-[#94A3B8]">{new Date(campaign.starts_at).toLocaleString()} – {new Date(campaign.ends_at).toLocaleString()}</p>
          </article>
        )) : <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-[12px] text-[#64748B]">No campaigns match this filter.</p>}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-5 py-3"><h2 className="text-[13px] font-extrabold text-[#071A2B]">Recent wallet ledger</h2></div>
        {transactions.length ? (
          <div className="divide-y divide-[#F1F5F9]">
            {transactions.map(transaction => (
              <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="text-[12px] font-bold text-[#071A2B]">{transaction.trader.business_name} · {transaction.kind}</p>
                  <p className="text-[10px] text-[#94A3B8]">{transaction.reference} · {new Date(transaction.created_at).toLocaleString()} · balance {money(transaction.balance_after)}</p>
                </div>
                <p className={`text-[12px] font-extrabold ${Number(transaction.amount) >= 0 ? 'text-green-700' : 'text-[#071A2B]'}`}>{money(transaction.amount)}</p>
              </div>
            ))}
          </div>
        ) : <p className="px-5 py-6 text-[12px] text-[#64748B]">No advertising wallet transactions yet.</p>}
      </section>

      {dialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="campaign-action-title">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="campaign-action-title" className="font-extrabold capitalize text-[#071A2B]">{dialog.action} campaign</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">{dialog.campaign.name} · {dialog.campaign.trader_name}</p>
            <label className="mt-4 block text-[11px] font-bold text-[#475569]">
              Reason {['reject', 'pause', 'cancel'].includes(dialog.action) ? '(required)' : '(optional)'}
              <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={3} className={`${inputClass} mt-1 resize-y`} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[12px] font-bold">Cancel</button>
              <button type="button" onClick={() => void submitAction()} disabled={busy} className="rounded-lg bg-[#071A2B] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
