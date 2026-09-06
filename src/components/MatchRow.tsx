import { Link } from 'react-router-dom'
import { sideOf, stageById, tally, teamById, winnerOf } from '@/lib/tournament'
import type { Match, TournamentState } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function MatchRow({
  state, match, slug, number,
}: { state: TournamentState; match: Match; slug: string; number?: number }) {
  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(state, match)
  const stage = stageById(state, match.stage_id)
  const ref = teamById(state, match.ref_team)
  const line = teamById(state, match.line_team)

  const Side = ({ s, score, isWin }: { s: typeof A; score: number | string; isWin: boolean }) => (
    <div className="flex items-center gap-2 py-0.5">
      <span className="inline-block h-4 w-1 shrink-0 rounded-sm"
            style={{ background: s.team?.color ?? 'var(--border)' }} />
      <span className={cn('truncate text-sm leading-tight',
        isWin ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
        !s.team && 'font-normal italic text-muted-foreground')}>
        {s.team?.name ?? s.label}
      </span>
      <span className={cn('ml-auto font-mono text-lg tabular-nums',
        isWin ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
        {score}
      </span>
    </div>
  )

  return (
    <Link to={`/t/${slug}/m/${match.id}`}>
      <Card className="gap-0 p-3 transition hover:border-foreground/30">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {number != null && (
            <span className="font-mono text-xs font-medium text-foreground">#{number}</span>
          )}
          <Badge variant="outline" className="text-[10px] font-normal">
            {match.label ?? stage?.name}
          </Badge>
          {match.court && <Badge variant="outline" className="text-[10px] font-normal">{match.court}</Badge>}
          {match.start_time && <span>{match.start_time}</span>}
          <Badge
            variant={match.status === 'live' ? 'default' : 'secondary'}
            className={cn('ml-auto text-[10px] font-normal capitalize',
              match.status === 'scheduled' && 'bg-transparent text-muted-foreground')}
          >
            {match.status === 'final' ? 'Final' : match.status === 'live' ? 'Live' : 'Scheduled'}
          </Badge>
        </div>
        <Side s={A} score={t.played ? t.a : '–'} isWin={!!w && w === A.team?.id} />
        <Side s={B} score={t.played ? t.b : '–'} isWin={!!w && w === B.team?.id} />
        {t.played && (
          <div className="mt-2 border-t pt-2 font-mono text-xs tabular-nums text-muted-foreground">
            {match.periods.map(p => `${p.score_a}–${p.score_b}`).join('   ·   ')}
          </div>
        )}
        {(ref || line) && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            Ref {ref?.name ?? '—'} · Lines {line?.name ?? '—'}
          </div>
        )}
      </Card>
    </Link>
  )
}
