import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LOGO } from '../lib/api'

export type Portal = 'admin' | 'trader' | 'store'

const META: Record<Portal, { label: string; sub: string; color: string; bgFrom: string; bgTo: string; pages: string[] }> = {
  admin: {
    label: 'Admin Panel', sub: 'Management & Analytics', color: '#F97316',
    bgFrom: '#0f1f30', bgTo: '#071A2B',
    pages: ['Dashboard', 'Products', 'Orders', 'Users', 'Payments', 'Accounting', 'Inventory', 'Settings'],
  },
  trader: {
    label: 'Trader Portal', sub: 'Your Business Dashboard', color: '#22C55E',
    bgFrom: '#071A2B', bgTo: '#061a10',
    pages: ['Dashboard', 'Products', 'Orders', 'Sales', 'Accounting', 'Inventory', 'Flash Sales', 'Settings'],
  },
  store: {
    label: 'Majo Store', sub: 'Shopping Experience', color: '#6366f1',
    bgFrom: '#0d0d1f', bgTo: '#071A2B',
    pages: ['Home', 'Shop', 'Categories', 'Deals', 'Cart', 'Wishlist', 'Orders', 'Account'],
  },
}

// Total duration and timing
const TOTAL      = 6000
const TICK_START = 600   // when first page ticks
const TICK_END   = 4400  // when last page ticks
const REVEAL_AT  = 4800
const EXIT_AT    = 5200

interface Props { from: Portal; to: Portal; onDone: () => void }

export default function SwitchTransition({ from, to, onDone }: Props) {
  const [phase, setPhase]         = useState<'enter' | 'loading' | 'exit'>('enter')
  const [progress, setProgress]   = useState(0)
  const [ticked, setTicked]       = useState<number>(-1)   // index of last ticked page
  const [revealing, setRevealing] = useState(false)

  const fromMeta = META[from]
  const toMeta   = META[to]
  const pages    = toMeta.pages

  // Progress bar
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

  // Phase + page ticking timeline
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // Switch to loading phase
    timers.push(setTimeout(() => setPhase('loading'), 600))

    // Tick each page evenly between TICK_START and TICK_END
    const interval = (TICK_END - TICK_START) / pages.length
    pages.forEach((_, i) => {
      timers.push(setTimeout(() => setTicked(i), TICK_START + i * interval))
    })

    timers.push(setTimeout(() => setRevealing(true), REVEAL_AT))
    timers.push(setTimeout(() => setPhase('exit'),   EXIT_AT))
    timers.push(setTimeout(() => onDone(),           TOTAL))

    return () => timers.forEach(clearTimeout)
  }, [onDone, pages.length])

  return createPortal(
    <>
      <style>{`
        @keyframes st-ring {
          0%   { transform: scale(0);   opacity: 0.7; }
          30%  { opacity: 0.45; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes st-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes st-check {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Page-reveal layer */}
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

        {/* Rings — expand from center like ripples */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2, 3, 4, 6].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: '140vmax', height: '140vmax',
              borderRadius: '50%',
              border: `1.5px solid ${toMeta.color}`,
              animation: `st-ring 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
        </div>

        {/* Glow */}
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          background: `radial-gradient(circle, ${toMeta.color}12 0%, transparent 70%)`,
          filter: 'blur(70px)', pointerEvents: 'none',
        }} />

        {/* Content card */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340, padding: '0 24px' }}>

          {/* Logo */}
          <img src={LOGO} alt="Majo Gadgets" style={{ height: 44, width: 'auto', objectFit: 'contain', marginBottom: 28, opacity: 0.95 }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: toMeta.color, marginBottom: 6 }}>
              {phase === 'enter' ? 'Leaving' : 'Preparing'}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{toMeta.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{toMeta.sub}</p>
          </div>

          {/* Pages checklist */}
          <div style={{
            width: '100%',
            overflow: 'hidden',
            marginBottom: 24,
            position: 'relative',
          }}>
            {/* Top fade mask */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 1,
              background: 'linear-gradient(to bottom, rgba(15,20,30,0.85), transparent)',
              pointerEvents: 'none',
            }} />
            {/* Bottom fade mask */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 1,
              background: 'linear-gradient(to top, rgba(15,20,30,0.85), transparent)',
              pointerEvents: 'none',
            }} />
            {/* Scrolling list — shifts up by one row height (34px) per ticked page */}
            <div style={{
              transform: `translateY(${-Math.max(0, ticked - 1) * 34}px)`,
              transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
              padding: '6px 0',
            }}>
            {pages.map((page, i) => {
              const done = ticked >= i
              return (
                <div
                  key={page}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '7px 16px', height: 34,
                    opacity: phase === 'loading' ? (done ? 1 : 0.35) : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? toMeta.color : 'rgba(255,255,255,0.1)',
                    border: done ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    transition: 'background 0.25s ease',
                  }}>
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                        style={{ animation: 'st-check 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13, fontWeight: done ? 600 : 400, flex: 1,
                    color: done ? '#fff' : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.25s ease',
                  }}>{page}</p>
                  {done && (
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: toMeta.color, opacity: 0.7 }}>Ready</p>
                  )}
                </div>
              )
            })}
            </div>
          </div>

          {/* Progress bar with from/to labels */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>From</p>
                <p style={{ fontSize: 11, fontWeight: 800, color: fromMeta.color }}>{fromMeta.label}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>To</p>
                <p style={{ fontSize: 11, fontWeight: 800, color: toMeta.color }}>{toMeta.label}</p>
              </div>
            </div>
            <div style={{ width: '100%', height: 3, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${fromMeta.color}, ${toMeta.color})`,
                boxShadow: `0 0 12px ${toMeta.color}aa`,
                transition: 'none',
              }} />
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  )
}
