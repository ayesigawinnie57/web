import { useEffect, useRef } from 'react'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

type Props = { value: string; onChange: (html: string) => void; placeholder?: string }

export default function RichTextEditor({ value, onChange, placeholder = 'Write here...' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValue = useRef<string | null>(null)

  // Only set innerHTML when value changes externally (e.g. initial load)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastValue.current && el.innerHTML !== value) {
      el.innerHTML = value
      lastValue.current = value
    }
  }, [value])

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    emit()
  }

  const emit = () => {
    const html = editorRef.current?.innerHTML ?? ''
    lastValue.current = html
    onChange(html)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const plain = e.clipboardData.getData('text/plain')
    if (!plain) return
    e.preventDefault()
    const html = plain
      .split(/\n{2,}/)
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('')
    document.execCommand('insertHTML', false, html)
    emit()
  }

  const isActive = (cmd: string) => {
    try { return document.queryCommandState(cmd) } catch { return false }
  }

  const applyFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value
    // execCommand fontSize only accepts 1-7; use a span workaround
    exec('fontSize', '7')
    const el = editorRef.current
    if (!el) return
    el.querySelectorAll('font[size="7"]').forEach(node => {
      const span = document.createElement('span')
      span.style.fontSize = size
      span.innerHTML = (node as HTMLElement).innerHTML
      node.parentNode?.replaceChild(span, node)
    })
    emit()
  }

  const btn = (cmd: string, label: string, title: string) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd) }}
      className={`w-7 h-7 flex items-center justify-center rounded text-[13px] font-bold transition-colors
        ${isActive(cmd) ? 'bg-[#1E3A8A] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white focus-within:border-[#22C55E]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#E2E8F0] flex-wrap">
        {btn('bold', 'B', 'Bold')}
        <span style={{ fontStyle: 'italic' }}>
          {btn('italic', 'I', 'Italic')}
        </span>
        {btn('underline', 'U̲', 'Underline')}
        {btn('strikeThrough', 'S̶', 'Strikethrough')}
        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />
        {btn('insertUnorderedList', '•≡', 'Bullet list')}
        {btn('insertOrderedList', '1≡', 'Numbered list')}
        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />
        <select
          title="Font size"
          onChange={applyFontSize}
          defaultValue=""
          className="text-[12px] text-[#475569] border border-[#E2E8F0] rounded px-1 py-0.5 outline-none cursor-pointer"
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-3 text-[13px] text-[#071A2B] outline-none leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          empty:before:content-[attr(data-placeholder)] empty:before:text-[#94A3B8]"
      />
    </div>
  )
}
