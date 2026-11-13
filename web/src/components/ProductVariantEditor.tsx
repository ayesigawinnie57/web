import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus, X } from 'lucide-react'
import type { ApiCategoryAttribute } from '../lib/api'

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
  sold_quantity?: number
  has_inventory_item?: boolean
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
          disabled={Boolean(variant.sold_quantity || variant.has_inventory_item)}
          className="flex items-center justify-center gap-1 rounded-lg border border-[#FECACA] px-2 py-2 text-[11px] font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Remove ${label}`}
          title={variant.sold_quantity ? 'This option has order history and cannot be removed.' : variant.has_inventory_item ? 'This option is tracked in inventory and cannot be removed.' : undefined}
        >
          <X size={13} /> Remove
        </button>
        {(variant.sold_quantity ?? 0) > 0 && (
          <p className="col-span-2 text-[11px] font-semibold text-amber-700 md:col-span-4">
            {variant.sold_quantity} sold. This option cannot be removed; mark it unavailable instead.
          </p>
        )}
        {variant.has_inventory_item && !variant.sold_quantity && (
          <p className="col-span-2 text-[11px] font-semibold text-amber-700 md:col-span-4">
            This option is tracked in inventory and cannot be removed.
          </p>
        )}
      </div>
    </div>
  )
}

