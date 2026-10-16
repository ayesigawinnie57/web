import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const PROMOS = [
  {
    eyebrow: 'Weekend event',
    title: 'Wemise Weekend',
    detail: 'Make the most of your weekend upgrades.',
    href: '/shop',
     image: '/Majo%20Gadgets%20Weekend%20Tech%20Sale.png',
    imageAlt: 'Smartphones and tablets for Wemise Weekend',
    accent: '#F97316',
  },
  {
    eyebrow: 'Customer favorites',
    title: 'Top Bought Products',
    detail: 'See products customers are buying most.',
    href: '/shop?top_bought=true',
     image: '/Majo%20Gadgets%20Top%20Sellers.png',
    imageAlt: 'Popular laptops and computing products',
    accent: '#0F766E',
  },
  {
    eyebrow: 'Limited-time offers',
    title: 'Deals of the Day',
    detail: 'Shop active offers before they are gone.',
    href: '/deals',
     image: '/Majo%20Gadgets%20Deal%20of%20the%20Day.png',
    imageAlt: 'Home appliances available in current deals',
    accent: '#B91C1C',
  },
]

export default function PromoBanners() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndex = useRef(0)
  const transitionTimer = useRef<number | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion) return

    const interval = window.setInterval(() => {
      const track = trackRef.current
      if (!track || transitionTimer.current !== null) return

      const nextIndex = (currentIndex.current + 1) % PROMOS.length
      track.style.transition = 'transform 550ms cubic-bezier(0.37,0,0.63,1)'
      track.style.transform = 'translateX(-50%)'
      transitionTimer.current = window.setTimeout(() => {
        currentIndex.current = nextIndex
        setIndex(nextIndex)
        track.style.transition = 'none'
        track.style.transform = 'translateX(0)'
        transitionTimer.current = null
      }, 560)
    }, 2000)

    return () => {
      window.clearInterval(interval)
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current)
        transitionTimer.current = null
      }
    }
  }, [paused, reducedMotion])

  const selectSlide = (slideIndex: number) => {
    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current)
      transitionTimer.current = null
      if (trackRef.current) {
        trackRef.current.style.transition = 'none'
        trackRef.current.style.transform = 'translateX(0)'
      }
    }
    currentIndex.current = slideIndex
    setIndex(slideIndex)
  }

  const active = PROMOS[index]
  const next = PROMOS[(index + 1) % PROMOS.length]

  return (
    <section aria-label="Featured shopping collections" className="bg-[#F8FAFC] px-4 pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false) }}>
          <div className="promo-carousel__viewport">
            <div ref={trackRef} className="promo-carousel__track">
              {[active, next].map((promo, slideIndex) => (
                <Link
                  key={`${promo.title}-${index}-${slideIndex}`}
                  to={promo.href}
                  aria-hidden={slideIndex === 1}
                  tabIndex={slideIndex === 1 ? -1 : undefined}
                  aria-label={`${promo.title}: ${promo.detail}`}
                  className="promo-carousel__slide"
                >
                  <img src={promo.image} alt={promo.imageAlt} loading={slideIndex === 0 ? 'eager' : 'lazy'} />
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-2" aria-label="Choose banner">
            {PROMOS.map((promo, dotIndex) => (
              <button key={promo.title} onClick={() => selectSlide(dotIndex)} aria-label={`Show ${promo.title}`} aria-current={index === dotIndex ? 'true' : undefined} className={`h-1.5 rounded-full transition-all ${index === dotIndex ? 'w-7 bg-[#071A2B]' : 'w-2 bg-[#CBD5E1]'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}