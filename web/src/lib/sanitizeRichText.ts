import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'i', 'li', 'ol', 'p', 's', 'span', 'strike', 'strong', 'u', 'ul',
]

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['aria-level', 'href', 'role'],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  })
}
