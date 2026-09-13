import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000'
const DIST = 'dist'

async function fetchAllProducts() {
  const products = []
  let url = `${API_URL}/api/products/`
  while (url) {
    const res = await fetch(url)
    const data = await res.json()
    const results = Array.isArray(data) ? data : (data.results ?? [])
    products.push(...results)
    url = data.next ?? null
  }
  return products
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8')

const products = await fetchAllProducts()
console.log(`Pre-rendering ${products.length} product pages...`)

for (const p of products) {
  const price = Number(p.price)
  const desc = p.short_description?.trim() || `Buy ${p.name} at UGX ${price.toLocaleString()} on Majo Gadgets.`
  const image = p.image || 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789111152/Majo_Gadgets_logo_an2hbc.png'
  const url = `https://www.majogadgets.com/shop/${p.slug}`
  const title = `${p.name} – Majo Gadgets`

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: desc,
    image: p.image ? [p.image] : [],
    url,
    sku: String(p.id),
    brand: { '@type': 'Brand', name: 'Majo Gadgets' },
    category: p.category?.name ?? '',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'UGX',
      price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
      seller: { '@type': 'Organization', name: 'Majo Gadgets' },
    },
  })

  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${url}" />`
    )
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${image}" />`)
    .replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`)

  const dir = join(DIST, 'shop', p.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

console.log('Pre-rendering complete.')
