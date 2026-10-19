export default function TypingIndicator({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex items-center gap-2 px-1 py-1 text-[11px] font-medium text-[#64748B]">
      <span>{label}</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C2410C] [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C2410C] [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C2410C]" />
      </span>
    </div>
  )
}