export default function ProductVariantEditor({
  variants,
  onChange,
  basePrice,
  baseOriginalPrice,
  optionAttributes = [],
}: {
  variants: ProductVariantDraft[]
  onChange: (variants: ProductVariantDraft[]) => void
  basePrice: string
  baseOriginalPrice: string
  optionAttributes?: ApiCategoryAttribute[]
}) {
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [optionName, setOptionName] = useState('')
  const [customOptionName, setCustomOptionName] = useState('')
  const [selectedValuesByOption, setSelectedValuesByOption] = useState<Record<string, string[]>>({})
  const [customValueDraft, setCustomValueDraft] = useState('')
  const [valueMenuOpen, setValueMenuOpen] = useState(false)
  const [variantError, setVariantError] = useState('')
  const selectedOptionKey = optionName === '__other__' ? customOptionName.trim() : optionName
  const selectedAttribute = optionAttributes.find(attribute => attribute.key === selectedOptionKey)
  const existingOptionValues = [...new Set(variants
    .map(variant => variant.options[selectedOptionKey])
    .filter(optionValue => optionValue !== undefined)
    .map(String))]
  const selectedOptionValues = selectedOptionKey
    ? selectedValuesByOption[selectedOptionKey] ?? existingOptionValues
    : []
  const availableOptionValues = [...new Set([
    ...(selectedAttribute?.choices ?? []),
    ...existingOptionValues,
    ...selectedOptionValues,
  ])]
  const availableOptionNames = [...new Map([
    ...optionAttributes.map(attribute => attribute.key),
    ...variants.flatMap(variant => Object.keys(variant.options)),
    'Size', 'Gender', 'Age', 'Measurement', 'Color', 'Material',
  ].map(value => [value.toLowerCase(), value])).values()]
  const addCustomValue = () => {
    const value = customValueDraft.trim()
    if (!selectedOptionKey || !value) return
    setSelectedValuesByOption(current => {
      const currentValues = current[selectedOptionKey] ?? existingOptionValues
      return {
        ...current,
        [selectedOptionKey]: currentValues.some(item => item.toLowerCase() === value.toLowerCase())
          ? currentValues
          : [...currentValues, value],
      }
    })
    setCustomValueDraft('')
  }

  const addVariant = () => {
    const key = selectedOptionKey
    const values = selectedOptionValues
    if (!key || !values.length) return
    const existingKey = [...optionAttributes.map(attribute => attribute.key), ...variants.flatMap(variant => Object.keys(variant.options))].find(
      current => current.toLowerCase() === key.toLowerCase(),
    )
    const normalizedKey = existingKey ?? key
    const optionKeys = [...new Set([
      ...variants.flatMap(variant => Object.keys(variant.options)),
      ...Object.entries(selectedValuesByOption)
        .filter(([, optionValues]) => optionValues.length > 0)
        .map(([optionKey]) => optionKey),
      normalizedKey,
    ])]
    const valuesByKey = Object.fromEntries(optionKeys.map(optionKey => [
      optionKey,
      [...new Set([
        ...variants.map(variant => variant.options[optionKey]).filter(optionValue => optionValue !== undefined).map(String),
        ...(selectedValuesByOption[optionKey] ?? (optionKey === normalizedKey ? values : [])),
      ])],
    ])) as Record<string, string[]>
    const missingRequired = optionAttributes
      .filter(attribute => attribute.is_required && !valuesByKey[attribute.key]?.length)
      .map(attribute => attribute.name)
    if (missingRequired.length) {
      setVariantError(`Add at least one value for required option${missingRequired.length === 1 ? '' : 's'}: ${missingRequired.join(', ')}.`)
      return
    }

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
          optionKey === normalizedKey || String(options[optionKey]) === String(optionValue),
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
    setVariantError('')
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
            <p className="mb-3 text-[12px] font-bold text-[#334155]">Choose an option and one or more values</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="product-variant-option-name" className="mb-1.5 block text-[12px] font-bold text-[#071A2B]">
                  Option name
                </label>
                <select
                  id="product-variant-option-name"
                  aria-label="Variant option name"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                  value={optionName}
                  onChange={event => {
                    setOptionName(event.target.value)
                    setCustomOptionName('')
                    setVariantError('')
                  }}
                >
                  <option value="">Select an option...</option>
                  {availableOptionNames.map(value => (
                    <option key={value} value={value}>{optionAttributes.find(attribute => attribute.key === value)?.name ?? value}</option>
                  ))}
                  <option value="__other__">Other (enter a name)</option>
                </select>
                {optionName === '__other__' && (
                  <input
                    className="mt-2 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                    placeholder="Enter a custom option name"
                    value={customOptionName}
                    onChange={event => setCustomOptionName(event.target.value)}
                    aria-label="Custom variant option name"
                  />
                )}
                {selectedAttribute?.is_required && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-700">Required option</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#071A2B]">
                  Option values
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setValueMenuOpen(open => !open)}
                    disabled={!selectedOptionKey}
                    aria-expanded={valueMenuOpen}
                    className="w-full min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-left text-[13px] outline-none focus:border-[#2563EB] disabled:opacity-50"
                  >
                    <span className="block truncate">
                      {selectedOptionValues.length
                        ? selectedOptionValues.join(', ')
                        : selectedOptionKey ? 'Select values...' : 'Select an option name first'}
                    </span>
                  </button>
                  {valueMenuOpen && selectedOptionKey && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto overscroll-contain rounded-lg border border-[#CBD5E1] bg-white p-2 shadow-lg">
                      {availableOptionValues.length ? availableOptionValues.map(value => (
                        <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#334155] hover:bg-[#F1F5F9]">
                          <input
                            type="checkbox"
                            checked={selectedOptionValues.some(item => item.toLowerCase() === value.toLowerCase())}
                            onChange={event => setSelectedValuesByOption(current => {
                              const currentValues = current[selectedOptionKey] ?? existingOptionValues
                              return {
                                ...current,
                                [selectedOptionKey]: event.target.checked
                                  ? [...currentValues, value]
                                  : currentValues.filter(item => item.toLowerCase() !== value.toLowerCase()),
                              }
                            })}
                          />
                          <span className="break-words">{value}</span>
                        </label>
                      )) : (
                        <p className="px-2 py-1.5 text-[11px] text-[#64748B]">No saved values yet. Add a custom value below.</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#64748B]">Select multiple values to generate combinations.</p>
                <div className="mt-2 flex min-w-0 gap-2">
                  <input
                    aria-label="Custom option value"
                    className="min-w-0 flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] outline-none focus:border-[#2563EB]"
                    placeholder="Other: enter a value"
                    value={customValueDraft}
                    onChange={event => setCustomValueDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addCustomValue()
                      }
                    }}
                    disabled={!selectedOptionKey}
                  />
                  <button
                    type="button"
                    onClick={addCustomValue}
                    disabled={!selectedOptionKey || !customValueDraft.trim()}
                    className="shrink-0 rounded-lg border border-[#CBD5E1] bg-white px-3 text-[11px] font-bold text-[#334155] disabled:opacity-50"
                  >Add</button>
                </div>
              </div>
            </div>
            {selectedOptionValues.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedOptionValues.map(value => (
                  <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#E2E8F0] px-2.5 py-1 text-[11px] font-semibold text-[#334155]">
                    <span className="break-all">{value}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${value}`}
                      onClick={() => setSelectedValuesByOption(current => ({
                        ...current,
                        [selectedOptionKey]: selectedOptionValues.filter(item => item !== value),
                      }))}
                      className="shrink-0 text-[#64748B] hover:text-red-600"
                    ><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
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
          disabled={isAddingVariant && (!selectedOptionKey || !selectedOptionValues.length || variants.length >= 100)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#071A2B] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#12304A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} /> Add Variant
        </button>
      </div>
    </section>
  )
}
