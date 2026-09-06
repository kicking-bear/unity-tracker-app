import { useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTournament } from '@/lib/useTournament'
import { matchNumbers, sortStages, standings } from '@/lib/tournament'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MatchRow from '@/components/MatchRow'
import Bracket from '@/components/Bracket'

export default function TournamentPage() {
  const { slug } = useParams()
  const { state, error } = useTournament(slug)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  const stages = useMemo(() => (state ? sortStages(state.stages) : []), [state])
  const pools = stages.filter(s => s.type === 'pool')
  const knockout = stages.filter(s => s.type === 'knockout')

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!state?.tournament) return <p className="text-sm text-muted-foreground">Loading…</p>

  const nums = matchNumbers(state)
  const jump = (id: string) =>
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          {state.event?.name}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-2xl font-semibold tracking-tight">{state.tournament.name}</h1>
      </div>

      {/* stage rail — jumps to a section, does not hide the rest */}
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto">
          {pools.length > 0 && (
            <Button variant="ghost" size="sm" className="shrink-0 rounded-full"
                    onClick={() => jump('pools')}>Pools</Button>
          )}
          {knockout.map(s => (
            <Button key={s.id} variant="ghost" size="sm" className="shrink-0 rounded-full"
                    onClick={() => jump(s.id)}>{s.name}</Button>
          ))}
        </div>
      </div>

      {/* pools */}
      {pools.length > 0 && (
        <section ref={el => { refs.current['pools'] = el }} className="scroll-mt-28 space-y-5">
          {pools.map(pool => {
            const rows = standings(state, pool.id)
            const matches = state.matches.filter(m => m.stage_id === pool.id)
            return (
              <div key={pool.id} className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight">{pool.name}</h2>
                {rows.length > 0 && (
                  <Card className="overflow-hidden p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>Team</TableHead>
                          <TableHead className="text-right">W</TableHead>
                          <TableHead className="text-right">L</TableHead>
                          <TableHead className="text-right">Sets</TableHead>
                          <TableHead className="text-right">PD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => {
                          const pd = r.pf - r.pa
                          return (
                            <TableRow key={r.team.id} className={i < 2 ? 'bg-muted/40' : undefined}>
                              <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                <span className="mr-2 inline-block size-2.5 rounded-sm align-middle"
                                      style={{ background: r.team.color ?? 'var(--muted-foreground)' }} />
                                {r.team.name}
                                {r.tied && <Badge variant="secondary" className="ml-2 text-[10px]">tie</Badge>}
                              </TableCell>
                              <TableCell className="text-right font-mono">{r.w}</TableCell>
                              <TableCell className="text-right font-mono">{r.l}</TableCell>
                              <TableCell className="text-right font-mono">{r.sw}–{r.sl}</TableCell>
                              <TableCell className="text-right font-mono">{pd > 0 ? '+' : ''}{pd}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
                <div className="space-y-2">
                  {matches.map(m => (
                    <MatchRow key={m.id} state={state} match={m} slug={slug!} number={nums[m.id]} />
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* knockout — one continuous bracket */}
      {knockout.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Bracket</h2>
          <Bracket state={state} slug={slug!} stages={knockout} />
          {/* anchors so the rail can jump to a round */}
          {knockout.map(s => (
            <div key={s.id} ref={el => { refs.current[s.id] = el }} className="scroll-mt-28" />
          ))}
        </section>
      )}
    </div>
  )
}
