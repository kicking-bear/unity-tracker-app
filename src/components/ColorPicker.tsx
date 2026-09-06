import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { PALETTE, paletteName } from '@/lib/palette'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export default function ColorPicker({
  value, onChange,
}: { value?: string | null; onChange: (hex: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const name = paletteName(value)

  function pick(hex: string | null) { onChange(hex); setOpen(false) }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 px-2.5">
          <span className={cn('size-5 rounded-full border', !value && 'bg-transparent')}
                style={value ? { background: value } : undefined}>
            {!value && <X className="size-4 text-muted-foreground" />}
          </span>
          <span className="text-xs font-normal text-muted-foreground">{name ?? 'No colour'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => pick(null)} title="No colour" aria-label="No colour"
            className={cn('flex size-7 items-center justify-center rounded-full border transition hover:scale-110',
              !value && 'ring-2 ring-ring ring-offset-2 ring-offset-popover')}>
            <X className="size-3.5 text-muted-foreground" />
          </button>
          {PALETTE.map(c => {
            const on = (value ?? '').toLowerCase() === c.hex.toLowerCase()
            return (
              <button key={c.hex} type="button" onClick={() => pick(c.hex)}
                title={c.name} aria-label={c.name}
                className={cn('relative size-7 rounded-full border transition hover:scale-110',
                  on && 'ring-2 ring-ring ring-offset-2 ring-offset-popover')}
                style={{ background: c.hex }}>
                {on && <Check className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
