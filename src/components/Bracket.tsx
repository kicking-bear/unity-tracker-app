import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fmtTime, matchNumbers, orderMatches, sideOf, sortStages, standings, tally, winnerOf } from '@/lib/tournament'
import type { Match, Stage, TournamentState } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const COL = 'w-[calc(100vw-4.5rem)] max-w-[22rem] shrink-0 snap-start sm:w-72'
const GAP = 40 // px between columns; connector SVG lives in this gap

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  )
}

/** Black chip with the pulsing dot — same signal everywhere. */
export function LiveChip({ className, label = 'Live' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-2 py-0.5',
      'text-[10px] font-semibold uppercase tracking-wide text-white', className)}>
      <LiveDot /> {label}
    </span>
  )
}

/** Header gradient across team colours, darkened for legibility. */
const gradient = (colors: (string | null | undefined)[]) => {
  const cs = colors.map(c => c || '#3A3F47')
  const stops = cs.length === 1 ? [cs[0], cs[0]] : cs
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export function CardHeader({ colors, left, right, live, className }: {
  colors: (string | null | undefined)[]; left: React.ReactNode
  right?: React.ReactNode; live?: boolean; className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden', className ?? 'rounded-t-xl')} style={{ background: gradient(colors) }}>
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative flex items-center gap-2 px-3 py-2 text-xs text-white">
        <span className="truncate font-semibold">{left}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-white/85">
          {live && <LiveChip />}{right}
        </span>
      </div>
    </div>
  )
}

/**
 * One side of a match: name, that side's per-set points, then sets won.
 * The set a side took is emphasised, so "21 15" reads as won-then-lost.
 */
function Side({ s, sets, points, wonSet, isWin, big, played }: {
  s: ReturnType<typeof sideOf>; sets: number | string
  points: number[]; wonSet: boolean[]; isWin: boolean; big?: boolean; played: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="inline-block h-5 w-1 shrink-0 rounded-sm"
            style={{ background: s.team?.color ?? 'var(--border)' }} />
      <span className={cn('min-w-0 flex-1 truncate leading-tight', big ? 'text-lg' : 'text-sm',
        isWin ? 'font-semibold' : 'text-muted-foreground', !s.team && 'font-normal italic')}>
        {s.team?.name ?? s.label}
      </span>
      {played && points.length > 0 && (
        <span className="flex shrink-0 items-baseline gap-1.5">
          {points.map((p, i) => (
            <span key={i} className={cn('font-mono tabular-nums',
              wonSet[i] ? 'text-sm font-semibold text-foreground' : 'text-xs text-muted-foreground')}>
              {p}
            </span>
          ))}
        </span>
      )}
      <span className={cn('w-5 shrink-0 text-right font-mono tabular-nums',
        big ? 'text-2xl' : 'text-lg',
        isWin ? 'font-semibold' : 'text-muted-foreground')}>{sets}</span>
    </div>
  )
}

export function MatchCard({ state, match, number, onSelect, big, muted }: {
  state: TournamentState; match: Match; number: string
  onSelect: (id: string) => void; big?: boolean; muted?: boolean
}) {
  const A = sideOf(state, match, 'a'), B = sideOf(state, match, 'b')
  const t = tally(match), w = winnerOf(state, match)
  const pa = match.periods.map(p => p.score_a)
  const pb = match.periods.map(p => p.score_b)
  const wonA = match.periods.map(p => p.score_a > p.score_b)
  const wonB = match.periods.map(p => p.score_b > p.score_a)
  return (
    <button type="button" onClick={() => onSelect(match.id)} data-match
      className={cn('w-full overflow-hidden rounded-xl border bg-card text-left transition',
        'hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        muted && 'opacity-70')}>
      <CardHeader colors={[A.team?.color, B.team?.color]} left={number} live={match.status === 'live'}
        right={match.status === 'final' ? 'Final' : match.status === 'live' ? null : fmtTime(match.start_time)} />
      <div className="divide-y">
        <Side s={A} sets={t.played ? t.a : '–'} points={pa} wonSet={wonA} played={t.played}
              isWin={!!w && w === A.team?.id} big={big} />
        <Side s={B} sets={t.played ? t.b : '–'} points={pb} wonSet={wonB} played={t.played}
              isWin={!!w && w === B.team?.id} big={big} />
      </div>
      {match.court && <div className="px-3 pb-2 pt-1 text-[11px] text-muted-foreground">{match.court}</div>}
    </button>
  )
}

function PoolCard({ state, stage, onOpenPool }: {
  state: TournamentState; stage: Stage; onOpenPool: (id: string) => void
}) {
  const rows = standings(state, stage.id)
  const ms = orderMatches(state.matches.filter(m => m.stage_id === stage.id))
  const done = ms.filter(m => m.status === 'final').length
  return (
    <button type="button" onClick={() => onOpenPool(stage.id)}
      className="w-full overflow-hidden rounded-xl border bg-card text-left transition hover:border-foreground/40
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <CardHeader colors={rows.map(r => r.team.color)} left={stage.name}
        live={ms.some(m => m.status === 'live')}
        right={<span className="font-mono">{done}/{ms.length}</span>} />
      <div className="flex items-center gap-2.5 border-b px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="w-4" /><span className="w-1" />
        <span className="flex-1">Team</span>
        <span className="w-5 text-right">P</span>
        <span className="w-8 text-right">W–L</span>
        <span className="w-9 text-right">Sets</span>
        <span className="w-8 text-right">PD</span>
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
              <span className="w-5 text-right font-mono text-xs tabular-nums text-muted-foreground">{r.p}</span>
              <span className="w-8 text-right font-mono text-xs tabular-nums">{r.w}–{r.l}</span>
              <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">{r.sw}–{r.sl}</span>
              <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {pd > 0 ? '+' : ''}{pd}
              </span>
            </div>
          )
        })}
      </div>
      <div className="px-3 pb-2.5 pt-1.5 text-[11px] text-muted-foreground">Tap to see the {ms.length} matches</div>
    </button>
  )
}

