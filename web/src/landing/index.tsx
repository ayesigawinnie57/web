import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import Hero from './Hero'
import Products from './Products'
import FlashDeals from './FlashDeals'
import Recommended from './Recommended'
import Footer from './Footer'
import { productsApi, toProduct, type Product } from '../lib/api'

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    productsApi.list().then(({ data }) => {
      const raw: any[] = Array.isArray(data) ? data : (data as any).results ?? []
      setProducts(raw.map(toProduct))
    }).catch(() => undefined)
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <div className="pt-14 lg:pt-16 pb-16 lg:pb-0">
        <Hero />
        <Products products={products} />
        <FlashDeals products={[]} />
        <Recommended products={products} featuredIds={new Set(products.slice(0, 12).map(p => p.id))} />
      </div>
      <Footer />
    </div>
  )
}
