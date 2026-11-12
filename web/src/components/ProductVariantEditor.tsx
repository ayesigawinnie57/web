import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus, X } from 'lucide-react'

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
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [optionName, setOptionName] = useState('color')
  const [optionValue, setOptionValue] = useState('')
  const normalizedOptionName = optionName.trim().toLowerCase()
  const suggestedValues = normalizedOptionName.includes('size')
    ? ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
    : normalizedOptionName.includes('gender')
      ? ['Men', 'Women', 'Unisex', 'Boys', 'Girls']
      : normalizedOptionName.includes('age')
        ? ['Young', 'Old', 'Adult', 'Child']
        : []
  const [variantError, setVariantError] = useState('')

  const addVariant = () => {
    const key = optionName.trim()
    const value = optionValue.trim()
    if (!key || !value) return
    const currentValues = [...new Set(variants
      .map(variant => variant.options[key])
      .filter(optionValue => optionValue !== undefined)
      .map(String))]
    if (currentValues.some(current => current.toLowerCase() === value.toLowerCase())) {
      setVariantError(`A ${key} variant named "${value}" already exists.`)
      return
    }

    const optionKeys = [...new Set([...variants.flatMap(variant => Object.keys(variant.options)), key])]
    const valuesByKey = Object.fromEntries(optionKeys.map(optionKey => [
      optionKey,
      [...new Set([
        ...variants.map(variant => variant.options[optionKey]).filter(optionValue => optionValue !== undefined).map(String),
        ...(optionKey === key ? [value] : []),
      ])],
    ])) as Record<string, string[]>
    const combinations = optionKeys.reduce<Record<string, string>[]>(
      (current, optionKey) => current.flatMap(options =>
        valuesByKey[optionKey].map(optionValue => ({ ...options, [optionKey]: optionValue })),
      ),
      [{}],
    )
    if (combinations.length > 100) {
      setVariantError('A product cannot have more than 100 variant combinations.')
      return
    }

    const optionKeyOf = (options: Record<string, string | number | boolean>) =>
      JSON.stringify(Object.entries(options).sort(([left], [right]) => left.localeCompare(right)))
    const sourceUseCount = new Map<number, number>()
    const nextVariants = combinations.map(options => {
      const exactIndex = variants.findIndex(variant => optionKeyOf(variant.options) === optionKeyOf(options))
      if (exactIndex >= 0) {
        sourceUseCount.set(exactIndex, (sourceUseCount.get(exactIndex) ?? 0) + 1)
        return variants[exactIndex]
      }

      const sourceIndex = variants.findIndex(variant =>
        Object.entries(variant.options).every(([optionKey, optionValue]) =>
          optionKey === key || String(options[optionKey]) === String(optionValue),
        ),
      )
      const source = sourceIndex >= 0 ? variants[sourceIndex] : null
      if (sourceIndex >= 0) sourceUseCount.set(sourceIndex, (sourceUseCount.get(sourceIndex) ?? 0) + 1)
      const isFirstCombinationForSource = sourceIndex >= 0 && sourceUseCount.get(sourceIndex) === 1
      const sourceHasMatchingColor = source && Object.entries(source.options).some(([optionKey, optionValue]) =>
        (optionKey.toLowerCase().includes('color') || optionKey.toLowerCase().includes('colour'))
        && String(options[optionKey]) === String(optionValue),
      )
      return {
        sku: isFirstCombinationForSource ? source!.sku : '',
        options,
        price: source?.price ?? basePrice,
        compare_at_price: source?.compare_at_price ?? baseOriginalPrice,
        stock: isFirstCombinationForSource ? source!.stock : '0',
        weight: source?.weight ?? '',
        is_active: source?.is_active ?? true,
        image_url: sourceHasMatchingColor ? source?.image_url ?? null : null,
        image_file: sourceHasMatchingColor ? source?.image_file ?? null : null,
      }
    })

    onChange(nextVariants)
    setOptionValue('')
    setVariantError('')
    setIsAddingVariant(false)
  }

  return (
    <section className="rounded-xl border border-[#CBD5E1] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-[#071A2B]">Options &amp; variants</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Optional product choices such as color or size. Shoppers select a combination before adding it to their cart.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">
          {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
        </span>
      </div>
      {variants.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#E2E8F0] px-3 sm:px-4">
          <p className="pt-3 text-[12px] font-bold text-[#334155]">Set details for each combination</p>
          {variants.map((variant, index) => (
            <VariantRow
              key={`${index}-${JSON.stringify(variant.options)}`}
              variant={variant}
              index={index}
              onChange={patch => onChange(variants.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
              onRemove={() => onChange(variants.filter((_, itemIndex) => itemIndex !== index))}
            />
          ))}
        </div>
      ) : !isAddingVariant && (
        <p className="mt-4 rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[12px] leading-5 text-[#64748B]">
          No variants yet. If you skip variants, the product keeps its regular settings.
        </p>
      )}
      {isAddingVariant && (
        <div className="mt-4 space-y-4 border-t border-[#E2E8F0] pt-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4">
            <p className="mb-3 text-[12px] font-bold text-[#334155]">Add a value to an option</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="product-variant-option-name" className="mb-1.5 block text-[12px] font-bold text-[#071A2B]">
                  Option name
                </label>
                <input
                  id="product-variant-option-name"
                  aria-label="Variant option name"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  placeholder="e.g. Color, Size, Gender"
                  value={optionName}
                  onChange={event => setOptionName(event.target.value)}
                  list="product-variant-option-names"
                />
                <p className="mt-1 text-[11px] leading-4 text-[#64748B]">What kind of choice is this?</p>
                <datalist id="product-variant-option-names">
                  {['Size', 'Gender', 'Age', 'Measurement', 'Color', 'Material'].map(value => <option key={value} value={value} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="product-variant-option-value" className="mb-1.5 block text-[12px] font-bold text-[#071A2B]">
                  Option value
                </label>
                <input
                  id="product-variant-option-value"
                  aria-label="Variant option value"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  placeholder={normalizedOptionName.includes('size') ? 'e.g. S, M, L, 42' : 'e.g. Red'}
                  value={optionValue}
                  onChange={event => setOptionValue(event.target.value)}
                  list="product-variant-suggested-values"
                />
                <p className="mt-1 text-[11px] leading-4 text-[#64748B]">One choice at a time; add another value for each color or size.</p>
                <datalist id="product-variant-suggested-values">
                  {suggestedValues.map(value => <option key={value} value={value} />)}
                </datalist>
              </div>
            </div>
          </div>
          {variantError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{variantError}</p>}
        </div>
      )}
      <div className="mt-4 flex justify-end border-t border-[#E2E8F0] pt-3">
        {isAddingVariant && (
          <button
            type="button"
            onClick={() => {
              setIsAddingVariant(false)
              setVariantError('')
            }}
            className="mr-2 rounded-lg border border-[#CBD5E1] px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC]"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={() => isAddingVariant ? addVariant() : setIsAddingVariant(true)}
          disabled={isAddingVariant && (!optionName.trim() || !optionValue.trim() || variants.length >= 100)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#071A2B] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#12304A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> Add Variant
        </button>
      </div>
    </section>
  )
}
