import { matchNumbers, standings } from '@/lib/tournament'
import type { TournamentState } from '@/lib/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MatchCard } from '@/components/Bracket'
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
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8">
        <SheetHeader className="px-0 pt-2">
          <SheetTitle className="text-xl font-semibold tracking-tight">{stage.name}</SheetTitle>
          <SheetDescription>Standings and matches</SheetDescription>
        </SheetHeader>

        <div className="mt-2 overflow-hidden rounded-xl border">
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
