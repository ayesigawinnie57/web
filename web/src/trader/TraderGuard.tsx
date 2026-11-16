import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { tradersApi } from '../lib/api'
import { requiresDesktopInstall } from '../lib/pwaInstall'
import DesktopAdminInstallGate from '../components/DesktopAdminInstallGate'

export default function TraderGuard() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const location = useLocation()
  const [state, setState] = useState<'loading' | 'ok' | 'agreement' | 'denied'>('loading')

  useEffect(() => {
    let active = true
    setState('loading')
    if (!localStorage.getItem('access_token')) {
      setState('denied')
      return () => { active = false }
    }
    tradersApi.profile(traderUuid!)
      .then(() => { if (active) setState('ok') })
      .catch(async () => {
        const { data: trader } = await tradersApi.me()
        if (!active) return
        const needsAgreement = trader !== null
          && trader.uuid === traderUuid
          && trader.status === 'approved'
          && trader.agreement_required
          && !trader.agreement_signed_at
        setState(needsAgreement ? 'agreement' : 'denied')
      })
    return () => { active = false }
  }, [traderUuid])

  if (state === 'loading') return null
  if (state === 'agreement') return <Navigate to={`/agreement/${traderUuid}`} replace />
  if (state === 'denied') return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />
  if (requiresDesktopInstall()) return <DesktopAdminInstallGate />
  return <Outlet />
}
