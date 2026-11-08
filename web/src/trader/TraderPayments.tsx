import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowRight, Building2, Clock3, CreditCard,
  Landmark, LoaderCircle, Settings, Smartphone, Wallet,
} from 'lucide-react'
import { tradersApi, type ApiTraderWallet } from '../lib/api'
import { MOBILE_MONEY_PROVIDERS, UGANDA_BANKS } from './payoutOptions'

type PayoutMethod = '' | 'mobile_money' | 'bank'
type PayoutForm = {
  payout_method: PayoutMethod
  payout_provider: string
  payout_account_name: string
  payout_account_number: string
  payout_branch: string
}

const EMPTY_PAYOUT: PayoutForm = {
  payout_method: '',
  payout_provider: '',
  payout_account_name: '',
  payout_account_number: '',
  payout_branch: '',
}

function payoutFormFromWallet(wallet: ApiTraderWallet): PayoutForm {
  return {
    payout_method: (wallet.payout_account.method || '') as PayoutMethod,
    payout_provider: wallet.payout_account.provider || '',
    payout_account_name: wallet.payout_account.account_name || '',
    payout_account_number: wallet.payout_account.account_number || '',
    payout_branch: wallet.payout_account.branch || '',
  }
}

const money = (value: string | number) =>
  `UGX ${Number(value).toLocaleString('en-UG', { maximumFractionDigits: 2 })}`

