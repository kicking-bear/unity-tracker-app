import { forwardRef } from 'react'
import { fmtTime, matchNumbers, orderMatches, sideOf, tally, winnerOf } from '@/lib/tournament'
import type { Match, TournamentState } from '@/lib/types'
import { LiveChip } from '@/components/Bracket'
import { cn } from '@/lib/utils'

const COL = 'w-[calc(100vw-4.5rem)] max-w-[22rem] shrink-0 snap-start sm:w-80'

const gradient = (colors: (string | null | undefined)[]) => {
  const cs = colors.map(c => c || '#3A3F47')
  return `linear-gradient(90deg, ${(cs.length === 1 ? [cs[0], cs[0]] : cs).join(', ')})`
}

function Row({ state, match, number, onSelect }: {
  state: TournamentState; match: Match; number: string; onSelect: (id: string) => void
}) {
  const A = sideOf(state, match, 'a'), B = sideOf(state, match, 'b')
  const t = tally(match), w = winnerOf(state, match)
  const side = (s: typeof A, score: number | string, isWin: boolean) => (
    <div className="flex items-center gap-2">
      <span className="inline-block h-4 w-1 shrink-0 rounded-sm"
            style={{ background: s.team?.color ?? 'var(--border)' }} />
      <span className={cn('min-w-0 flex-1 truncate text-sm',
        isWin ? 'font-semibold' : 'text-muted-foreground', !s.team && 'italic')}>
        {s.team?.name ?? s.label}
      </span>
      <span className={cn('font-mono text-sm tabular-nums',
        isWin ? 'font-semibold' : 'text-muted-foreground')}>{score}</span>
    </div>
  )
  return (
    <button type="button" onClick={() => onSelect(match.id)}
      className="w-full overflow-hidden rounded-xl border bg-card text-left transition hover:border-foreground/40">
      <div className="relative overflow-hidden" style={{ background: gradient([A.team?.color, B.team?.color]) }}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative flex items-center gap-2 px-3 py-1.5 text-[11px] text-white">
          <span className="font-mono font-semibold">{fmtTime(match.start_time) || '—'}</span>
          <span className="truncate text-white/80">{number}</span>
          <span className="ml-auto shrink-0">
            {match.status === 'live' ? <LiveChip />
              : match.status === 'final' ? <span className="text-white/80">Final</span> : null}
          </span>
        </div>
      </div>
      <div className="space-y-1 px-3 py-2">
        {side(A, t.played ? t.a : '–', !!w && w === A.team?.id)}
        {side(B, t.played ? t.b : '–', !!w && w === B.team?.id)}
      </div>
      {match.ref_name && (
        <div className="px-3 pb-2 text-[11px] text-muted-foreground opacity-70">Ref {match.ref_name}</div>
      )}
    </button>
  )
}

export interface CourtColumn { key: string; label: string; matches: Match[] }

/** One column per court, across every tournament in the event. */
export function courtColumns(states: TournamentState[]): CourtColumn[] {
  const map = new Map<string, Match[]>()
  states.forEach(s => s.matches.forEach(m => {
    const k = m.court?.trim() || 'Unassigned'
    const label = s.tournament?.division
      ? `${s.tournament.division === 'mens' ? "Men's" : "Women's"} ${k}`
      : k
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(m)
  }))
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, ms]) => ({ key: label, label, matches: orderMatches(ms) }))
}

const ScheduleView = forwardRef<HTMLDivElement, {
  states: TournamentState[]
  columns: CourtColumn[]
  onSelect: (state: TournamentState, matchId: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void
}>(({ states, columns, onSelect, registerCol }, ref) => {
  const numsFor = new Map(states.map(s => [s, matchNumbers(s)]))
  const stateOf = (m: Match) => states.find(s => s.matches.some(x => x.id === m.id))!

  return (
    <div ref={ref}
      className="-mx-4 snap-x snap-proximity scroll-pl-4 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}>
      <div className="flex w-max gap-4 px-4 pb-4">
        {columns.map(col => (
          <div key={col.key} ref={el => registerCol(col.key, el)} className={COL}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {col.label}
            </p>
            <div className="flex flex-col gap-2.5">
              {col.matches.map(m => {
                const st = stateOf(m)
                return (
                  <Row key={m.id} state={st} match={m}
                       number={numsFor.get(st)![m.id]}
                       onSelect={id => onSelect(st, id)} />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
ScheduleView.displayName = 'ScheduleView'
export default ScheduleView
