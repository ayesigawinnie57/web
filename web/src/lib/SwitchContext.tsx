import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Portal = 'admin' | 'trader' | 'store'

interface SwitchState {
  from: Portal
  to: Portal
  toPath: string
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
    setCurrent({ from, to, toPath })
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
