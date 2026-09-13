import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Native date input with a visible, clickable indicator. */
export default function DateField({
  id, value, onChange, className,
}: { id?: string; value?: string; onChange?: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null
    try { el?.showPicker?.() } catch { /* unsupported: typing still works */ }
  }
  return (
    <div className={cn('relative', className)}>
      <Input ref={ref} id={id} type="date" value={value} onClick={open}
        onChange={e => onChange?.(e.target.value)}
        className="h-10 w-full pr-10 font-mono [&::-webkit-calendar-picker-indicator]:opacity-0" />
      <button type="button" onClick={open} aria-label="Pick a date"
        className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center
                   rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground">
        <CalendarDays className="size-4" />
      </button>
    </div>
  )
}
