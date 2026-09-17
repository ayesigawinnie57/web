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

const TICK_START  = 800
const TICK_END    = 7200
const EXIT_AT     = 7800
const DONE_AT     = 9200
const BACKSTOP_AT = DONE_AT + 200

interface Props { from: Portal; to: Portal; userName: string; accountName: string; onDone: () => void }

export default function SwitchTransition({ from, to, userName, accountName, onDone }: Props) {
  const [phase, setPhase]   = useState<'enter' | 'loading' | 'exit'>('enter')
  const [progress, setProgress] = useState(0)
  const [ticked, setTicked] = useState<number>(-1)
  const [showBackstop, setShowBackstop] = useState(true)

  const fromMeta = META[from]
  const toMeta   = META[to]
  const pages    = toMeta.pages

  useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      const p = Math.min((Date.now() - start) / EXIT_AT, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase('loading'), 800))
    const interval = (TICK_END - TICK_START) / pages.length
    pages.forEach((_, i) => timers.push(setTimeout(() => setTicked(i), TICK_START + i * interval)))
    timers.push(setTimeout(() => setPhase('exit'), EXIT_AT))
    timers.push(setTimeout(() => onDone(), DONE_AT))
    timers.push(setTimeout(() => setShowBackstop(false), BACKSTOP_AT))
    return () => timers.forEach(clearTimeout)
  }, [onDone, pages.length])

  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return createPortal(
    <>
      <style>{`
        @keyframes st-spin-cw  { to { transform: rotate(360deg); } }
        @keyframes st-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes st-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.15; }
          50%      { transform: scale(1.35); opacity: 0.28; }
        }
        @keyframes st-float {
          0%,100% { transform: translateY(0px)   rotate(var(--r)); }
          50%     { transform: translateY(-18px) rotate(var(--r)); }
        }
        @keyframes st-check {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(0deg); opacity: 1; }
          100% { transform: scale(1)   rotate(0deg); opacity: 1; }
        }
        @keyframes st-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes st-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes st-dot-blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1); }
        }
        @keyframes st-slide-in {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {showBackstop && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: toMeta.bgTo, pointerEvents: 'none' }} />
      )}

      {/* Full-screen overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${toMeta.bgFrom} 0%, ${toMeta.bgTo} 100%)`,
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.8s cubic-bezier(0.4,0,1,1)' : 'none',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}>

        {/* ── Background art ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 900, height: 900, marginLeft: -450, marginTop: -450,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${toMeta.color}1a 0%, ${toMeta.color}06 45%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: 'st-breathe 4s ease-in-out infinite',
          }} />
          {([
            { size: 420,  border: `1px solid ${toMeta.color}28`, dur: '18s', dir: 'st-spin-cw'  },
            { size: 640,  border: `1px solid ${toMeta.color}18`, dur: '28s', dir: 'st-spin-ccw' },
            { size: 860,  border: `1px solid ${toMeta.color}10`, dur: '38s', dir: 'st-spin-cw'  },
            { size: 1100, border: `1px solid ${toMeta.color}08`, dur: '50s', dir: 'st-spin-ccw' },
          ] as const).map(({ size, border, dur, dir }, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2,
              borderRadius: '50%', border,
              animation: `${dir} ${dur} linear infinite`,
            }}>
              <div style={{
                position: 'absolute', top: -1, left: '20%', width: '30%', height: 2,
                background: `linear-gradient(90deg, transparent, ${toMeta.color}80, transparent)`,
                borderRadius: 99,
              }} />
            </div>
          ))}
          {([
            { w: 200, top: '10%', left: '5%',  r: '-28deg', delay: '0s',   dur: '6s'   },
            { w: 140, top: '20%', left: '80%', r: '18deg',  delay: '1.2s', dur: '7s'   },
            { w: 260, top: '70%', left: '4%',  r: '-15deg', delay: '0.6s', dur: '8s'   },
            { w: 100, top: '78%', left: '84%', r: '32deg',  delay: '2s',   dur: '5.5s' },
            { w: 180, top: '48%', left: '90%', r: '-22deg', delay: '0.3s', dur: '7.5s' },
            { w: 160, top: '90%', left: '42%', r: '12deg',  delay: '1.8s', dur: '6.5s' },
          ] as const).map(({ w, top, left, r, delay, dur }, i) => (
            <div key={i} style={{
              position: 'absolute', top, left, width: w, height: 1,
              background: `linear-gradient(90deg, transparent, ${toMeta.color}45, transparent)`,
              borderRadius: 99,
              // @ts-ignore
              '--r': r,
              animation: `st-float ${dur} ease-in-out infinite`,
              animationDelay: delay,
              transform: `rotate(${r})`,
            }} />
          ))}
        </div>

        {/* ── Top bar ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 40px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <img src={LOGO} alt="Majo Gadgets" style={{ height: 38, width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: toMeta.color, boxShadow: `0 0 8px ${toMeta.color}` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
              {phase === 'enter' ? 'Verifying session…' : phase === 'loading' ? 'Loading workspace…' : 'Ready'}
            </span>
            {phase === 'loading' && (
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 3, height: 3, borderRadius: '50%', background: toMeta.color,
                    animation: 'st-dot-blink 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main body: two columns ── */}
        <div style={{
          position: 'relative', zIndex: 1, flex: 1,
          display: 'flex', alignItems: 'stretch',
          padding: '0 40px 40px',
          gap: 32,
          minHeight: 0,
        }}>

          {/* LEFT — checklist (was right) */}
          <div style={{
            flex: '0 0 280px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            paddingTop: 40, minWidth: 0,
            animation: 'st-fade-up 0.5s 0.15s ease both',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              Initializing modules
            </p>

            <div style={{ position: 'relative', flex: 1, overflow: 'hidden', maxHeight: 400 }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 32, zIndex: 1,
                background: `linear-gradient(to bottom, ${toMeta.bgTo}ee, transparent)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, zIndex: 1,
                background: `linear-gradient(to top, ${toMeta.bgTo}ee, transparent)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                transform: `translateY(${-Math.max(0, ticked - 2) * 52}px)`,
                transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                padding: '8px 0',
              }}>
                {pages.map((page, i) => {
                  const done = ticked >= i
                  return (
                    <div key={page} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '12px 16px', height: 52, borderRadius: 12,
                      marginBottom: 4,
                      background: done ? `${toMeta.color}0d` : 'transparent',
                      border: done ? `1px solid ${toMeta.color}25` : '1px solid transparent',
                      opacity: phase === 'loading' ? (done ? 1 : 0.3) : 0,
                      transition: 'opacity 0.3s ease, background 0.3s ease, border-color 0.3s ease',
                      animation: done ? 'st-slide-in 0.3s ease both' : 'none',
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? toMeta.color : 'rgba(255,255,255,0.08)',
                        border: done ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        transition: 'background 0.25s ease',
                      }}>
                        {done && (
                          <svg width="12" height="12" viewBox="0 0 10 10" fill="none"
                            style={{ animation: 'st-check 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <p style={{
                        fontSize: 15, fontWeight: done ? 700 : 400, flex: 1,
                        color: done ? '#fff' : 'rgba(255,255,255,0.3)',
                        transition: 'color 0.25s ease',
                      }}>{page}</p>
                      {done && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: toMeta.color, background: `${toMeta.color}18`,
                          border: `1px solid ${toMeta.color}35`,
                          padding: '3px 10px', borderRadius: 99,
                        }}>Ready</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{
            width: 1, alignSelf: 'stretch', marginTop: 40,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)',
            flexShrink: 0,
          }} />

          {/* RIGHT — identity + switch info (was left) */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: 24, paddingTop: 40,
            animation: 'st-fade-up 0.5s ease both',
          }}>

            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 20, borderRadius: 99, background: toMeta.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{accountName}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: toMeta.color, background: `${toMeta.color}18`,
                border: `1px solid ${toMeta.color}40`, padding: '3px 10px', borderRadius: 99,
              }}>Authenticated</span>
            </div>

            {/* Big heading */}
            <div>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontWeight: 500 }}>
                Switching to
              </p>
              <p style={{ fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                {toMeta.label}
              </p>
              <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{toMeta.sub}</p>
            </div>

            {/* From → To row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                padding: '10px 18px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${fromMeta.color}35`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>From</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: fromMeta.color }}>{fromMeta.label}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 36, height: 1, background: `linear-gradient(90deg, ${fromMeta.color}70, ${toMeta.color}70)` }} />
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke={toMeta.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div style={{
                padding: '10px 18px', borderRadius: 12,
                background: `${toMeta.color}14`,
                border: `1px solid ${toMeta.color}55`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>To</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: toMeta.color }}>{toMeta.label}</p>
              </div>
            </div>

            {/* User identity card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '20px 24px', borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: -5, borderRadius: '50%',
                  border: `2px solid ${toMeta.color}`,
                  animation: 'st-pulse-ring 1.8s ease-out infinite',
                }} />
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${fromMeta.color}70, ${toMeta.color}70)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: '#fff',
                  border: `2px solid ${toMeta.color}90`,
                  letterSpacing: '0.05em',
                }}>
                  {initials}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: toMeta.color, boxShadow: `0 0 8px ${toMeta.color}` }} />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    {phase === 'enter' ? 'Verifying session…' : phase === 'loading' ? 'Loading workspace…' : 'Ready to go'}
                  </p>
                </div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: phase === 'exit' ? '#22C55E' : toMeta.color, opacity: 0.85,
              }}>
                {phase === 'exit' ? '✓ Done' : 'Active'}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Progress</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: toMeta.color }}>{Math.round(progress * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${progress * 100}%`,
                  background: `linear-gradient(90deg, ${fromMeta.color}, ${toMeta.color})`,
                  boxShadow: `0 0 14px ${toMeta.color}aa`,
                  transition: 'none',
                }} />
              </div>
            </div>
          </div>


        </div>
      </div>
    </>,
    document.body
  )
}
