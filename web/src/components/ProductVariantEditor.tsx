import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

export type ProductVariantDraft = {
  sku: string
  options: Record<string, string | number | boolean>
  price: string
  compare_at_price: string
  stock: string
  weight: string
  is_active: boolean
  image_url: string | null
  image_file: File | null
}

function VariantRow({
  variant,
  index,
  onChange,
  onRemove,
}: {
  variant: ProductVariantDraft
  index: number
  onChange: (patch: Partial<ProductVariantDraft>) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!variant.image_file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(variant.image_file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [variant.image_file])

  const label = Object.values(variant.options).map(String).join(' / ') || `Variant ${index + 1}`

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-[#F1F5F9] pt-3 sm:grid-cols-[88px_1fr]">
      <div className="flex items-center gap-2 sm:block">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC]"
          aria-label={`Add image for ${label}`}
        >
          {preview || variant.image_url
            ? <img src={preview ?? variant.image_url ?? ''} alt="" className="h-full w-full object-cover" />
            : <ImagePlus size={20} color="#94A3B8" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) onChange({ image_file: file })
            event.target.value = ''
          }}
        />
        <p className="text-[11px] font-semibold text-[#64748B] sm:mt-1 sm:max-w-20 sm:text-center">Variant image</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <p className="col-span-2 text-[12px] font-bold text-[#071A2B] md:col-span-4">{label}</p>
        <input
          aria-label={`${label} SKU`}
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-2 py-2 text-[11px]"
          placeholder="SKU"
          value={variant.sku}
          onChange={event => onChange({ sku: event.target.value })}
        />
        <input
          aria-label={`${label} price`}
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-2 py-2 text-[11px]"
          placeholder="Price"
          type="number"
          value={variant.price}
          onChange={event => onChange({ price: event.target.value })}
        />
        <input
          aria-label={`${label} compare-at price`}
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-2 py-2 text-[11px]"
          placeholder="Compare-at"
          type="number"
          value={variant.compare_at_price}
          onChange={event => onChange({ compare_at_price: event.target.value })}
        />
        <input
          aria-label={`${label} stock`}
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-2 py-2 text-[11px]"
          placeholder="Stock"
          type="number"
          value={variant.stock}
          onChange={event => onChange({ stock: event.target.value })}
        />
        <label className="col-span-2 flex items-center gap-2 text-[11px] font-semibold text-[#475569] md:col-span-3">
          <input type="checkbox" checked={variant.is_active} onChange={event => onChange({ is_active: event.target.checked })} />
          Available for sale
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center gap-1 rounded-lg border border-[#FECACA] px-2 py-2 text-[11px] font-semibold text-red-600"
          aria-label={`Remove ${label}`}
        >
          <X size={13} /> Remove
        </button>
      </div>
    </div>
  )
}

export default function ProductVariantEditor({
  variants,
  onChange,
  basePrice,
  baseOriginalPrice,
}: {
  variants: ProductVariantDraft[]
  onChange: (variants: ProductVariantDraft[]) => void
  basePrice: string
  baseOriginalPrice: string
}) {
  const [optionName, setOptionName] = useState('color')
  const [optionValues, setOptionValues] = useState('')

  const generateVariants = () => {
    const key = optionName.trim()
    const values = [...new Set(optionValues.split(/[,\n]/).map(value => value.trim()).filter(Boolean))]
    if (!key || !values.length) return

    onChange(values.slice(0, 100).map(value => ({
      sku: '',
      options: { [key]: value },
      price: basePrice,
      compare_at_price: baseOriginalPrice,
      stock: '0',
      weight: '',
      is_active: true,
      image_url: null,
      image_file: null,
    })))
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div>
        <h2 className="text-[14px] font-extrabold text-[#071A2B]">Options &amp; variants</h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Optional. Add variants such as red, white, and green; shoppers can select an image and label.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <input
          aria-label="Variant option name"
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px]"
          placeholder="Option name (e.g. color)"
          value={optionName}
          onChange={event => setOptionName(event.target.value)}
        />
        <input
          aria-label="Variant option values"
          className="min-w-0 rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px]"
          placeholder="Values separated by commas (e.g. Red, White, Green)"
          value={optionValues}
          onChange={event => setOptionValues(event.target.value)}
        />
        <button type="button" onClick={generateVariants} className="rounded-lg bg-[#071A2B] px-3 py-2 text-[12px] font-bold text-white">
          Generate variants
        </button>
      </div>
      {variants.map((variant, index) => (
        <VariantRow
          key={`${index}-${JSON.stringify(variant.options)}`}
          variant={variant}
          index={index}
          onChange={patch => onChange(variants.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
          onRemove={() => onChange(variants.filter((_, itemIndex) => itemIndex !== index))}
        />
      ))}
      {variants.length === 0 && <p className="text-[12px] text-[#94A3B8]">No variants added. The product will use its existing price, stock, and image settings.</p>}
    </section>
  )
}
