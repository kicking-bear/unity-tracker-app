import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTournament } from '@/lib/useTournament'
import { sideOf, stageById, tally, teamById, winnerOf } from '@/lib/tournament'
import { useRoleContext } from '@/lib/roleContext'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function MatchPage() {
  const { slug, matchId } = useParams()
  const { state, reload } = useTournament(slug)
  const { isStaff } = useRoleContext()
  const [scores, setScores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!state?.tournament) return <p className="text-sm text-muted-foreground">Loading…</p>
  const match = state.matches.find(m => m.id === matchId)
  if (!match) return <p className="text-sm text-muted-foreground">Match not found.</p>

  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(match)
  const stage = stageById(state, match.stage_id)
  const ref = teamById(state, match.ref_team)
  const line = teamById(state, match.line_team)

  const val = (i: number, side: 'a' | 'b') =>
    scores[`${side}${i}`] ?? String(match.periods[i]?.[side === 'a' ? 'score_a' : 'score_b'] ?? '')

  async function save(status: 'final' | 'live') {
    setBusy(true); setMsg('')
    const periods: { a: number; b: number }[] = []
    for (let i = 0; i < match!.best_of; i++) {
      const a = val(i, 'a'), b = val(i, 'b')
      if (a === '' && b === '') continue
      periods.push({ a: Number(a) || 0, b: Number(b) || 0 })
    }
    if (!periods.length) { setMsg('Enter at least one set.'); setBusy(false); return }
    try {
      await api.saveScore({ match_id: match!.id, periods, version: match!.version, status })
      setMsg('Saved.'); setScores({}); await reload()
    } catch (e) {
      const err = e as Error & { status?: number }
      setMsg(err.status === 409 ? 'Someone else updated this match — reloading.' : `Save failed: ${err.message}`)
      if (err.status === 409) await reload()
    }
    setBusy(false)
  }

  const TeamCol = ({ s, score, isWin }: { s: typeof A; score: number | string; isWin: boolean }) => (
    <div className="text-center">
      <div className="mx-auto mb-2 h-1 w-full max-w-24 rounded-full"
           style={{ background: s.team?.color ?? 'var(--border)' }} />
      <div className="text-base font-medium leading-tight">
        {s.team?.name ?? s.label}
      </div>
      <div className={cn('font-mono text-4xl tabular-nums',
        isWin ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground')}>{score}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={`/t/${slug}`}><ArrowLeft className="mr-1 size-4" />Back</Link>
      </Button>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-normal">{match.label ?? stage?.name}</Badge>
            {match.court && <Badge variant="outline" className="text-[10px]">{match.court}</Badge>}
            {match.start_time && <span>{match.start_time}</span>}
            <span className="ml-auto text-[10px] capitalize">{match.status}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <TeamCol s={A} score={t.played ? t.a : '–'} isWin={!!w && w === A.team?.id} />
            <div className="text-center text-xs text-muted-foreground">
              best of {match.best_of}<br />to {match.target}
            </div>
            <TeamCol s={B} score={t.played ? t.b : '–'} isWin={!!w && w === B.team?.id} />
          </div>

          {match.periods.map(p => (
            <div key={p.id} className="flex items-center gap-3 border-t pt-2 text-sm">
              <span className="w-14 text-xs text-muted-foreground">Set {p.no}</span>
              <span className={cn('font-mono tabular-nums',
                p.score_a > p.score_b ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{p.score_a}</span>
              <span className="text-muted-foreground">–</span>
              <span className={cn('font-mono tabular-nums',
                p.score_b > p.score_a ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{p.score_b}</span>
            </div>
          ))}

          {(ref || line) && (
            <p className="text-xs text-muted-foreground">
              Ref {ref?.name ?? '—'} · Lines {line?.name ?? '—'}
            </p>
          )}
        </CardContent>
      </Card>

      {isStaff && A.team && B.team && (
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Enter score</h2>
            {Array.from({ length: match.best_of }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-muted-foreground">Set {i + 1}</span>
                <Input type="number" inputMode="numeric" className="w-20 text-center font-mono text-lg"
                  value={val(i, 'a')} onChange={e => setScores(s => ({ ...s, [`a${i}`]: e.target.value }))} />
                <Input type="number" inputMode="numeric" className="w-20 text-center font-mono text-lg"
                  value={val(i, 'b')} onChange={e => setScores(s => ({ ...s, [`b${i}`]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button onClick={() => save('final')} disabled={busy}>Save as final</Button>
              <Button variant="outline" onClick={() => save('live')} disabled={busy}>Save in progress</Button>
            </div>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </CardContent>
        </Card>
      )}

      {[A, B].map(s => s.team && (
        <div key={s.team.id}>
          <h2 className="mb-2 border-b pb-1 text-base font-semibold tracking-tight">
            {s.team.name}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {s.team.players.length} players
            </span>
          </h2>
          <Card><CardContent className="py-3">
            {s.team.players.map(p => (
              <div key={p.id} className="py-0.5 text-sm">{p.name}</div>
            ))}
          </CardContent></Card>
        </div>
      ))}
    </div>
  )
}
