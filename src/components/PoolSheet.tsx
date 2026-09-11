import { matchNumbers, orderMatches, standings } from '@/lib/tournament'
import type { TournamentState } from '@/lib/types'
import SheetShell from '@/components/SheetShell'
import { MatchCard } from '@/components/Bracket'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function PoolSheet({
  state, stageId, onClose, onSelectMatch,
}: {
  state: TournamentState; stageId: string | null
  onClose: () => void; onSelectMatch: (id: string) => void
}) {
  const stage = state.stages.find(s => s.id === stageId) ?? null
  const nums = matchNumbers(state)
  if (!stage) return <SheetShell open={false} onClose={onClose} colors={[]} title="">{null}</SheetShell>

  const rows = standings(state, stage.id)
  const matches = orderMatches(state.matches.filter(m => m.stage_id === stage.id))
  const done = matches.filter(m => m.status === 'final').length

  return (
    <SheetShell
      open={!!stageId} onClose={onClose}
      colors={rows.map(r => r.team.color)}
      title={stage.name}
      subtitle={`${done} of ${matches.length} played`}
    >
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="w-4" /><span className="w-1.5" />
          <span className="flex-1">Team</span>
          <span className="w-6 text-right">P</span>
          <span className="w-10 text-right">W–L</span>
          <span className="w-12 text-right">Sets</span>
          <span className="w-12 text-right">PD</span>
        </div>
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
              <span className="w-6 text-right font-mono text-sm tabular-nums text-muted-foreground">{r.p}</span>
              <span className="w-10 text-right font-mono text-sm tabular-nums">{r.w}–{r.l}</span>
              <span className="w-12 text-right font-mono text-sm tabular-nums text-muted-foreground">{r.sw}–{r.sl}</span>
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
    </SheetShell>
  )
}
