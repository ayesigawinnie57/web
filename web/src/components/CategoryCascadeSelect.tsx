import { getCategoryPath, type ApiCategory } from '../lib/api'

export default function CategoryCascadeSelect({
  categories,
  selectedId,
  onChange,
  allowEmpty = false,
  required = false,
}: {
  categories: ApiCategory[]
  selectedId: string
  onChange: (id: string) => void
  allowEmpty?: boolean
  required?: boolean
}) {
  const selected = categories.find(category => String(category.id) === selectedId)
  const path = selected ? getCategoryPath(categories, selected) : []
  const department = path[0]
  const category = path[1]
  const subcategory = path[2]
  const departments = categories.filter(item => item.parent_id === null)
  const categoryOptions = department
    ? categories.filter(item => item.parent_id === department.id)
    : []
  const subcategoryOptions = category
    ? categories.filter(item => item.parent_id === category.id)
    : []
  const fieldClass = 'w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-3 text-[13px] disabled:bg-[#F1F5F9]'

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <select
        aria-label="Department"
        required={required}
        value={department ? String(department.id) : ''}
        onChange={event => onChange(event.target.value)}
        className={fieldClass}
      >
        <option value="">Select department</option>
        {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select
        aria-label="Category"
        value={category ? String(category.id) : ''}
        onChange={event => onChange(event.target.value)}
        disabled={!department || categoryOptions.length === 0}
        className={fieldClass}
      >
        <option value="">{categoryOptions.length ? 'Select category' : 'No categories'}</option>
        {categoryOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select
        aria-label="Subcategory"
        value={subcategory ? String(subcategory.id) : ''}
        onChange={event => onChange(event.target.value)}
        disabled={!category || subcategoryOptions.length === 0}
        className={fieldClass}
      >
        <option value="">{subcategoryOptions.length ? 'Select subcategory' : 'No subcategories'}</option>
        {subcategoryOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {allowEmpty && (
        <button type="button" onClick={() => onChange('')} className="text-left text-[11px] font-semibold text-[#64748B] hover:text-[#1E3A8A]">
          Remove category
        </button>
      )}
    </div>
  )
}
