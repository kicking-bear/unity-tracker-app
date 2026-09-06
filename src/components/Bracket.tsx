import { forwardRef } from 'react'
import { fmtTime, matchNumbers, sideOf, sortStages, standings, tally, winnerOf } from '@/lib/tournament'
import type { Match, Stage, TournamentState } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const COL = 'w-[calc(100vw-4.5rem)] max-w-[22rem] shrink-0 snap-start sm:w-72'

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  )
}

function Side({ s, score, isWin, big }: {
  s: ReturnType<typeof sideOf>; score: number | string; isWin: boolean; big?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="inline-block h-5 w-1 shrink-0 rounded-sm"
            style={{ background: s.team?.color ?? 'var(--border)' }} />
      <span className={cn('min-w-0 flex-1 truncate leading-tight', big ? 'text-lg' : 'text-sm',
        isWin ? 'font-semibold' : 'text-muted-foreground', !s.team && 'font-normal italic')}>
        {s.team?.name ?? s.label}
      </span>
      <span className={cn('font-mono tabular-nums', big ? 'text-2xl' : 'text-lg',
        isWin ? 'font-semibold' : 'text-muted-foreground')}>{score}</span>
    </div>
  )
}

export function MatchCard({ state, match, number, onSelect, big, muted }: {
  state: TournamentState; match: Match; number: string
  onSelect: (id: string) => void; big?: boolean; muted?: boolean
}) {
  const A = sideOf(state, match, 'a'), B = sideOf(state, match, 'b')
  const t = tally(match), w = winnerOf(state, match)
  return (
    <button type="button" onClick={() => onSelect(match.id)}
      className={cn('w-full rounded-xl border bg-card text-left transition',
        'hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        match.status === 'live' && 'border-emerald-500/60',
        muted && 'opacity-70')}>
      <div className="flex items-center gap-2 px-3 pt-2.5 text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">{number}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {match.status === 'live' && <LiveDot />}
          {match.status === 'final' ? 'Final' : fmtTime(match.start_time) || ''}
        </span>
      </div>
      <div className="mt-1 divide-y">
        <Side s={A} score={t.played ? t.a : '–'} isWin={!!w && w === A.team?.id} big={big} />
        <Side s={B} score={t.played ? t.b : '–'} isWin={!!w && w === B.team?.id} big={big} />
      </div>
      {match.court && <div className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">{match.court}</div>}
    </button>
  )
}

function PoolCard({ state, stage, onOpenPool }: {
  state: TournamentState; stage: Stage; onOpenPool: (id: string) => void
}) {
  const rows = standings(state, stage.id)
  const ms = state.matches.filter(m => m.stage_id === stage.id)
  const done = ms.filter(m => m.status === 'final').length
  return (
    <button type="button" onClick={() => onOpenPool(stage.id)}
      className="w-full rounded-xl border bg-card text-left transition hover:border-foreground/40
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-baseline gap-2 px-3 pb-1 pt-2.5">
        <span className="text-sm font-semibold">{stage.name}</span>
        {ms.some(m => m.status === 'live') && <LiveDot />}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{done}/{ms.length}</span>
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
      <div className="px-3 pb-2.5 pt-1.5 text-[11px] text-muted-foreground">
        Tap to see the {ms.length} matches
      </div>
    </button>
  )
}

export interface BracketColumn { key: string; label: string; stages: Stage[]; minor?: Stage[] }

/**
 * Pools collapse into one column. Knockout rounds each get a column, except
 * placement matches (third, fifth) which sit under the final, de-emphasised.
 */
export function bracketColumns(state: TournamentState): BracketColumn[] {
  const stages = sortStages(state.stages)
  const pools = stages.filter(s => s.type === 'pool')
  const ko = stages.filter(s => s.type === 'knockout')

  // placement = third/fifth/etc.  final = the decider, matched exactly so
  // "Semifinals" is never mistaken for it.
  const isPlacement = (s: Stage) => /third|fourth|fifth|place|consolation/i.test(s.name)
  const isFinal = (s: Stage) => /^(the )?finals?$/i.test(s.name.trim())
  const final = ko.filter(s => !isPlacement(s)).find(isFinal)
    ?? ko.filter(s => !isPlacement(s)).at(-1) ?? null

  const cols: BracketColumn[] = []
  if (pools.length) cols.push({ key: 'pools', label: 'Pool play', stages: pools })
  ko.filter(s => !isPlacement(s) && s.id !== final?.id)
    .forEach(s => cols.push({ key: s.id, label: s.name, stages: [s] }))
  if (final) {
    cols.push({ key: final.id, label: final.name, stages: [final], minor: ko.filter(isPlacement) })
  }
  return cols
}

const Bracket = forwardRef<HTMLDivElement, {
  state: TournamentState
  columns: BracketColumn[]
  liveStage: string | null
  onSelect: (id: string) => void
  onOpenPool: (id: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void
  fullscreen?: boolean
}>(({ state, columns, liveStage, onSelect, onOpenPool, registerCol, fullscreen }, ref) => {
  const nums = matchNumbers(state)
  return (
    <div ref={ref}
      className={cn('-mx-4 snap-x snap-proximity scroll-pl-4 overflow-x-auto scroll-smooth',
        '[&::-webkit-scrollbar]:hidden', fullscreen && 'h-full')}
      style={{ scrollbarWidth: 'none' }}>
      <div className={cn('flex w-max gap-4 px-4 pb-4', fullscreen && 'h-full items-center px-8')}>
        {columns.map(col => {
          const live = col.stages.some(s => s.id === liveStage)
          return (
            <div key={col.key} ref={el => registerCol(col.key, el)}
                 className={cn(COL, fullscreen && 'w-[26rem] max-w-none')}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {col.label}{live && <LiveDot />}
              </p>
              <div className="flex flex-col gap-3">
                {col.stages.map(stage =>
                  stage.type === 'pool' ? (
                    <PoolCard key={stage.id} state={state} stage={stage} onOpenPool={onOpenPool} />
                  ) : (
                    state.matches.filter(m => m.stage_id === stage.id).map(m => (
                      <MatchCard key={m.id} state={state} match={m} number={nums[m.id]}
                                 onSelect={onSelect} big={fullscreen} />
                    ))
                  ))}

                {col.minor && col.minor.length > 0 && (
                  <div className="mt-1 space-y-2 border-t pt-3">
                    {col.minor.map(stage => state.matches.filter(m => m.stage_id === stage.id).map(m => (
                      <MatchCard key={m.id} state={state} match={m} number={nums[m.id]}
                                 onSelect={onSelect} muted />
                    )))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
Bracket.displayName = 'Bracket'
export default Bracket
