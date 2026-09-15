import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { authApi, BASE_URL } from '../lib/api'

type State = 'loading' | 'allowed' | 'denied'

export const ASSIGNED_PAGES_KEY = 'majo_assigned_pages'

export default function AdminGuard() {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      setState('denied')
      return
    }

    authApi.profile()
      .then(async ({ data }) => {
        if (!data.is_staff) { setState('denied'); return }

        // Fetch assigned_pages for this staff user
        try {
          const token = localStorage.getItem('access_token')
          const res = await fetch(`${BASE_URL}/api/auth/admin/users/`, {
            headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          })
          const users: { id: number; email: string; assigned_pages: string[] }[] = await res.json()
          const me = users.find(u => u.email === data.email)
          const pages = me?.assigned_pages ?? []
          localStorage.setItem(ASSIGNED_PAGES_KEY, JSON.stringify(pages))
        } catch {
          localStorage.setItem(ASSIGNED_PAGES_KEY, JSON.stringify([]))
        }

        setState('allowed')
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setState('denied')
      })
  }, [])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#071A2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return state === 'allowed' ? <Outlet /> : <Navigate to="/login" replace />
}
