import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { fmtTime, sideOf, stageById, tally, teamById, winnerOf } from '@/lib/tournament'
import type { Match, TournamentState } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function MatchSheet({
  state, matchId, number, onClose, onChanged,
}: {
  state: TournamentState
  matchId: string | null
  number?: number
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const { isStaff, isAdmin } = useRoleContext()
  const match = state.matches.find(m => m.id === matchId) ?? null
  const [scores, setScores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { setScores({}); setMsg('') }, [matchId])

  if (!match) return <Sheet open={false}><SheetContent /></Sheet>

  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(state, match)
  const stage = stageById(state, match.stage_id)
  const ref = teamById(state, match.ref_team)
  const line = teamById(state, match.line_team)
  const canScore = isStaff && !!A.team && !!B.team

  const val = (i: number, side: 'a' | 'b') =>
    scores[`${side}${i}`] ?? String(match.periods[i]?.[side === 'a' ? 'score_a' : 'score_b'] ?? '')

  async function save(status: 'final' | 'live') {
    if (!match) return
    setBusy(true); setMsg('')
    const periods: { a: number; b: number }[] = []
    for (let i = 0; i < match.best_of; i++) {
      const a = val(i, 'a'), b = val(i, 'b')
      if (a === '' && b === '') continue
      periods.push({ a: Number(a) || 0, b: Number(b) || 0 })
    }
    if (!periods.length) { setMsg('Enter at least one set.'); setBusy(false); return }
    try {
      await api.saveScore({ match_id: match.id, periods, version: match.version, status })
      setScores({}); setMsg('Saved.'); await onChanged()
    } catch (e) {
      const err = e as Error & { status?: number }
      setMsg(err.status === 409 ? 'Someone else updated this match — reloaded.' : `Save failed: ${err.message}`)
      await onChanged()
    }
    setBusy(false)
  }

  async function patch(fields: Record<string, unknown>) {
    if (!match) return
    try { await api.patchMatch(match.id, fields); await onChanged() }
    catch (e) { setMsg(`Update failed: ${(e as Error).message}`) }
  }

  const teamOpts = state.teams.map(tm => ({ id: tm.id, name: tm.name }))

  return (
    <Sheet open={!!matchId} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8">
        <SheetHeader className="px-0 pt-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {number != null && <span className="font-mono font-medium text-foreground">#{number}</span>}
            <Badge variant="outline" className="font-normal">{match.label ?? stage?.name}</Badge>
            {match.court && <Badge variant="outline" className="font-normal">{match.court}</Badge>}
            {match.start_time && <span>{fmtTime(match.start_time)}</span>}
            <Badge variant={match.status === 'live' ? 'default' : 'secondary'}
                   className={cn('ml-auto font-normal', match.status === 'scheduled' && 'bg-transparent text-muted-foreground')}>
              {match.status === 'final' ? 'Final' : match.status === 'live' ? 'Live' : 'Scheduled'}
            </Badge>
          </div>
          <SheetTitle className="sr-only">Match detail</SheetTitle>
          <SheetDescription className="sr-only">Scores, sets and officials</SheetDescription>
        </SheetHeader>

        {/* scoreboard */}
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[A, B].map((s, k) => {
            const isWin = !!w && w === s.team?.id
            const score = t.played ? (k === 0 ? t.a : t.b) : '–'
            return (
              <div key={k} className="min-w-0 text-center">
                <div className="mx-auto mb-2 h-1.5 w-full max-w-28 rounded-full"
                     style={{ background: s.team?.color ?? 'var(--border)' }} />
                <div className={cn('truncate text-lg font-semibold leading-tight',
                  !s.team && 'text-base font-normal italic text-muted-foreground')}>
                  {s.team?.name ?? s.label}
                </div>
                <div className={cn('font-mono text-5xl tabular-nums',
                  isWin ? 'font-semibold' : 'font-normal text-muted-foreground')}>{score}</div>
              </div>
            )
          }).map((el, i) => (i === 1 ? [<div key="mid" className="text-center text-xs text-muted-foreground">best of {match.best_of}<br />to {match.target}</div>, el] : el))}
        </div>

        {match.periods.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {match.periods.map(p => (
              <div key={p.id} className="flex items-center gap-4 text-base">
                <span className="w-14 text-sm text-muted-foreground">Set {p.no}</span>
                <span className={cn('font-mono tabular-nums', p.score_a > p.score_b ? 'font-semibold' : 'text-muted-foreground')}>{p.score_a}</span>
                <span className="text-muted-foreground">–</span>
                <span className={cn('font-mono tabular-nums', p.score_b > p.score_a ? 'font-semibold' : 'text-muted-foreground')}>{p.score_b}</span>
              </div>
            ))}
          </div>
        )}

        {(ref || line) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Ref <span className="text-foreground">{ref?.name ?? '—'}</span>
            <span className="mx-2">·</span>
            Lines <span className="text-foreground">{line?.name ?? '—'}</span>
          </p>
        )}

        {/* score entry */}
        {canScore && (
          <>
            <Separator className="my-5" />
            <h3 className="text-base font-semibold">Enter score</h3>
            <div className="mt-3 flex items-end gap-3">
              <span className="flex-1" />
              {[A, B].map((s, k) => (
                <div key={k} className="w-24 space-y-1">
                  <div className="h-1 rounded-full" style={{ background: s.team?.color ?? 'var(--border)' }} />
                  <p className="truncate text-center text-xs text-muted-foreground">{s.team?.name}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-2">
              {Array.from({ length: match.best_of }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-muted-foreground">Set {i + 1}</span>
                  {(['a', 'b'] as const).map(side => (
                    <Input key={side} type="number" inputMode="numeric" min={0}
                      aria-label={`Set ${i + 1}, ${(side === 'a' ? A : B).team?.name}`}
                      className="h-14 w-24 border-t-2 text-center font-mono text-2xl tabular-nums"
                      style={{ borderTopColor: (side === 'a' ? A : B).team?.color ?? undefined }}
                      value={val(i, side)}
                      onChange={e => setScores(s => ({ ...s, [`${side}${i}`]: e.target.value }))} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="lg" className="flex-1" onClick={() => save('final')} disabled={busy}>Save as final</Button>
              <Button size="lg" variant="outline" className="flex-1" onClick={() => save('live')} disabled={busy}>Save in progress</Button>
            </div>
          </>
        )}
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}

        {/* admin: schedule + officials */}
        {isAdmin && (
          <>
            <Separator className="my-5" />
            <h3 className="text-base font-semibold">Match setup</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mt-time">Start time</Label>
                <Input id="mt-time" type="time" defaultValue={match.start_time ?? ''}
                  onBlur={e => e.target.value !== (match.start_time ?? '') && patch({ start_time: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mt-court">Court</Label>
                <Input id="mt-court" defaultValue={match.court ?? ''} placeholder="Court 1"
                  onBlur={e => e.target.value !== (match.court ?? '') && patch({ court: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sets</Label>
                <Select value={String(match.best_of)} onValueChange={v => patch({ best_of: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5].map(n => <SelectItem key={n} value={String(n)}>{n === 1 ? '1 set' : `Best of ${n}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={match.status} onValueChange={v => patch({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Referee</Label>
                <Select value={match.ref_team ?? 'none'} onValueChange={v => patch({ ref_team: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teamOpts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Line judges</Label>
                <Select value={match.line_team ?? 'none'} onValueChange={v => patch({ line_team: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teamOpts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* rosters */}
        {[A, B].some(s => s.team) && (
          <>
            <Separator className="my-5" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[A, B].map((s, k) => s.team && (
                <div key={k}>
                  <p className="mb-1.5 text-sm font-medium">{s.team.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{s.team.players.length}</span></p>
                  {s.team.players.map(p => <p key={p.id} className="py-0.5 text-sm text-muted-foreground">{p.name}</p>)}
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
