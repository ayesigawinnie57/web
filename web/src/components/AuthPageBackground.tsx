import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { BASE_URL, cloudinaryUrl, productsApi } from '../lib/api'

const FALLBACK_CATEGORY_IMAGE = cloudinaryUrl('v1788966916/categories/z0zavpw2h0nklgv0h2q5.jpg') ?? '/OG.png'

const resolveCategoryImageUrl = (imagePath: string) => {
  const path = imagePath.trim()
  if (/^https?:\/\//i.test(path)) return path

  const cloudinaryPath = path.replace(/^\/?image\/upload\//, '')
  if (/^(?:v\d+\/|categories\/)/.test(cloudinaryPath)) {
    return cloudinaryUrl(cloudinaryPath) ?? null
  }

  return new URL(path, BASE_URL).href
}

type Props = {
  children: ReactNode
  className: string
  style?: CSSProperties
}

export default function AuthPageBackground({ children, className, style }: Props) {
  const [categoryImage, setCategoryImage] = useState<string | null>(FALLBACK_CATEGORY_IMAGE)

  useEffect(() => {
    let active = true

    productsApi.categories()
      .then(({ data }) => {
        const imagePath = data.find(category => category.is_active && category.image?.trim())?.image?.trim()
        if (!imagePath) return

        let imageUrl: URL
        try {
          const resolvedImage = resolveCategoryImageUrl(imagePath)
          if (!resolvedImage) return
          imageUrl = new URL(resolvedImage, window.location.href)
        } catch (error) {
          if (import.meta.env.DEV) console.warn('Could not resolve a category background image.', error)
          return
        }

        if (imageUrl.protocol !== 'https:' && imageUrl.protocol !== 'http:') return

        const image = new Image()
        image.onload = () => {
          if (active) setCategoryImage(imageUrl.href)
        }
        image.onerror = () => {
          if (import.meta.env.DEV) console.warn('Could not load the category background image.')
        }
        image.src = imageUrl.href
      })
      .catch(error => {
        if (import.meta.env.DEV) console.warn('Could not load category images for the authentication background.', error)
      })

    return () => {
      active = false
    }
  }, [])

  const backgroundStyle = categoryImage
    ? {
      ...style,
      backgroundImage: `linear-gradient(rgba(7, 26, 43, 0.52), rgba(7, 26, 43, 0.38)), url(${JSON.stringify(categoryImage)})`,
    }
    : style

  return (
    <div className={`auth-page-background ${className}`} style={backgroundStyle}>
      {children}
    </div>
  )
}
