import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTournament } from '@/lib/useTournament'
import { sortStages, standings, stageComplete } from '@/lib/tournament'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MatchRow from '@/components/MatchRow'

export default function TournamentPage() {
  const { slug } = useParams()
  const { state, error } = useTournament(slug)
  const [stageId, setStageId] = useState<string | null>(null)

  const stages = state ? sortStages(state.stages) : []
  useEffect(() => {
    if (!state || stageId) return
    const firstOpen = stages.find(s => s.type === 'pool' && !stageComplete(state, s.id))
    setStageId((firstOpen ?? stages[0])?.id ?? null)
  }, [state, stageId, stages])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!state?.tournament) return <p className="text-sm text-muted-foreground">Loading…</p>

  const stage = stages.find(s => s.id === stageId) ?? stages[0]
  const matches = state.matches.filter(m => m.stage_id === stage?.id)
  const rows = stage?.type === 'pool' ? standings(state, stage.id) : []

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          {state.event?.name}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {state.tournament.name}
        </h1>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {stages.map(s => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === stage?.id ? 'default' : 'outline'}
            className="shrink-0 rounded-full "
            onClick={() => setStageId(s.id)}
          >
            {s.name}
          </Button>
        ))}
      </div>

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
                      <span
                        className="mr-2 inline-block size-2.5 rounded-sm align-middle"
                        style={{ background: r.team.color ?? 'var(--muted-foreground)' }}
                      />
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
        {matches.length
          ? matches.map(m => <MatchRow key={m.id} state={state} match={m} slug={slug!} />)
          : <p className="text-sm text-muted-foreground">Not scheduled yet.</p>}
      </div>
    </div>
  )
}
