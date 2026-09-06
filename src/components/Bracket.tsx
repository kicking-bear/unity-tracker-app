import { forwardRef } from 'react'
import { fmtTime, matchNumbers, sideOf, sortStages, standings, tally, winnerOf } from '@/lib/tournament'
import type { Match, Stage, TournamentState } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const COL = 'w-[calc(50vw-1.75rem)] min-w-[200px] shrink-0 snap-start md:w-72'

function Side({ s, score, isWin, big }: {
  s: ReturnType<typeof sideOf>; score: number | string; isWin: boolean; big?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="inline-block h-5 w-1 shrink-0 rounded-sm"
            style={{ background: s.team?.color ?? 'var(--border)' }} />
      <span className={cn('min-w-0 flex-1 truncate leading-tight', big ? 'text-base' : 'text-sm',
        isWin ? 'font-semibold' : 'text-muted-foreground',
        !s.team && 'font-normal italic')}>
        {s.team?.name ?? s.label}
      </span>
      <span className={cn('font-mono tabular-nums', big ? 'text-xl' : 'text-lg',
        isWin ? 'font-semibold' : 'text-muted-foreground')}>{score}</span>
    </div>
  )
}

function MatchCard({ state, match, number, onSelect, big }: {
  state: TournamentState; match: Match; number: number; onSelect: (id: string) => void; big?: boolean
}) {
  const A = sideOf(state, match, 'a'), B = sideOf(state, match, 'b')
  const t = tally(match), w = winnerOf(state, match)
  return (
    <button type="button" onClick={() => onSelect(match.id)}
      className={cn('w-full rounded-xl border bg-card text-left transition',
        'hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        match.status === 'live' && 'border-foreground/50')}>
      <div className="flex items-center gap-2 px-3 pt-2.5 text-xs text-muted-foreground">
        <span className="font-mono font-medium text-foreground">#{number}</span>
        <span className="truncate">{match.label ?? ''}</span>
        <span className="ml-auto shrink-0">
          {match.status === 'final' ? 'Final' : match.status === 'live'
            ? <Badge className="h-5 px-1.5 text-[10px]">Live</Badge>
            : fmtTime(match.start_time) || ''}
        </span>
      </div>
      <div className="mt-1 divide-y">
        <Side s={A} score={t.played ? t.a : '–'} isWin={!!w && w === A.team?.id} big={big} />
        <Side s={B} score={t.played ? t.b : '–'} isWin={!!w && w === B.team?.id} big={big} />
      </div>
      {match.court && (
        <div className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">{match.court}</div>
      )}
    </button>
  )
}

function PoolCard({ state, stage }: { state: TournamentState; stage: Stage }) {
  const rows = standings(state, stage.id)
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-baseline justify-between px-3 pb-1 pt-2.5">
        <span className="text-sm font-semibold">{stage.name}</span>
        <span className="text-[11px] text-muted-foreground">W · L · PD</span>
      </div>
      <div className="divide-y">
        {rows.map((r, i) => {
          const pd = r.pf - r.pa
          return (
            <div key={r.team.id} className={cn('flex items-center gap-2.5 px-3 py-2', i < 2 && 'bg-muted/30')}>
              <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="inline-block h-4 w-1 rounded-sm" style={{ background: r.team.color ?? 'var(--border)' }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {r.team.name}
                {r.tied && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">tie</Badge>}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {r.w}·{r.l}·{pd > 0 ? '+' : ''}{pd}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface BracketColumn { key: string; label: string; stages: Stage[] }

/** Pools collapse into one column; each knockout stage is its own column. */
export function bracketColumns(state: TournamentState): BracketColumn[] {
  const stages = sortStages(state.stages)
  const pools = stages.filter(s => s.type === 'pool')
  const cols: BracketColumn[] = []
  if (pools.length) cols.push({ key: 'pools', label: 'Pool play', stages: pools })
  stages.filter(s => s.type === 'knockout').forEach(s =>
    cols.push({ key: s.id, label: s.name, stages: [s] }))
  return cols
}

const Bracket = forwardRef<HTMLDivElement, {
  state: TournamentState
  columns: BracketColumn[]
  onSelect: (id: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void
  fullscreen?: boolean
}>(({ state, columns, onSelect, registerCol, fullscreen }, ref) => {
  const nums = matchNumbers(state)
  return (
    <div ref={ref}
      className={cn('-mx-4 snap-x snap-mandatory overflow-x-auto scroll-smooth px-4',
        'scrollbar-none [&::-webkit-scrollbar]:hidden',
        fullscreen && 'h-full items-center')}
      style={{ scrollbarWidth: 'none' }}>
      <div className={cn('flex gap-4 pb-4', fullscreen && 'h-full items-center px-8')}>
        {columns.map(col => (
          <div key={col.key} ref={el => registerCol(col.key, el)}
               className={cn(COL, fullscreen && 'w-96')}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{col.label}</p>
            <div className="flex flex-col gap-3">
              {col.stages.map(stage => {
                const ms = state.matches.filter(m => m.stage_id === stage.id)
                if (stage.type === 'pool') {
                  return (
                    <div key={stage.id} className="space-y-2">
                      <PoolCard state={state} stage={stage} />
                      {ms.map(m => <MatchCard key={m.id} state={state} match={m} number={nums[m.id]} onSelect={onSelect} />)}
                    </div>
                  )
                }
                return ms.map(m => (
                  <MatchCard key={m.id} state={state} match={m} number={nums[m.id]} onSelect={onSelect} big={fullscreen} />
                ))
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
Bracket.displayName = 'Bracket'
export default Bracket