/**
 * Elbow connectors drawn in the gap to the right of a column: a stub from each
 * card's centre, a vertical spine joining them, and one stub into the next column.
 * Only drawn when the next column has half as many matches (a true bracket step).
 */
function Connectors({ colRef, count }: { colRef: React.RefObject<HTMLDivElement | null>; count: number }) {
  const [ys, setYs] = useState<number[]>([])
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    const el = colRef.current
    if (!el) return
    const measure = () => {
      const top = el.getBoundingClientRect().top
      const cards = [...el.querySelectorAll<HTMLElement>('[data-match]')]
      setYs(cards.map(c => { const r = c.getBoundingClientRect(); return r.top - top + r.height / 2 }))
      setH(el.getBoundingClientRect().height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [colRef, count])
  if (ys.length < 2) return null
  const mid = GAP / 2
  const yMid = (ys[0] + ys[ys.length - 1]) / 2
  return (
    <svg className="pointer-events-none absolute top-0" style={{ left: '100%', width: GAP, height: h }}
         aria-hidden="true">
      <g stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="1.5" fill="none" strokeLinecap="round">
        {ys.map((y, i) => <path key={i} d={`M0 ${y} H${mid}`} />)}
        <path d={`M${mid} ${ys[0]} V${ys[ys.length - 1]}`} />
        <path d={`M${mid} ${yMid} H${GAP}`} />
      </g>
    </svg>
  )
}

export interface BracketColumn { key: string; label: string; stages: Stage[]; minor?: Stage[] }

export function bracketColumns(state: TournamentState): BracketColumn[] {
  const stages = sortStages(state.stages)
  const pools = stages.filter(s => s.type === 'pool')
  const ko = stages.filter(s => s.type === 'knockout')
  const isPlacement = (s: Stage) => /third|fourth|fifth|place|consolation/i.test(s.name)
  const isFinal = (s: Stage) => /^(the )?finals?$/i.test(s.name.trim())
  const final = ko.filter(s => !isPlacement(s)).find(isFinal)
    ?? ko.filter(s => !isPlacement(s)).at(-1) ?? null
  const cols: BracketColumn[] = []
  if (pools.length) cols.push({ key: 'pools', label: 'Pool play', stages: pools })
  ko.filter(s => !isPlacement(s) && s.id !== final?.id)
    .forEach(s => cols.push({ key: s.id, label: s.name, stages: [s] }))
  if (final) cols.push({ key: final.id, label: final.name, stages: [final], minor: ko.filter(isPlacement) })
  return cols
}

function Column({ state, col, next, liveStage, onSelect, onOpenPool, registerCol, fullscreen, nums }: {
  state: TournamentState; col: BracketColumn; next?: BracketColumn; liveStage: string | null
  onSelect: (id: string) => void; onOpenPool: (id: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void; fullscreen?: boolean
  nums: Record<string, string>
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { registerCol(col.key, ref.current) }, [col.key, registerCol])
  const live = col.stages.some(s => s.id === liveStage)
  const mine = col.stages.flatMap(s => state.matches.filter(m => m.stage_id === s.id))
  const theirs = next ? next.stages.flatMap(s => state.matches.filter(m => m.stage_id === s.id)) : []
  const isPool = col.stages[0]?.type === 'pool'
  const drawConn = !isPool && !!next && mine.length >= 2 &&
    (theirs.length * 2 === mine.length || theirs.length === mine.length)

  return (
    <div ref={ref} className={cn('relative', COL, fullscreen && 'w-[26rem] max-w-none')}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {col.label}{live && <LiveDot />}
      </p>
      <div className="flex flex-col gap-3">
        {col.stages.map(stage => stage.type === 'pool'
          ? <PoolCard key={stage.id} state={state} stage={stage} onOpenPool={onOpenPool} />
          : orderMatches(state.matches.filter(m => m.stage_id === stage.id)).map(m =>
              <MatchCard key={m.id} state={state} match={m} number={nums[m.id]} onSelect={onSelect} big={fullscreen} />))}
        {col.minor && col.minor.length > 0 && (
          <div className="mt-1 space-y-2 border-t pt-3">
            {col.minor.map(stage => orderMatches(state.matches.filter(m => m.stage_id === stage.id)).map(m =>
              <MatchCard key={m.id} state={state} match={m} number={nums[m.id]} onSelect={onSelect} muted />))}
          </div>
        )}
      </div>
      {drawConn && <Connectors colRef={ref} count={mine.length} />}
    </div>
  )
}

const Bracket = forwardRef<HTMLDivElement, {
  state: TournamentState; columns: BracketColumn[]; liveStage: string | null
  onSelect: (id: string) => void; onOpenPool: (id: string) => void
  registerCol: (key: string, el: HTMLDivElement | null) => void; fullscreen?: boolean
}>(({ state, columns, liveStage, onSelect, onOpenPool, registerCol, fullscreen }, ref) => {
  const nums = matchNumbers(state)
  return (
    <div ref={ref}
      className={cn('-mx-4 snap-x snap-proximity scroll-pl-4 overflow-x-auto scroll-smooth',
        '[&::-webkit-scrollbar]:hidden', fullscreen && 'h-full')}
      style={{ scrollbarWidth: 'none' }}>
      <div className={cn('flex w-max px-4 pb-4', fullscreen && 'h-full items-center px-8')} style={{ gap: GAP }}>
        {columns.map((col, i) => (
          <Column key={col.key} state={state} col={col} next={columns[i + 1]} liveStage={liveStage}
                  onSelect={onSelect} onOpenPool={onOpenPool} registerCol={registerCol}
                  fullscreen={fullscreen} nums={nums} />
        ))}
      </div>
    </div>
  )
})
Bracket.displayName = 'Bracket'
export default Bracket
