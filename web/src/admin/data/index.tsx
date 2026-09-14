import { Database, Download, Upload, Trash2 } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Export Data',
    desc: 'Download a CSV or JSON export of your store data.',
    icon: Download,
    color: '#6366f1',
    actions: ['Export Products', 'Export Orders', 'Export Users'],
  },
  {
    title: 'Import Data',
    desc: 'Bulk-import products or categories from a CSV file.',
    icon: Upload,
    color: '#10b981',
    actions: ['Import Products', 'Import Categories'],
  },
  {
    title: 'Danger Zone',
    desc: 'Irreversible actions — proceed with caution.',
    icon: Trash2,
    color: '#ef4444',
    actions: ['Clear All Orders', 'Reset Inventory'],
  },
]

export default function AdminData() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Database size={20} color="#071A2B" />
        <h1 className="text-xl font-extrabold text-[#071A2B]">Data Management</h1>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map(({ title, desc, icon: Icon, color, actions }) => (
          <div key={title} className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-[#071A2B]">{title}</p>
                <p className="text-[11px] text-[#64748B]">{desc}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map(a => (
                <button
                  key={a}
                  className="px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-opacity hover:opacity-75"
                  style={{ borderColor: color + '40', backgroundColor: color + '0d', color }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-[12px] text-[#94A3B8] text-center">Full data pipeline integrations coming soon.</p>
    </div>
  )
}
