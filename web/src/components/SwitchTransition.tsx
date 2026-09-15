import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LOGO } from '../lib/api'

export type Portal = 'admin' | 'trader' | 'store'

const META: Record<Portal, { label: string; sub: string; color: string; bgFrom: string; bgTo: string }> = {
  admin:  { label: 'Admin Panel',   sub: 'Management & Analytics',  color: '#F97316', bgFrom: '#0f1f30', bgTo: '#071A2B' },
  trader: { label: 'Trader Portal', sub: 'Your Business Dashboard', color: '#22C55E', bgFrom: '#071A2B', bgTo: '#061a10' },
  store:  { label: 'Majo Store',    sub: 'Shopping Experience',     color: '#6366f1', bgFrom: '#0d0d1f', bgTo: '#071A2B' },
}

const TOTAL     = 6000
const SWITCH_AT = 1200
const REVEAL_AT = 4800  // new page starts fading in
const EXIT_AT   = 5200  // overlay starts fading out

interface Props {
  from: Portal
  to: Portal
  onDone: () => void
}

export default function SwitchTransition({ from, to, onDone }: Props) {
  const [phase, setPhase]       = useState<'enter' | 'switch' | 'exit'>('enter')
  const [progress, setProgress] = useState(0)
  const [revealing, setRevealing] = useState(false)

  const fromMeta = META[from]
  const toMeta   = META[to]

  useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      const p = Math.min((Date.now() - start) / TOTAL, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('switch'),    SWITCH_AT)
    const t2 = setTimeout(() => setRevealing(true),    REVEAL_AT)
    const t3 = setTimeout(() => setPhase('exit'),      EXIT_AT)
    const t4 = setTimeout(() => onDone(),              TOTAL)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onDone])

  return createPortal(
    <>
      <style>{`
        @keyframes st-ring {
          0%   { transform: scale(0.5); opacity: 0.22; }
          70%  { opacity: 0.07; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes st-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes st-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page-reveal layer — solid bg that fades out to show new page underneath */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: toMeta.bgTo,
        opacity: revealing ? 0 : 1,
        transition: revealing ? 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)' : 'none',
        pointerEvents: 'none',
      }} />

      {/* Main overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${toMeta.bgFrom}, ${toMeta.bgTo})`,
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.8s cubic-bezier(0.4,0,1,1)' : 'opacity 0.15s ease-out',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}>

        {/* Rings */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width:  200 + i * 170,
              height: 200 + i * 170,
              borderRadius: '50%',
              border: `1px solid ${toMeta.color}`,
              animation: `st-ring ${3.2 + i * 0.7}s ease-out infinite`,
              animationDelay: `${i * 0.55}s`,
            }} />
          ))}
        </div>

        {/* Glow */}
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          background: `radial-gradient(circle, ${toMeta.color}15 0%, transparent 70%)`,
          filter: 'blur(70px)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <img
          src={LOGO}
          alt="Majo Gadgets"
          style={{
            position: 'relative', zIndex: 1,
            height: 52, width: 'auto', objectFit: 'contain',
            marginBottom: 52,
            animation: 'st-fadein 0.6s ease-out both',
          }}
        />

        {/* Labels */}
        <div style={{ position: 'relative', zIndex: 1, minHeight: 108, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* FROM */}
          <div style={{
            position: 'absolute',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity:   phase === 'enter' ? 1 : 0,
            transform: phase === 'enter' ? 'translateY(0)' : 'translateY(-52px)',
            transition: 'opacity 0.65s ease-in-out, transform 0.65s ease-in-out',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
              Leaving
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.4)', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {fromMeta.label}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>
              {fromMeta.sub}
            </p>
          </div>

          {/* TO */}
          <div style={{
            position: 'absolute',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity:   phase === 'enter' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(52px)' : 'translateY(0)',
            transition: 'opacity 0.65s ease-in-out, transform 0.65s ease-in-out',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: toMeta.color, marginBottom: 10 }}>
              Switching to
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {toMeta.label}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 10 }}>
              {toMeta.sub}
            </p>
          </div>
        </div>

        {/* Progress bar with from/to labels on each end */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 68, width: 300 }}>
          {/* End labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>From</p>
              <p style={{ fontSize: 12, fontWeight: 800, color: fromMeta.color, whiteSpace: 'nowrap' }}>{fromMeta.label}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>To</p>
              <p style={{ fontSize: 12, fontWeight: 800, color: toMeta.color, whiteSpace: 'nowrap' }}>{toMeta.label}</p>
            </div>
          </div>
          {/* Bar */}
          <div style={{ width: '100%', height: 3, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${fromMeta.color}, ${toMeta.color})`,
              boxShadow: `0 0 14px ${toMeta.color}bb`,
              transition: 'none',
            }} />
          </div>
        </div>

        {/* Dots */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 22, marginTop: 22 }}>
          {(['admin', 'trader', 'store'] as Portal[]).map(p => {
            const isTo   = p === to
            const isFrom = p === from
            return (
              <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width:  isTo ? 13 : 7,
                  height: isTo ? 13 : 7,
                  borderRadius: '50%',
                  background: isTo ? toMeta.color : isFrom ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
                  boxShadow: isTo ? `0 0 12px ${toMeta.color}` : 'none',
                  transition: 'all 0.5s ease',
                  animation: isTo ? 'st-pulse 1.8s ease-in-out infinite' : 'none',
                }} />
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: isTo ? toMeta.color : 'rgba(255,255,255,0.16)',
                  transition: 'color 0.5s ease',
                }}>
                  {p}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </>,
    document.body
  )
}
