import { useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/** Header gradient across team colours, darkened so text stays legible. */
const gradient = (colors: (string | null | undefined)[]) => {
  const cs = colors.map(c => c || '#3A3F47')
  return `linear-gradient(90deg, ${(cs.length === 1 ? [cs[0], cs[0]] : cs).join(', ')})`
}

/**
 * Bottom sheet on mobile, centred dialog on desktop.
 * - never steals focus into the first input
 * - swipe down from the top of the scroll area to dismiss
 * - gradient header owns the title, subtitle and close button
 */
export default function SheetShell({
  open, onClose, colors, title, subtitle, badge, children,
}: {
  open: boolean
  onClose: () => void
  colors: (string | null | undefined)[]
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  children: ReactNode
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const dragging = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    if ((scroller.current?.scrollTop ?? 0) > 0) return
    startY.current = e.touches[0].clientY
    dragging.current = false
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 8) dragging.current = true
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startY.current != null && dragging.current) {
      const dy = e.changedTouches[0].clientY - startY.current
      if (dy > 90) onClose()
    }
    startY.current = null
    dragging.current = false
  }

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          // mobile: tall sheet, clear gap at the top so the backdrop is tappable
          'top-16 h-[calc(100dvh-4rem)] rounded-t-2xl',
          // desktop: centred dialog
          'md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85vh] md:w-[600px]',
          'md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border',
        )}
      >
        {/* gradient header */}
        <div className="relative shrink-0 overflow-hidden" style={{ background: gradient(colors) }}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative flex items-start gap-3 px-5 py-3.5 text-white">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="truncate text-base font-semibold text-white">{title}</SheetTitle>
                {badge}
              </div>
              {subtitle && (
                <SheetDescription className="mt-0.5 truncate text-xs text-white/75">
                  {subtitle}
                </SheetDescription>
              )}
            </div>
            <button
              type="button" onClick={onClose} aria-label="Close"
              className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full
                         bg-white/15 text-white transition hover:bg-white/25"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* grab handle, mobile only */}
          <div className="relative mx-auto mb-1.5 h-1 w-10 rounded-full bg-white/35 md:hidden" />
        </div>

        <div
          ref={scroller}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4"
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
