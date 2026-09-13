import { forwardRef, useMemo } from 'react'
import { matchNumbers, orderMatches, sideOf, tally, winnerOf } from '@/lib/tournament'
import type { Block, Match, TournamentState } from '@/lib/types'
import { LiveChip } from '@/components/Bracket'
import { cn } from '@/lib/utils'

const TIME_W = 46          // Apple Calendar keeps this narrow
const COL_MIN = 232

const gradient = (colors: (string | null | undefined)[]) => {
  const cs = colors.map(c => c || '#3A3F47')
  return `linear-gradient(90deg, ${(cs.length === 1 ? [cs[0], cs[0]] : cs).join(', ')})`
}

/** "14:30" -> ["2:30","PM"] so the gutter can stack them */
function splitTime(t?: string | null): [string, string] {
  if (!t) return ['TBD', '']
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return [t, '']
  const h = Number(m[1])
  return [`${((h + 11) % 12) + 1}:${m[2]}`, h >= 12 ? 'PM' : 'AM']
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

function BlockCell({ block, wide }: { block: Block; wide?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-dashed bg-muted/40 px-3 py-2',
      wide && 'flex items-center gap-3')}>
      <p className="text-sm font-semibold">{block.title}</p>
      {block.details && <p className="text-xs text-muted-foreground">{block.details}</p>}
      {block.end_time && (
        <p className="ml-auto font-mono text-[11px] text-muted-foreground">
          until {splitTime(block.end_time).join(' ')}
        </p>
      )}
    </div>
  )
}

export interface Court { key: string; label: string }

export function courtLabel(s: TournamentState, court: string) {
  const d = s.tournament?.division
  return (d === 'mens' ? "Men's " : d === 'womens' ? "Women's " : '') + court
}

export function courtColumns(states: TournamentState[], blocks: Block[]): Court[] {
  const set = new Set<string>()
  states.forEach(s => s.matches.forEach(m => { if (m.court) set.add(courtLabel(s, m.court)) }))
  blocks.forEach(b => { if (b.court && b.court !== 'ALL') set.add(b.court) })
  return [...set].sort().map(k => ({ key: k, label: k }))
}

/**
 * Time down the side, courts across the top — one CSS grid so every row lines up.
 * The gutter is sticky-left and the headings sticky-top, as in a calendar.
 */
const ScheduleView = forwardRef<HTMLDivElement, {
  states: TournamentState[]
  blocks: Block[]
  columns: Court[]
  onSelect: (state: TournamentState, matchId: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void
}>(({ states, blocks, columns, onSelect, registerCol }, ref) => {
  const numsFor = useMemo(() => new Map(states.map(s => [s, matchNumbers(s)])), [states])

  const times = useMemo(() => {
    const set = new Set<string>()
    states.forEach(s => s.matches.forEach(m => set.add(m.start_time || '')))
    blocks.forEach(b => set.add(b.start_time || ''))
    const withTime = [...set].filter(Boolean).sort()
    return set.has('') ? [...withTime, ''] : withTime
  }, [states, blocks])

  const cellAt = (time: string, court: string) => {
    for (const s of states) {
      const m = orderMatches(s.matches).find(
        x => (x.start_time || '') === time && x.court && courtLabel(s, x.court) === court)
      if (m) return { state: s, match: m }
    }
    return null
  }

  return (
    <div ref={ref} className="-mx-4 overflow-x-auto [&::-webkit-scrollbar]:hidden"
         style={{ scrollbarWidth: 'none' }}>
      <div
        className="grid gap-x-3 gap-y-3 px-4 pb-4"
        style={{ gridTemplateColumns: `${TIME_W}px repeat(${columns.length}, minmax(${COL_MIN}px, 1fr))` }}
      >
        {/* heading row */}
        <div className="sticky left-0 top-14 z-30 bg-background" style={{ width: TIME_W }} />
        {columns.map(c => (
          <div key={c.key} ref={el => registerCol(c.key, el)}
               className="sticky top-14 z-20 truncate border-b bg-background/95 pb-2 pt-1
                          text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
            {c.label}
          </div>
        ))}

        {/* one row per distinct start time */}
        {times.map(time => {
          const spanning = blocks.filter(b => (b.start_time || '') === time && (!b.court || b.court === 'ALL'))
          const [hhmm, ap] = splitTime(time)
          return (
            <div key={time || 'tbd'} className="contents">
              <div className="sticky left-0 z-10 flex flex-col items-end bg-background pt-1.5 text-right"
                   style={{ width: TIME_W }}>
                <span className="font-mono text-[11px] leading-tight tabular-nums text-muted-foreground">{hhmm}</span>
                {ap && <span className="font-mono text-[9px] leading-tight text-muted-foreground/70">{ap}</span>}
              </div>

              {spanning.length > 0 ? (
                <div style={{ gridColumn: `2 / span ${columns.length}` }} className="space-y-2">
                  {spanning.map(b => <BlockCell key={b.id} block={b} wide />)}
                </div>
              ) : (
                columns.map(c => {
                  const hit = cellAt(time, c.key)
                  const blk = blocks.find(b => (b.start_time || '') === time && b.court === c.key)
                  return (
                    <div key={c.key} className="min-w-0">
                      {hit ? (
                        <MatchCell state={hit.state} match={hit.match}
                                   number={numsFor.get(hit.state)![hit.match.id]}
                                   onSelect={id => onSelect(hit.state, id)} />
                      ) : blk ? (
                        <BlockCell block={blk} />
                      ) : (
                        <div className="h-full min-h-10 rounded-xl border border-dashed border-border/40" />
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
