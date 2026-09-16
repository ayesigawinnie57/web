import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Tv, WashingMachine, Shirt, Monitor, Sparkles, ShoppingBag } from 'lucide-react'

const SLIDES = [
  {
    slug: 'phones-tablets',
    label: 'Phones & Tablets',
    icon: Smartphone,
    color: '#F97316', via: '#FB923C',
    title: 'Latest Smartphones & Tablets',
    subtitle: 'Stay connected with cutting-edge devices',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152115/phone_tablets.png',
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    icon: Tv,
    color: '#1E3A8A', via: '#2563EB',
    title: 'Smart TVs & Home Electronics',
    subtitle: 'Upgrade your entertainment experience',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/eletronics.png',
  },
  {
    slug: 'appliances',
    label: 'Appliances',
    icon: WashingMachine,
    color: '#15803D', via: '#16A34A',
    title: 'Home Appliances',
    subtitle: 'Make everyday living easier & smarter',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/appl.png',
  },
  {
    slug: 'fashion',
    label: 'Fashion',
    icon: Shirt,
    color: '#7C3AED', via: '#8B5CF6',
    title: 'Trending Fashion & Style',
    subtitle: 'Dress to impress every single day',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152177/Fashion.png',
  },
  {
    slug: 'computing',
    label: 'Computing',
    icon: Monitor,
    color: '#DC2626', via: '#EF4444',
    title: 'Laptops & Computing',
    subtitle: 'Power through work and play',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/Computing.png',
  },
  {
    slug: 'health-beauty',
    label: 'Health & Beauty',
    icon: Sparkles,
    color: '#0369A1', via: '#0EA5E9',
    title: 'Health & Beauty Essentials',
    subtitle: 'Look and feel your absolute best',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152116/pppp.png',
  },
  {
    slug: 'baby-products',
    label: 'Baby Products',
    icon: ShoppingBag,
    color: '#B45309', via: '#D97706',
    title: 'Baby Products',
    subtitle: 'Everything your little one needs',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152162/babies.png',
  },
]

export default function Hero() {
  const [index, setIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => advance(), 4000)
    return () => clearInterval(id)
  }, [animating, paused])

  const advance = (to?: number) => {
    if (animating || !trackRef.current) return
    setAnimating(true)
    trackRef.current.style.transition = 'transform 550ms cubic-bezier(0.37,0,0.63,1)'
    trackRef.current.style.transform = 'translateX(-50%)'
    setTimeout(() => {
      setIndex(i => to !== undefined ? to : (i + 1) % SLIDES.length)
      if (trackRef.current) {
        trackRef.current.style.transition = 'none'
        trackRef.current.style.transform = 'translateX(0)'
      }
      setAnimating(false)
    }, 560)
  }

  const goTo = (i: number) => { if (i !== index) advance(i) }

  const cur = SLIDES[index]
  const next = SLIDES[(index + 1) % SLIDES.length]

  const renderSlide = (slide: typeof SLIDES[0]) => {
    const { color, via, label, slug, icon: Icon, title, subtitle, image } = slide
    return (
      <div
        className="relative w-1/2 shrink-0 h-[260px] md:h-[280px] rounded-2xl overflow-hidden select-none"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${via} 60%, ${color}cc 100%)` }}
      >
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute -bottom-10 right-16 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* left: text */}
        <div className="absolute inset-0 flex flex-col justify-between pt-3 pb-4 md:pt-7 md:pb-7 pl-4 md:pl-8 pr-[52%] md:pr-[46%] z-10">
          <span className="inline-flex items-center gap-1 bg-white/25 text-white text-[9px] md:text-[12px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full w-fit">
            <Icon size={9} strokeWidth={2.5} />
            {label}
          </span>
          <p className="text-white text-[22px] md:text-[42px] font-black leading-[1.15]">{title}</p>
          <p className="text-white/80 text-[13px] md:text-[15px] font-normal leading-snug">{subtitle}</p>
          <Link
            to={`/shop?category=${slug}`}
            className="self-start bg-white text-[10px] md:text-[14px] font-bold px-3 py-1.5 md:px-5 md:py-2.5 rounded-full shadow-md flex items-center gap-1"
            style={{ color }}
          >
            Shop {label} <span>→</span>
          </Link>
        </div>

        {/* right: category image */}
        <div className="absolute right-0 top-0 bottom-0 w-[50%] md:w-[46%]">
          <img
            src={image}
            alt={label}
            className="w-full h-full object-contain object-center scale-110 md:object-bottom md:scale-100"
          />
        </div>


      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="relative w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="w-full overflow-hidden rounded-2xl">
          <div ref={trackRef} className="flex w-[200%]" style={{ transform: 'translateX(0)' }}>
            {renderSlide(cur)}
            {renderSlide(next)}
          </div>
        </div>
          {/* prev button */}
          <button
            onClick={() => goTo((index - 1 + SLIDES.length) % SLIDES.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          {/* next button */}
          <button
            onClick={() => goTo((index + 1) % SLIDES.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* dots */}
        <div className="flex gap-1.5 mt-3">
          {SLIDES.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => goTo(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? s.color : '#CBD5E1' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
