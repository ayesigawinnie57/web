import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { tradersApi } from '../lib/api'
import { requiresDesktopInstall } from '../lib/pwaInstall'
import DesktopAdminInstallGate from '../components/DesktopAdminInstallGate'

export default function TraderGuard() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading')

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { setState('denied'); return }
    tradersApi.profile(traderUuid!)
      .then(() => setState('ok'))
      .catch(() => setState('denied'))
  }, [traderUuid])

  if (state === 'loading') return null
  if (state === 'denied') return <Navigate to="/login" replace />
  if (requiresDesktopInstall()) return <DesktopAdminInstallGate />
  return <Outlet />
}
