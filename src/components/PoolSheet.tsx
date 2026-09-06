import { matchNumbers, standings } from '@/lib/tournament'
import type { TournamentState } from '@/lib/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CardHeader, MatchCard } from '@/components/Bracket'
import { cn } from '@/lib/utils'

export default function PoolSheet({
  state, stageId, onClose, onSelectMatch,
}: {
  state: TournamentState; stageId: string | null
  onClose: () => void; onSelectMatch: (id: string) => void
}) {
  const stage = state.stages.find(s => s.id === stageId) ?? null
  const nums = matchNumbers(state)
  if (!stage) return <Sheet open={false}><SheetContent /></Sheet>

  const rows = standings(state, stage.id)
  const matches = state.matches.filter(m => m.stage_id === stage.id)

  return (
    <Sheet open={!!stageId} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8 md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85vh] md:w-[560px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:pb-6 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95">
        <SheetHeader className="-mx-5 px-0 pb-0 pt-0">
          <CardHeader className="rounded-none" colors={rows.map(r => r.team.color)}
            left={stage.name}
            right={<span className="pr-10 font-mono text-white/85">
              {matches.filter(m => m.status === 'final').length}/{matches.length}
            </span>}
            live={matches.some(m => m.status === 'live')} />
          <SheetTitle className="sr-only">{stage.name}</SheetTitle>
          <SheetDescription className="sr-only">Standings and matches</SheetDescription>
        </SheetHeader>

        <div className="mt-4 overflow-hidden rounded-xl border">
          {rows.map((r, i) => {
            const pd = r.pf - r.pa
            return (
              <div key={r.team.id}
                   className={cn('flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0',
                     i < 2 && 'bg-muted/30')}>
                <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="inline-block h-5 w-1.5 rounded-sm"
                      style={{ background: r.team.color ?? 'var(--border)' }} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {r.team.name}
                  {r.tied && <Badge variant="secondary" className="ml-2 h-4 px-1 text-[9px]">tie</Badge>}
                </span>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {r.w}–{r.l}
                </span>
                <span className="w-12 text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {pd > 0 ? '+' : ''}{pd}
                </span>
              </div>
            )
          })}
        </div>

        <Separator className="my-5" />
        <h3 className="mb-3 text-base font-semibold">Matches</h3>
        <div className="space-y-2.5">
          {matches.map(m => (
            <MatchCard key={m.id} state={state} match={m} number={nums[m.id]}
                       onSelect={id => { onClose(); onSelectMatch(id) }} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
