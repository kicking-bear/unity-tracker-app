import { Link } from 'react-router-dom'
import { matchNumbers, sideOf, tally, winnerOf } from '@/lib/tournament'
import type { Match, Stage, TournamentState } from '@/lib/types'
import { cn } from '@/lib/utils'

function Slot({
  side, score, isWin,
}: { side: ReturnType<typeof sideOf>; score: number | string; isWin: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5">
      <span className="inline-block h-3.5 w-1 shrink-0 rounded-sm"
            style={{ background: side.team?.color ?? 'var(--border)' }} />
      <span className={cn('truncate text-xs leading-tight',
        isWin ? 'font-semibold text-foreground' : 'text-muted-foreground',
        !side.team && 'italic')}>
        {side.team?.name ?? side.label}
      </span>
      <span className={cn('ml-auto font-mono text-xs tabular-nums',
        isWin ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
        {score}
      </span>
    </div>
  )
}

function BracketMatch({
  state, match, slug, number,
}: { state: TournamentState; match: Match; slug: string; number: number }) {
  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(state, match)
  return (
    <Link to={`/t/${slug}/m/${match.id}`}
          className="block rounded-lg border bg-card transition hover:border-foreground/30">
      <div className="flex items-center gap-2 px-2.5 pt-1.5 text-[10px] text-muted-foreground">
        <span className="font-mono font-medium text-foreground">#{number}</span>
        <span className="truncate">{match.label}</span>
        {match.start_time && <span className="ml-auto shrink-0">{match.start_time}</span>}
      </div>
      <div className="divide-y">
        <Slot side={A} score={t.played ? t.a : '–'} isWin={!!w && w === A.team?.id} />
        <Slot side={B} score={t.played ? t.b : '–'} isWin={!!w && w === B.team?.id} />
      </div>
    </Link>
  )
}

export default function Bracket({
  state, slug, stages,
}: { state: TournamentState; slug: string; stages: Stage[] }) {
  const nums = matchNumbers(state)
  const cols = stages
    .map(s => ({ stage: s, matches: state.matches.filter(m => m.stage_id === s.id) }))
    .filter(c => c.matches.length > 0)

  if (!cols.length) return null

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex min-w-max gap-4">
        {cols.map(({ stage, matches }) => (
          <div key={stage.id} className="w-56 shrink-0 space-y-2">
            <p className="sticky top-0 pb-1 text-xs font-medium text-muted-foreground">
              {stage.name}
            </p>
            <div className="flex flex-col justify-around gap-3" style={{ minHeight: '100%' }}>
              {matches.map(m => (
                <BracketMatch key={m.id} state={state} match={m} slug={slug} number={nums[m.id]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
