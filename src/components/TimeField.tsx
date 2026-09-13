import { useRef } from 'react'
import { Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Native time input with a visible, clickable indicator.
 * Clicking anywhere in the field opens the picker where the browser supports it.
 */
export default function TimeField({
  id, value, defaultValue, onChange, onBlur, className,
}: {
  id?: string
  value?: string
  defaultValue?: string
  onChange?: (v: string) => void
  onBlur?: (v: string) => void
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null
    try { el?.showPicker?.() } catch { /* unsupported: the field still types fine */ }
  }
  return (
    <div className={cn('relative', className)}>
      <Input
        ref={ref} id={id} type="time"
        value={value} defaultValue={defaultValue}
        onClick={open}
        onChange={e => onChange?.(e.target.value)}
        onBlur={e => onBlur?.(e.target.value)}
        className="h-10 w-full pr-10 font-mono [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <button type="button" onClick={open} aria-label="Pick a time"
        className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center
                   rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground">
        <Clock className="size-4" />
      </button>
    </div>
  )
}
