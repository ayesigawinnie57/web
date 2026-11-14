import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, LoaderCircle, Megaphone, Plus, RefreshCw, Wallet } from 'lucide-react'
import {
  advertisingApi,
  type ApiAdvertisingCampaign,
  type ApiAdvertisingDashboard,
  type ApiAdvertisingOffer,
} from '../lib/api'

const money = (value: string | number) =>
  `UGX ${Number(value).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`

const inputClass = 'w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]'

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: Record<string, unknown> } }).response
    const data = response?.data
    if (typeof data?.detail === 'string') return data.detail
    if (data) {
      for (const [field, value] of Object.entries(data)) {
        if (typeof value === 'string') return `${field.replaceAll('_', ' ')}: ${value}`
        if (Array.isArray(value) && typeof value[0] === 'string') {
          return `${field.replaceAll('_', ' ')}: ${value[0]}`
        }
      }
    }
  }
  return fallback
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[17px] font-extrabold text-[#071A2B]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#64748B]">{label}</p>
    </div>
  )
}

function Status({ value }: { value: ApiAdvertisingCampaign['status'] }) {
  const label = value.replaceAll('_', ' ')
  const color = value === 'active'
    ? 'bg-green-50 text-green-700'
    : value === 'rejected' || value === 'cancelled'
      ? 'bg-red-50 text-red-700'
      : value === 'pending_review' || value === 'scheduled'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${color}`}>{label}</span>
}

export default function TraderAdvertising() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const advertisingPath = `/trader/${traderUuid}/advertising`
  const isCreatePage = location.pathname.endsWith('/advertising/campaigns/new')
  const [dashboard, setDashboard] = useState<ApiAdvertisingDashboard | null>(null)
  const [offers, setOffers] = useState<ApiAdvertisingOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => (
    (location.state as { advertisingNotice?: string } | null)?.advertisingNotice ?? ''
  ))
  const [busy, setBusy] = useState(false)
  const [showRechargeForm, setShowRechargeForm] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([])
  const [maxCpc, setMaxCpc] = useState('')
  const [dailyBudget, setDailyBudget] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [cardNumber, setCardNumber] = useState('5200 0000 0000 0114')
  const [expiry, setExpiry] = useState('07/28')
  const [cvv, setCvv] = useState('123')
  const [cardholderName, setCardholderName] = useState('')
  const [rechargeRequestKey, setRechargeRequestKey] = useState(() => crypto.randomUUID())

  const load = useCallback(async () => {
    if (!traderUuid) return
    try {
      const [dashboardResult, offerResult] = await Promise.all([
        advertisingApi.dashboard(traderUuid),
        advertisingApi.offers(traderUuid),
      ])
      setDashboard(dashboardResult.data)
      setOffers(offerResult.data)
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Advertising data could not be loaded. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [traderUuid])

  const refreshStats = async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!traderUuid) return
    let active = true
    Promise.all([
      advertisingApi.dashboard(traderUuid),
      advertisingApi.offers(traderUuid),
    ])
      .then(([dashboardResult, offerResult]) => {
        if (!active) return
        setDashboard(dashboardResult.data)
        setOffers(offerResult.data)
      })
      .catch(loadError => {
        if (active) setError(errorMessage(loadError, 'Advertising data could not be loaded. Please try again.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [traderUuid])

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!traderUuid || !selectedOfferIds.length) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data: result } = await advertisingApi.createCampaign(traderUuid, {
        name: campaignName.trim(),
        offer_ids: selectedOfferIds,
        max_cpc: maxCpc,
        daily_budget: dailyBudget,
        total_budget: totalBudget,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      })
      const campaign = result.campaign
      setCampaignName('')
      setSelectedOfferIds([])
      setMaxCpc('')
      setDailyBudget('')
      setTotalBudget('')
      setStartsAt('')
      setEndsAt('')
      const campaignNotice = campaign.status === 'pending_review'
        ? 'Campaign submitted for review.'
        : campaign.status === 'active'
          ? 'Campaign created and activated.'
          : 'Campaign created.'
      navigate(advertisingPath, { state: { advertisingNotice: campaignNotice } })
    } catch (saveError) {
      setError(errorMessage(saveError, 'Campaign could not be created. Check the campaign details and try again.'))
    } finally {
      setBusy(false)
    }
  }

  const updateCampaign = async (campaign: ApiAdvertisingCampaign, action: 'pause' | 'resume' | 'cancel') => {
    if (!traderUuid) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await advertisingApi.updateCampaign(traderUuid, campaign.id, action)
      setNotice(`Campaign ${action === 'cancel' ? 'cancelled' : `${action}d`}.`)
      await load()
    } catch (updateError) {
      setError(errorMessage(updateError, 'Campaign could not be updated.'))
    } finally {
      setBusy(false)
    }
  }

  const recharge = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!traderUuid) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data } = await advertisingApi.recharge(traderUuid, {
        amount: rechargeAmount,
        card_number: cardNumber,
        expiry,
        cvv,
        cardholder_name: cardholderName,
      }, rechargeRequestKey)
      setNotice(`Recharge successful · ${data.payment.reference} · ${money(data.wallet.amount_added)} added · previous balance ${money(data.wallet.previous_balance)} · new balance ${money(data.wallet.balance)}.`)
      setRechargeAmount('')
      setCardNumber('')
      setExpiry('')
      setCvv('')
      setCardholderName('')
      setShowRechargeForm(false)
      setRechargeRequestKey(crypto.randomUUID())
      await load()
    } catch (paymentError) {
      setError(errorMessage(paymentError, 'Recharge could not be completed. No funds were added.'))
    } finally {
      setBusy(false)
    }
  }

  const toggleOffer = (offerId: number) => {
    setSelectedOfferIds(current => current.includes(offerId)
      ? current.filter(id => id !== offerId)
      : [...current, offerId])
  }

  if (loading) return <div className="flex justify-center py-32"><LoaderCircle className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  if (!dashboard) return <div className="p-6 text-sm text-red-600">{error || 'Advertising is unavailable.'}</div>

  const stats = dashboard.stats
  const canRecharge = dashboard.wallet.dummy_payments_enabled

  if (isCreatePage) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-4 pb-8 md:p-8">
        <Link to={advertisingPath} className="text-[12px] font-bold text-[#1E3A8A] hover:underline">← Sponsored Products</Link>
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071A2B] text-[#22C55E]"><Megaphone size={21} /></div>
          <div>
            <h1 className="text-xl font-extrabold text-[#071A2B]">Create campaign</h1>
            <p className="text-[12px] text-[#64748B]">Set up a campaign for your eligible marketplace offers.</p>
          </div>
        </header>
        {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
        <form onSubmit={createCampaign} className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <p className="text-[11px] text-[#64748B]">Only eligible offers you own are available. Campaigns may require admin review.</p>
          <label className="block text-[11px] font-bold text-[#475569]">Campaign name<input required maxLength={120} value={campaignName} onChange={event => setCampaignName(event.target.value)} className={`${inputClass} mt-1`} /></label>
          <fieldset>
            <legend className="mb-2 text-[11px] font-bold text-[#475569]">Choose products to promote</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {offers.map(offer => (
                <label key={offer.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selectedOfferIds.includes(offer.id) ? 'border-[#22C55E] bg-green-50' : 'border-[#E2E8F0]'}`}>
                  <input type="checkbox" checked={selectedOfferIds.includes(offer.id)} onChange={() => toggleOffer(offer.id)} className="mt-1 accent-[#22C55E]" />
                  {offer.image && <img src={offer.image} alt="" className="h-12 w-12 rounded-md object-cover" />}
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-[#071A2B]">{offer.name}</span>
                    <span className="mt-1 block text-[10px] text-[#64748B]">{money(offer.price)} · {offer.stock} in stock</span>
                  </span>
                </label>
              ))}
              {!offers.length && <p className="text-[12px] text-[#64748B]">No eligible in-stock offers are available for advertising.</p>}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-[#475569]">Maximum CPC (UGX)<input required type="number" min="1" step="1" value={maxCpc} onChange={event => setMaxCpc(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Daily budget (UGX)<input required type="number" min={maxCpc || '1'} step="1" value={dailyBudget} onChange={event => setDailyBudget(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Total budget (UGX)<input required type="number" min={maxCpc || '1'} step="1" value={totalBudget} onChange={event => setTotalBudget(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <p className="self-center text-[11px] text-[#64748B] sm:col-span-2">Both daily and total budgets must be at least one maximum CPC click ({maxCpc ? money(maxCpc) : 'set your CPC above'}).</p>
            <label className="text-[11px] font-bold text-[#475569]">Starts at<input required type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Ends at<input required type="datetime-local" min={startsAt} value={endsAt} onChange={event => setEndsAt(event.target.value)} className={`${inputClass} mt-1`} /></label>
          </div>
          <div className="flex gap-2">
            <button disabled={busy || !selectedOfferIds.length} className="rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50">{busy ? 'Submitting...' : 'Submit campaign'}</button>
            <Link to={advertisingPath} className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-bold text-[#475569]">Cancel</Link>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-8 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071A2B] text-[#22C55E]"><Megaphone size={21} /></div>
          <div>
            <h1 className="text-xl font-extrabold text-[#071A2B]">Sponsored Products</h1>
            <p className="text-[12px] text-[#64748B]">Promote your own active marketplace offers.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowRechargeForm(current => !current)} disabled={!canRecharge}
            className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-[12px] font-bold text-[#071A2B] disabled:cursor-not-allowed disabled:opacity-50">
            <Wallet size={15} /> Add funds
          </button>
          <Link to={`${advertisingPath}/campaigns/new`} aria-disabled={!offers.length}
            className={`inline-flex items-center gap-2 rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white ${!offers.length ? 'pointer-events-none opacity-50' : ''}`}>
            <Plus size={15} /> Create campaign
          </Link>
        </div>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] font-semibold text-green-800">{notice}</p>}
      <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
        For fraud prevention, clicks made from your own trader account and repeat clicks from the same visitor are not counted or billed. To verify billing, use a separate buyer account or device. Refresh stats to see new activity.
      </p>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Advertising wallet</p>
            <p className="mt-1 text-2xl font-extrabold text-[#071A2B]">{money(dashboard.wallet.balance)}</p>
          </div>
          {!canRecharge && <p className="max-w-md text-[11px] text-[#64748B]">Wallet recharges are not enabled in this environment.</p>}
        </div>
      </section>

      {showRechargeForm && canRecharge && (
        <form onSubmit={recharge} className="space-y-4 rounded-xl border border-amber-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-[#071A2B]">Add advertising funds</h2>
              <p className="mt-1 text-[11px] text-[#64748B]">Test mode · simulated payment only. Card details are sent for validation and are not saved.</p>
            </div>
            <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-800">TEST MODE</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-[11px] font-bold text-[#475569]">Amount (UGX)<input required type="number" min="1000" step="1" value={rechargeAmount} onChange={event => setRechargeAmount(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Card number<input required inputMode="numeric" autoComplete="off" value={cardNumber} onChange={event => setCardNumber(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Expiry<input required autoComplete="off" placeholder="MM/YY" value={expiry} onChange={event => setExpiry(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">CVV<input required type="password" inputMode="numeric" autoComplete="off" value={cvv} onChange={event => setCvv(event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-[11px] font-bold text-[#475569]">Cardholder name<input required autoComplete="off" value={cardholderName} onChange={event => setCardholderName(event.target.value)} className={`${inputClass} mt-1`} /></label>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50">{busy ? 'Processing...' : 'Recharge wallet'}</button>
            <button type="button" onClick={() => setShowRechargeForm(false)} className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-bold text-[#475569]">Cancel</button>
          </div>
        </form>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Active campaigns" value={String(stats.active_campaigns)} />
        <Stat label="Pending review" value={String(stats.pending_campaigns)} />
        <Stat label="Impressions" value={stats.impressions.toLocaleString()} />
        <Stat label="Valid clicks" value={stats.clicks.toLocaleString()} />
        <Stat label="Total spent" value={money(stats.total_spent)} />
        <Stat label="Click-through rate" value={`${Number(stats.ctr).toFixed(2)}%`} />
        <Stat label="Average CPC" value={money(stats.average_cpc)} />
        <Stat label="Remaining budget" value={money(stats.remaining_budget)} />
        <Stat label="Paused campaigns" value={String(stats.paused_campaigns)} />
        <Stat label="Completed campaigns" value={String(stats.completed_campaigns)} />
        <Stat label="Rejected campaigns" value={String(stats.rejected_campaigns)} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-[#071A2B]">Campaigns</h2>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void refreshStats()} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#334155] disabled:opacity-50">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh stats
            </button>
            <span className="text-[11px] text-[#64748B]">{dashboard.campaigns.length} total</span>
          </div>
        </div>
        {dashboard.campaigns.length ? dashboard.campaigns.map(campaign => (
          <article key={campaign.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-[#071A2B]">{campaign.name}</h3><Status value={campaign.status} /></div>
                <p className="mt-1 truncate text-[11px] text-[#64748B]">{campaign.offers.map(offer => offer.name).join(' · ')}</p>
                {campaign.pause_reason && <p className="mt-1 text-[11px] text-amber-700">Paused: {campaign.pause_reason}</p>}
              </div>
              <div className="flex gap-2">
                {campaign.status === 'active' && <button type="button" disabled={busy} onClick={() => void updateCampaign(campaign, 'pause')} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold disabled:opacity-50">Pause</button>}
                {campaign.status === 'paused' && <button type="button" disabled={busy} onClick={() => void updateCampaign(campaign, 'resume')} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold disabled:opacity-50">Resume</button>}
                {['active', 'paused', 'pending_review', 'scheduled'].includes(campaign.status) && <button type="button" disabled={busy} onClick={() => void updateCampaign(campaign, 'cancel')} className="rounded-md border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50">Cancel</button>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4 lg:grid-cols-7">
              <div><p className="text-[#94A3B8]">Impressions</p><p className="mt-0.5 font-bold">{campaign.impressions.toLocaleString()}</p></div>
              <div><p className="text-[#94A3B8]">Clicks</p><p className="mt-0.5 font-bold">{campaign.clicks.toLocaleString()}</p></div>
              <div><p className="text-[#94A3B8]">CTR</p><p className="mt-0.5 font-bold">{Number(campaign.ctr).toFixed(2)}%</p></div>
              <div><p className="text-[#94A3B8]">Avg. CPC</p><p className="mt-0.5 font-bold">{money(campaign.average_cpc)}</p></div>
              <div><p className="text-[#94A3B8]">Spend</p><p className="mt-0.5 font-bold">{money(campaign.spent)}</p></div>
              <div><p className="text-[#94A3B8]">Budget left</p><p className="mt-0.5 font-bold">{money(campaign.remaining_budget)}</p></div>
              <div><p className="text-[#94A3B8]">Dates</p><p className="mt-0.5 font-bold">{new Date(campaign.starts_at).toLocaleDateString()} – {new Date(campaign.ends_at).toLocaleDateString()}</p></div>
            </div>
          </article>
        )) : <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-[12px] text-[#64748B]">No campaigns yet. Choose an eligible offer to get started.</p>}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-5 py-3"><h2 className="text-[13px] font-extrabold text-[#071A2B]">Recent advertising transactions</h2></div>
        {dashboard.transactions.length ? (
          <div className="divide-y divide-[#F1F5F9]">
            {dashboard.transactions.map(transaction => (
              <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div><p className="text-[12px] font-bold text-[#071A2B]">{transaction.description}</p><p className="text-[10px] text-[#94A3B8]">{transaction.reference} · {new Date(transaction.created_at).toLocaleString()}</p></div>
                <p className={`text-[12px] font-extrabold ${Number(transaction.amount) >= 0 ? 'text-green-700' : 'text-[#071A2B]'}`}>{money(transaction.amount)}</p>
              </div>
            ))}
          </div>
        ) : <p className="px-5 py-6 text-[12px] text-[#64748B]">No advertising transactions yet.</p>}
      </section>
    </div>
  )
}
