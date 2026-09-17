import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi, tokenStore, type AuthUser } from './auth'

type AuthContextType = {
  user: AuthUser | null
  ready: boolean
  reload: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const token = await tokenStore.getAccess()
    if (!token) { setUser(null); setReady(true); return }
    try {
      const { data } = await authApi.profile(token)
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const logout = useCallback(async () => {
    await tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, reload: load, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
