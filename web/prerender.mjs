import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000'
const DIST = 'dist'

async function fetchAllProducts() {
  const products = []
  let url = `${API_URL}/api/products/`
  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Could not load products for prerendering (${res.status}).`)
    const data = await res.json()
    const results = Array.isArray(data) ? data : (data.results ?? [])
    products.push(...results)
    url = data.next ?? null
  }
  return products
}

async function fetchAllCategories() {
  const categories = []
  let url = `${API_URL}/api/products/categories/`
  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Could not load categories for prerendering (${res.status}).`)
    const data = await res.json()
    categories.push(...(Array.isArray(data) ? data : (data.results ?? [])))
    url = data.next ?? null
  }
  return categories
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character])
const jsonLdScript = value => JSON.stringify(value).replace(/</g, '\\u003c')
const trimDescription = value => {
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= 160) return text
  const prefix = text.slice(0, 157)
  const lastSpace = prefix.lastIndexOf(' ')
  return `${prefix.slice(0, lastSpace > 120 ? lastSpace : prefix.length).trimEnd()}...`
}

const sourceTemplate = readFileSync(join(DIST, 'index.html'), 'utf8')
const template = sourceTemplate.replace(/<script id="homepage-structured-data"[^>]*>[\s\S]*?<\/script>\s*/i, '')

const staticPages = [
  {
    path: 'shop',
    title: 'Shop Quality Products Online | Majo Market',
    description: 'Shop quality products from trusted sellers on Majo Market. Explore electronics, fashion, home essentials, tools, accessories and more in Uganda.',
    robots: 'index, follow',
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    path: 'categories',
    title: 'Product Categories | Majo Market',
    description: 'Browse marketplace categories on Majo Market and discover products from trusted sellers across Uganda.',
    robots: 'index, follow',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: 'deals',
    title: 'Marketplace Deals & Flash Sales | Majo Market',
    description: 'Discover marketplace deals and limited-time offers from trusted sellers on Majo Market while available stock lasts.',
    robots: 'index, follow',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: 'about',
    title: 'About Majo Market | Online Marketplace in Uganda',
    description: 'Learn how Majo Market connects shoppers with quality products and trusted sellers across Uganda.',
    robots: 'index, follow',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: 'help-center',
    title: 'Help Center | Majo Market',
    description: 'Find answers about Majo Market orders, delivery, returns, payments, accounts, and customer support.',
    robots: 'index, follow',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: 'contact',
    title: 'Contact Majo Market Support',
    description: 'Contact Majo Market for help with orders, delivery, returns, payments, and customer support in Uganda.',
    robots: 'index, follow',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: 'payment',
    title: 'Payment Information | Majo Market',
    description: 'View payment information for Majo Market orders and learn how to confirm a payment with customer support.',
    robots: 'index, follow',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: 'privacy-policy',
    title: 'Privacy Policy | Majo Market',
    description: 'Read how Majo Market collects, uses, and protects personal information when customers use our website and services.',
    robots: 'index, follow',
    priority: '0.4',
    changefreq: 'yearly',
  },
  {
    path: 'cookies',
    title: 'Cookie Policy | Majo Market',
    description: 'Learn how Majo Market uses essential, preference, and analytics cookies on our website.',
    robots: 'index, follow',
    priority: '0.4',
    changefreq: 'yearly',
  },
  {
    path: 'terms',
    title: 'Terms and Conditions | Majo Market',
    description: 'Read the terms and conditions for shopping and using services on the Majo Market website and mobile app.',
    robots: 'index, follow',
    priority: '0.4',
    changefreq: 'yearly',
  },
  {
    path: 'login',
    title: 'Sign In | Majo Market',
    description: 'Sign in to your Majo Market account.',
    robots: 'noindex, nofollow',
  },
  {
    path: 'register',
    title: 'Create Account | Majo Market',
    description: 'Create a Majo Market account to shop online and track your orders.',
    robots: 'noindex, nofollow',
  },
]

