import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { sessionApi } from './api'

export type Portal = 'admin' | 'trader' | 'store'

interface SwitchState {
  from: Portal
  to: Portal
  toPath: string
  userName: string
  accountName: string
}

interface Ctx {
  startSwitch: (from: Portal, to: Portal, toPath: string) => void
  endSwitch: () => void
  current: SwitchState | null
}

const SwitchContext = createContext<Ctx | null>(null)

export function SwitchProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SwitchState | null>(null)

  const startSwitch = useCallback((from: Portal, to: Portal, toPath: string) => {
    let userName = 'User'
    try {
      const u = JSON.parse(localStorage.getItem('majo_user') ?? '{}')
      if (u?.name) userName = u.name
    } catch { /* ignore */ }

    if (from === 'admin') {
      setCurrent({ from, to, toPath, userName, accountName: 'Admin Panel' })
    } else if (from === 'trader') {
      setCurrent({ from, to, toPath, userName, accountName: 'Trader Portal' })
      sessionApi.trader().then(t => {
        setCurrent(prev => prev ? { ...prev, accountName: t?.business_name ?? prev.accountName } : prev)
      }).catch(() => {})
    } else {
      setCurrent({ from, to, toPath, userName, accountName: userName })
    }
  }, [])

  const endSwitch = useCallback(() => setCurrent(null), [])

  return (
    <SwitchContext.Provider value={{ startSwitch, endSwitch, current }}>
      {children}
    </SwitchContext.Provider>
  )
}

export function useSwitchPortal() {
  const ctx = useContext(SwitchContext)
  if (!ctx) throw new Error('useSwitchPortal must be used within SwitchProvider')
  return ctx
}
