import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { authApi } from '../lib/api'
import { requiresDesktopInstall } from '../lib/pwaInstall'
import DesktopAdminInstallGate from './DesktopAdminInstallGate'

type AccountState = 'checking' | 'admin' | 'other'

function tokenIdentifiesAdmin(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1])).is_staff === true
  } catch {
    return false
  }
}

function getInitialState(): AccountState {
  const token = localStorage.getItem('access_token')
  if (!token) return 'other'
  try {
    if (JSON.parse(localStorage.getItem('majo_user') ?? 'null')?.isAdmin === true) return 'admin'
  } catch {
    return tokenIdentifiesAdmin(token) ? 'admin' : 'checking'
  }
  return tokenIdentifiesAdmin(token) ? 'admin' : 'checking'
}

export default function DesktopAdminEnforcer({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [accountState, setAccountState] = useState<AccountState>(getInitialState)
  const [authVersion, setAuthVersion] = useState(0)
  const checkedToken = useRef<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      checkedToken.current = null
      requestId.current += 1
      setAccountState('other')
      return
    }
    if (checkedToken.current === token) return

    checkedToken.current = token
    const currentRequest = ++requestId.current
    setAccountState('checking')
    authApi.profile()
      .then(({ data }) => {
        if (requestId.current === currentRequest && localStorage.getItem('access_token') === token) {
          setAccountState(data.is_staff ? 'admin' : 'other')
        }
      })
      .catch(() => {
        if (requestId.current === currentRequest) {
          setAccountState(tokenIdentifiesAdmin(token) ? 'admin' : 'other')
        }
      })
  }, [authVersion, pathname])

  useEffect(() => {
    const refreshOnAuthChange = () => {
      checkedToken.current = null
      setAccountState(getInitialState())
      setAuthVersion(version => version + 1)
    }
    window.addEventListener('majo-auth-changed', refreshOnAuthChange)
    window.addEventListener('storage', refreshOnAuthChange)
    return () => {
      window.removeEventListener('majo-auth-changed', refreshOnAuthChange)
      window.removeEventListener('storage', refreshOnAuthChange)
    }
  }, [])

  if (accountState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#071A2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (accountState === 'admin' && requiresDesktopInstall()) {
    return <DesktopAdminInstallGate />
  }

  return children
}