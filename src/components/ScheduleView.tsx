import { forwardRef, useMemo } from 'react'
import { fmtTime, matchNumbers, sideOf, tally, winnerOf } from '@/lib/tournament'
import type { Block, Match, TournamentState } from '@/lib/types'
import { LiveChip } from '@/components/Bracket'
import { cn } from '@/lib/utils'

const TIME_W = 64
const COL_W = 264

const gradient = (colors: (string | null | undefined)[]) => {
  const cs = colors.map(c => c || '#3A3F47')
  return `linear-gradient(90deg, ${(cs.length === 1 ? [cs[0], cs[0]] : cs).join(', ')})`
}

function MatchCell({ state, match, number, onSelect }: {
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
          <span className="truncate font-semibold">{number}</span>
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

export interface Court { key: string; label: string }

/** Court columns across every tournament in the event, plus any block-only courts. */
export function courtColumns(states: TournamentState[], blocks: Block[]): Court[] {
  const set = new Set<string>()
  states.forEach(s => s.matches.forEach(m => {
    if (m.court) set.add(courtLabel(s, m.court))
  }))
  blocks.forEach(b => { if (b.court && b.court !== 'ALL') set.add(b.court) })
  return [...set].sort().map(k => ({ key: k, label: k }))
}

export function courtLabel(s: TournamentState, court: string) {
  const d = s.tournament?.division
  const prefix = d === 'mens' ? "Men's " : d === 'womens' ? "Women's " : ''
  return prefix + court
}

const ScheduleView = forwardRef<HTMLDivElement, {
  states: TournamentState[]
  blocks: Block[]
  columns: Court[]
  onSelect: (state: TournamentState, matchId: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void
}>(({ states, blocks, columns, onSelect, registerCol }, ref) => {
  const numsFor = useMemo(() => new Map(states.map(s => [s, matchNumbers(s)])), [states])

  /** every distinct start time, matches and blocks together, in clock order */
  const rows = useMemo(() => {
    const times = new Set<string>()
    states.forEach(s => s.matches.forEach(m => times.add(m.start_time || '')))
    blocks.forEach(b => times.add(b.start_time || ''))
    return [...times].filter(Boolean).sort()
      .concat([...times].includes('') ? [''] : [])
  }, [states, blocks])

  const at = (time: string, court: string) => {
    for (const s of states) {
      const m = s.matches.find(x => (x.start_time || '') === time && x.court && courtLabel(s, x.court) === court)
      if (m) return { state: s, match: m }
    }
    return null
  }
  const blocksAt = (time: string) => blocks.filter(b => (b.start_time || '') === time)

  return (
    <div ref={ref}
      className="-mx-4 overflow-x-auto scroll-smooth px-0 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}>
      <div style={{ minWidth: TIME_W + columns.length * (COL_W + 12) + 32 }}>
        {/* column headings */}
        <div className="flex gap-3 px-4 pb-2" style={{ paddingLeft: TIME_W + 16 }}>
          {columns.map(c => (
            <div key={c.key} ref={el => registerCol(c.key, el)}
                 style={{ width: COL_W }}
                 className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
          ))}
        </div>

        {rows.map(time => {
          const allDay = blocksAt(time).filter(b => !b.court || b.court === 'ALL')
          return (
            <div key={time || 'tbd'} className="flex items-stretch gap-3 px-4 pb-3">
              <div style={{ width: TIME_W }}
                   className="shrink-0 pt-1 font-mono text-xs tabular-nums text-muted-foreground">
                {time ? fmtTime(time) : 'TBD'}
              </div>

              {allDay.length > 0 ? (
                <div className="flex-1 rounded-xl border border-dashed bg-muted/30 px-4 py-3">
                  {allDay.map(b => (
                    <div key={b.id}>
                      <p className="text-sm font-semibold">{b.title}</p>
                      {b.details && <p className="text-xs text-muted-foreground">{b.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                columns.map(c => {
                  const hit = at(time, c.key)
                  const blk = blocksAt(time).find(b => b.court === c.key)
                  return (
                    <div key={c.key} style={{ width: COL_W }} className="shrink-0">
                      {hit ? (
                        <MatchCell state={hit.state} match={hit.match}
                                   number={numsFor.get(hit.state)![hit.match.id]}
                                   onSelect={id => onSelect(hit.state, id)} />
                      ) : blk ? (
                        <div className="rounded-xl border border-dashed bg-muted/30 px-3 py-2">
                          <p className="text-sm font-semibold">{blk.title}</p>
                          {blk.details && <p className="text-xs text-muted-foreground">{blk.details}</p>}
                        </div>
                      ) : (
                        <div className="h-full min-h-8 rounded-xl border border-dashed border-border/40" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
ScheduleView.displayName = 'ScheduleView'
export default ScheduleView