for (const page of staticPages) {
  const url = `https://www.majogadgets.com/${page.path}`
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    isPartOf: { '@id': 'https://www.majogadgets.com/#website' },
  }
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${page.robots}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
    .replace('</head>', `<script type="application/ld+json">${jsonLdScript(pageJsonLd)}</script>\n</head>`)

  const dir = join(DIST, page.path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

console.log(`Pre-rendered ${staticPages.length} public pages.`)

const [products, categories] = await Promise.all([fetchAllProducts(), fetchAllCategories()])
console.log(`Pre-rendering ${products.length} product pages...`)

for (const p of products) {
  const price = Number(p.price)
  const desc = trimDescription(p.short_description?.trim()
    ? `${p.short_description.trim()} Compare available seller offers on Majo Market.`
    : `Buy ${p.name} on Majo Market. Compare available offers, prices, stock, delivery, warranty and return options.`)
  const images = [
    p.image,
    p.image_url,
    ...(Array.isArray(p.images) ? p.images.map(item => item.url) : []),
  ].filter(Boolean)
  const image = images[0] || 'https://www.majogadgets.com/pwa-512.png'
  const url = `https://www.majogadgets.com/shop/${p.slug}`
  const title = `${p.name} | Majo Market`
  const productCategory = categories.find(category =>
    category.id === p.category?.id || category.slug === p.category?.slug,
  )
  const categoryPath = []
  let parentId = productCategory?.parent_id ?? null
  if (productCategory) categoryPath.unshift(productCategory)
  while (parentId !== null) {
    const parent = categories.find(category => category.id === parentId)
    if (!parent || categoryPath.some(category => category.id === parent.id)) break
    categoryPath.unshift(parent)
    parentId = parent.parent_id
  }
  const breadcrumbs = [
    { name: 'Home', item: 'https://www.majogadgets.com/' },
    ...(categoryPath.length
      ? categoryPath.map((category, index) => ({
        name: category.name,
        item: `https://www.majogadgets.com/shop/${categoryPath.slice(0, index + 1).map(item => item.slug).join('/')}`,
      }))
      : [{ name: 'Shop', item: 'https://www.majogadgets.com/shop' }]),
    { name: p.name, item: url },
  ]

  const jsonLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: title,
        description: desc,
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#product` },
      },
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        name: p.name,
        description: desc,
        ...(images.length ? { image: images } : {}),
        url,
        sku: String(p.id),
        ...(p.brand?.trim() ? { brand: { '@type': 'Brand', name: p.brand.trim() } } : {}),
        ...(p.category?.name || p.category_name ? { category: p.category?.name || p.category_name } : {}),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'UGX',
          price,
          availability: Number(p.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url,
          ...(p.seller_name ? { seller: { '@type': 'Organization', name: p.seller_name } } : {}),
        },
        ...(Number(p.rating) > 0 && Number(p.reviews_count) > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(p.rating).toFixed(1),
            reviewCount: Number(p.reviews_count),
            bestRating: 5,
            worstRating: 1,
          },
        } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.item,
        })),
      },
    ],
  })

  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeHtml(desc)}" />`
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${url}" />`
    )
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(desc)}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(desc)}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${image}" />`)
    .replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`)

  const dir = join(DIST, 'shop', p.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

const categoryUrls = []
for (const category of categories.filter(item => item.is_active !== false)) {
  const path = [category]
  let parentId = category.parent_id
  while (parentId !== null) {
    const parent = categories.find(item => item.id === parentId)
    if (!parent || path.some(item => item.id === parent.id)) break
    path.unshift(parent)
    parentId = parent.parent_id
  }

  const categoryUrl = `https://www.majogadgets.com/shop/${path.map(item => item.slug).join('/')}`
  const title = `${category.name} | Shop ${category.name} Online in Uganda | Majo Market`
  const description = trimDescription(category.description?.trim()
    || `Browse ${category.name} from trusted sellers on Majo Market. Compare available products, prices, and stock.`)
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${categoryUrl}#webpage`,
        url: categoryUrl,
        name: title,
        description,
        isPartOf: { '@id': 'https://www.majogadgets.com/#website' },
        breadcrumb: { '@id': `${categoryUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${categoryUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.majogadgets.com/' },
          { '@type': 'ListItem', position: 2, name: 'Categories', item: 'https://www.majogadgets.com/categories' },
          ...path.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 3,
            name: item.name,
            item: `https://www.majogadgets.com/shop/${path.slice(0, index + 1).map(part => part.slug).join('/')}`,
          })),
        ],
      },
    ],
  }
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="index,follow" />')
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${categoryUrl}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${categoryUrl}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace('</head>', `<script type="application/ld+json">${jsonLdScript(pageJsonLd)}</script>\n</head>`)

  const dir = join(DIST, 'shop', ...path.map(item => item.slug))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  categoryUrls.push({
    loc: categoryUrl,
    priority: path.length === 1 ? '0.8' : '0.7',
    changefreq: 'weekly',
  })
}

console.log('Pre-rendering complete.')
console.log(`Pre-rendered ${categoryUrls.length} active category pages.`)

// Generate sitemap with all public, category, and product URLs
const staticUrls = [
  { loc: 'https://www.majogadgets.com/', priority: '1.0', changefreq: 'daily' },
  ...staticPages
    .filter(page => page.robots === 'index, follow')
    .map(page => ({
      loc: `https://www.majogadgets.com/${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
    })),
]
const productUrls = products.map(p => ({
  loc: `https://www.majogadgets.com/shop/${encodeURIComponent(p.slug)}`,
  priority: '0.7',
  changefreq: 'weekly',
}))
const allUrls = [...staticUrls, ...categoryUrls, ...productUrls]
const escapeXml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
})[character])
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap)
console.log(`Sitemap generated with ${allUrls.length} URLs.`)
