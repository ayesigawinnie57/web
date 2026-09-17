import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import { BASE_URL } from '../lib/api'

const KEY = 'majo_cookie_consent'

type ConsentState = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const defaultConsent: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [preferences, setPreferences] = useState<ConsentState>(defaultConsent)

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ConsentState
        setPreferences(parsed)
      } catch {
        localStorage.removeItem(KEY)
      }
      return
    }

    fetch(`${BASE_URL}/api/settings/cookie-consent/`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) {
          setVisible(true)
          return
        }
        const savedState = { necessary: !!data.necessary, analytics: !!data.analytics, marketing: !!data.marketing }
        setPreferences(savedState)
        localStorage.setItem(KEY, JSON.stringify(savedState))
        if (savedState.analytics || savedState.marketing) {
          setVisible(false)
        } else {
          setVisible(true)
        }
      })
      .catch(() => setVisible(true))
  }, [])

  const persistConsent = async (next: ConsentState) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    try {
      await fetch(`${BASE_URL}/api/settings/cookie-consent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch {
      // Gracefully ignore backend failures so the site still works without a server connection.
    }
  }

  const saveConsent = async (next: ConsentState) => {
    setPreferences(next)
    await persistConsent(next)
    setVisible(false)
    setShowCustomize(false)
  }

  const acceptAll = () => void saveConsent({ necessary: true, analytics: true, marketing: true })
  const acceptRequiredOnly = () => void saveConsent({ necessary: true, analytics: false, marketing: false })

  const togglePreference = (key: 'analytics' | 'marketing') => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const savePreferences = () => void saveConsent({ ...preferences, necessary: true })

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 9990,
      background: '#F97316',
      boxShadow: '0 -4px 24px rgba(249,115,22,0.35)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '39px 24px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <Cookie size={18} color="#fff" style={{ flexShrink: 0 }} />

        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1, minWidth: 220, margin: 0 }}>
          We use cookies to improve your experience, remember your cart, and keep you signed in.{' '}
          <Link to="/cookies" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700 }}>
            Learn more
          </Link>
        </p>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setShowCustomize(v => !v)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'rgba(255,255,255,0.18)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Manage
          </button>
          <button
            onClick={acceptRequiredOnly}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'rgba(255,255,255,0.16)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Necessary only
          </button>
          <button
            onClick={acceptAll}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: '#fff', color: '#F97316',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Accept all
          </button>
        </div>

        <button onClick={acceptRequiredOnly} style={{ flexShrink: 0, padding: 4, opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none' }} aria-label="Close cookie banner">
          <X size={16} color="#fff" />
        </button>
      </div>

      {showCustomize && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 16, padding: 20, color: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Cookie preferences</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span>Essential cookies</span>
                <input type="checkbox" checked readOnly />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span>Analytics cookies</span>
                <input type="checkbox" checked={preferences.analytics} onChange={() => togglePreference('analytics')} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span>Marketing cookies</span>
                <input type="checkbox" checked={preferences.marketing} onChange={() => togglePreference('marketing')} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button onClick={acceptRequiredOnly} style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}>
                  Leave others off
                </button>
                <button onClick={savePreferences} style={{ background: '#fff', color: '#F97316', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}>
                  Save preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