function releaseProgress(createdAt: string, availableAt: string) {
  const start = new Date(createdAt).getTime()
  const end = new Date(availableAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 100
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
}

export default function TraderPayments() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [wallet, setWallet] = useState<ApiTraderWallet | null>(null)
  const [payout, setPayout] = useState<PayoutForm>(EMPTY_PAYOUT)
  const [amount, setAmount] = useState('')
  const [editingPayout, setEditingPayout] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadWallet = useCallback(async () => {
    if (!traderUuid) return
    const { data } = await tradersApi.wallet(traderUuid)
    setWallet(data)
    setPayout(payoutFormFromWallet(data))
  }, [traderUuid])

  useEffect(() => {
    if (!traderUuid) return
    let active = true
    tradersApi.wallet(traderUuid)
      .then(({ data }) => {
        if (!active) return
        setWallet(data)
        setPayout(payoutFormFromWallet(data))
      })
      .catch(() => {
        if (active) setError('Could not load your payments. Please refresh and try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [traderUuid])

  const payoutIsComplete = Boolean(
    payout.payout_method && payout.payout_provider.trim()
      && payout.payout_account_name.trim() && payout.payout_account_number.trim(),
  )

  const pendingReturnCount = useMemo(
    () => wallet?.earnings.filter(earning => earning.return_request_status
      && earning.return_request_status !== 'rejected' && earning.status === 'active').length ?? 0,
    [wallet],
  )

  const savePayout = async () => {
    if (!traderUuid || !payoutIsComplete) return
    setSavingPayout(true)
    setError('')
    setNotice('')
    try {
      const formData = new FormData()
      Object.entries(payout).forEach(([key, value]) => formData.append(key, value))
      await tradersApi.updateAccount(traderUuid, formData)
      await loadWallet()
      setEditingPayout(false)
      setNotice('Payout details saved.')
    } catch (saveError: any) {
      setError(saveError?.response?.data?.detail || 'Could not save your payout details.')
    } finally {
      setSavingPayout(false)
    }
  }

  const requestWithdrawal = async () => {
    if (!traderUuid || !amount) return
    setRequesting(true)
    setError('')
    setNotice('')
    try {
      await tradersApi.requestWithdrawal(traderUuid, amount)
      await loadWallet()
      setAmount('')
      setNotice('Withdrawal request submitted. The admin team will process the transfer.')
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.amount
          || requestError?.response?.data?.detail
          || 'Could not submit your withdrawal request.',
      )
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-32"><LoaderCircle className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  if (!wallet) {
    return <div className="p-6 text-sm text-red-600">{error || 'Payments are unavailable right now.'}</div>
  }

  const total = Number(wallet.total_earned)
  const available = Number(wallet.available_balance)
  const motionPercentage = total > 0 ? Math.min(100, Math.max(5, (available / total) * 100)) : 0
  const payoutProviders: readonly string[] = payout.payout_method === 'bank' ? UGANDA_BANKS : MOBILE_MONEY_PROVIDERS

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-8 md:p-8">
      <style>{`
        @keyframes payout-travel {
          0% { left: 0%; opacity: 0; transform: translate(-50%, -50%) scale(.75); }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: 100%; opacity: 0; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes payout-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, .08); }
          50% { box-shadow: 0 0 24px 4px rgba(34, 197, 94, .22); }
        }
        .payout-travel { animation: payout-travel 3.2s ease-in-out infinite; }
        .payout-glow { animation: payout-glow 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .payout-travel, .payout-glow { animation: none; }
        }
      `}</style>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#22C55E]">Trader portal</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#071A2B]">Payments</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">Track product earnings, release dates, and withdrawals.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingPayout(value => !value); setError(''); setNotice('') }}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-[12px] font-bold text-[#071A2B] hover:border-[#22C55E]"
        >
          <Settings size={16} />
          {editingPayout ? 'Close payout settings' : 'Payout settings'}
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[12px] text-green-800">{notice}</div>}

      <section className="overflow-hidden rounded-2xl bg-[#071A2B] p-5 text-white shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/55">Trader wallet balance</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight">{money(wallet.total_earned)}</p>
            <p className="mt-1 text-[12px] text-white/60">Earnings from completed, non-returned orders</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 text-[#22C55E]"><Wallet size={24} /></div>
        </div>

        <div className="mt-7 rounded-xl border border-white/10 bg-white/[.04] p-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
            <span className="text-white/70">Order earnings</span>
            <span className="text-white/70">Your payout account</span>
          </div>
          <div className="relative my-4 h-2 rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-[#22C55E]/50 to-[#22C55E]" style={{ width: `${motionPercentage}%` }} />
            {total > 0 && (
              <span className="payout-travel absolute top-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#22C55E] text-[#071A2B] shadow-lg" aria-hidden="true">
                <ArrowRight size={15} />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-white/70"><CreditCard size={14} /> Paid order</div>
            <div className="payout-glow flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] text-[#071A2B]">
              {wallet.payout_account.method === 'bank' ? <Landmark size={17} /> : wallet.payout_account.method ? <Smartphone size={17} /> : <Building2 size={17} />}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-white/60">
            Locked earnings move to available after the {wallet.payout_hold_days}-day return period. Return requests pause those earnings until resolved.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Balance label="Locked during return window" value={money(wallet.locked_balance)} icon={<Clock3 size={15} />} />
          <Balance label="Available to withdraw" value={money(wallet.available_balance)} icon={<ArrowDownToLine size={15} />} />
          <Balance label="Withdrawal in progress" value={money(wallet.pending_withdrawal)} icon={<LoaderCircle size={15} />} />
        </div>
      </section>

      {editingPayout && (
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-[15px] font-extrabold text-[#071A2B]">Payout account settings</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">Edit the bank or mobile-money destination for future withdrawal requests.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
              Payout method
              <select
                value={payout.payout_method}
                onChange={event => setPayout({ ...payout, payout_method: event.target.value as PayoutMethod, payout_provider: '' })}
                className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] font-medium normal-case text-[#071A2B]"
              >
                <option value="">Choose a method</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
              </select>
            </label>

            {payout.payout_method && (
              <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                {payout.payout_method === 'bank' ? 'Bank' : 'Mobile money network'}
                <select
                  value={payout.payout_provider}
                  onChange={event => setPayout({ ...payout, payout_provider: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] font-medium normal-case text-[#071A2B]"
                >
                  <option value="">Choose {payout.payout_method === 'bank' ? 'a bank' : 'a network'}</option>
                  {payout.payout_provider && !payoutProviders.includes(payout.payout_provider) && (
                    <option value={payout.payout_provider}>{payout.payout_provider} (current)</option>
                  )}
                  {payoutProviders.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
              Account holder name
              <input value={payout.payout_account_name} onChange={event => setPayout({ ...payout, payout_account_name: event.target.value })} autoComplete="name" className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2.5 text-[13px] font-medium normal-case text-[#071A2B]" />
            </label>
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
              {payout.payout_method === 'bank' ? 'Account number' : 'Mobile money number'}
              <input value={payout.payout_account_number} onChange={event => setPayout({ ...payout, payout_account_number: event.target.value })} autoComplete="off" inputMode="numeric" className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2.5 text-[13px] font-medium normal-case text-[#071A2B]" />
            </label>
            {payout.payout_method === 'bank' && (
              <label className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                Branch (optional)
                <input value={payout.payout_branch} onChange={event => setPayout({ ...payout, payout_branch: event.target.value })} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2.5 text-[13px] font-medium normal-case text-[#071A2B]" />
              </label>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#64748B]">Your account is used when an admin processes a withdrawal.</p>
            <button type="button" onClick={savePayout} disabled={!payoutIsComplete || savingPayout} className="rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {savingPayout ? 'Saving…' : 'Save payout account'}
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-extrabold text-[#071A2B]">Earning activity</h2>
              <p className="mt-1 text-[11px] text-[#64748B]">Each order releases independently after its hold period.</p>
            </div>
            {pendingReturnCount > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">{pendingReturnCount} return hold(s)</span>}
          </div>
          {wallet.earnings.length === 0 ? (
            <div className="rounded-lg bg-[#F8FAFC] px-4 py-8 text-center text-[12px] text-[#64748B]">Completed-order earnings will appear here.</div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {wallet.earnings.map(earning => {
                const progress = releaseProgress(earning.created_at, earning.available_at)
                const returnHeld = earning.status === 'active'
                  && Boolean(earning.return_request_status)
                  && earning.return_request_status !== 'rejected'
                const released = progress >= 100 && !returnHeld && earning.status === 'active'
                return (
                  <article key={earning.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-bold text-[#071A2B]">{earning.product_name}</p>
                        <p className="mt-0.5 text-[10px] text-[#94A3B8]">Order {earning.order_code} · Qty {earning.quantity}</p>
                      </div>
                      <p className="text-[12px] font-extrabold text-[#071A2B]">{money(earning.seller_amount)}</p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className={`h-full rounded-full transition-[width] duration-700 ${earning.status === 'reversed' ? 'bg-red-400' : returnHeld ? 'bg-amber-400' : released ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'}`} style={{ width: `${earning.status === 'reversed' ? 100 : returnHeld ? Math.min(progress, 95) : progress}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <span className={earning.status === 'reversed' ? 'font-bold text-red-600' : returnHeld ? 'font-bold text-amber-700' : released ? 'font-bold text-green-700' : 'text-[#64748B]'}>
                        {earning.status === 'reversed'
                          ? 'Returned / reversed'
                          : returnHeld
                            ? 'Return in review — payout paused'
                            : released
                              ? 'Available'
                              : `Unlocks ${new Date(earning.available_at).toLocaleDateString()}`}
                      </span>
                      <span className="text-[#94A3B8]">{released ? '100%' : `${Math.floor(progress)}% through hold`}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-extrabold text-[#071A2B]">Payout destination</h2>
                <p className="mt-1 text-[11px] text-[#64748B]">Where you receive your withdrawals.</p>
              </div>
              <button type="button" aria-label="Edit payout account settings" onClick={() => setEditingPayout(value => !value)} className="rounded-lg border border-[#E2E8F0] p-2 text-[#64748B] hover:border-[#22C55E] hover:text-[#071A2B]">
                <Settings size={16} />
              </button>
            </div>
            {wallet.payout_account.method ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F8FAFC] p-3">
                <div className="rounded-lg bg-white p-2 text-[#071A2B]">{wallet.payout_account.method === 'bank' ? <Landmark size={18} /> : <Smartphone size={18} />}</div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-[#071A2B]">{wallet.payout_account.provider}</p>
                  <p className="truncate text-[11px] text-[#64748B]">{wallet.payout_account.account_name} · {wallet.payout_account.account_number}</p>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingPayout(true)} className="mt-4 w-full rounded-lg border border-dashed border-[#CBD5E1] p-4 text-left text-[12px] font-semibold text-[#64748B] hover:border-[#22C55E]">
                Add a mobile money or bank account to request withdrawals.
              </button>
            )}
          </section>

          <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Withdraw available funds</h2>
            <p className="mt-1 text-[11px] leading-5 text-[#64748B]">Your request is reserved immediately. An admin transfers the money and records the payment reference.</p>
            <label className="mt-4 block text-[11px] font-bold text-[#64748B]">
              Amount (UGX)
              <input type="number" min={wallet.payout_minimum} max={wallet.available_balance} step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-[#CBD5E1] px-3 py-2.5 text-[13px] text-[#071A2B]" />
            </label>
            <button type="button" onClick={requestWithdrawal} disabled={requesting || !payoutIsComplete || available <= 0 || !amount} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-[12px] font-extrabold text-[#071A2B] disabled:cursor-not-allowed disabled:opacity-50">
              {requesting ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowDownToLine size={15} />}
              {requesting ? 'Submitting…' : 'Request withdrawal'}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#94A3B8]">Minimum {money(wallet.payout_minimum)} · Fee {money(wallet.withdrawal_fee)}</p>
          </section>
        </div>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="text-[14px] font-extrabold text-[#071A2B]">Withdrawal history</h2>
        {wallet.withdrawals.length === 0 ? (
          <p className="py-5 text-center text-[12px] text-[#94A3B8]">No withdrawal requests yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#E2E8F0]">
            {wallet.withdrawals.map(withdrawal => (
              <div key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[12px] font-bold text-[#071A2B]">{money(withdrawal.payout_amount)} · {withdrawal.payout_provider}</p>
                  <p className="mt-0.5 text-[10px] text-[#94A3B8]">Requested {new Date(withdrawal.created_at).toLocaleString()}</p>
                  {withdrawal.transfer_reference && <p className="mt-0.5 text-[10px] text-[#64748B]">Transfer reference: {withdrawal.transfer_reference}</p>}
                  {withdrawal.admin_note && <p className="mt-0.5 text-[10px] text-[#64748B]">{withdrawal.admin_note}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                  withdrawal.status === 'paid' ? 'bg-green-50 text-green-700'
                    : withdrawal.status === 'rejected' ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-800'
                }`}>{withdrawal.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Balance({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[.08] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/60">{icon}{label}</p>
      <p className="mt-1.5 text-[16px] font-extrabold">{value}</p>
    </div>
  )
}
