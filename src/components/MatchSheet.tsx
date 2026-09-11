import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { fmtTime, sideOf, stageById, tally, tournamentComplete, winnerOf } from '@/lib/tournament'
import type { TournamentState } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { cn } from '@/lib/utils'
import SheetShell from '@/components/SheetShell'
import { LiveChip } from '@/components/Bracket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const RED = 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'

export default function MatchSheet({
  state, matchId, number, onClose, onChanged,
}: {
  state: TournamentState
  matchId: string | null
  number?: string
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const { isStaff, isAdmin } = useRoleContext()
  const match = state.matches.find(m => m.id === matchId) ?? null
  const [scores, setScores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => { setScores({}) }, [matchId])

  if (!match) return <SheetShell open={false} onClose={onClose} colors={[]} title="">{null}</SheetShell>

  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(state, match)
  const stage = stageById(state, match.stage_id)
  const canScore = isStaff && !!A.team && !!B.team
  const started = state.matches.some(m => m.status !== 'scheduled')

  const refOptions = (() => {
    const playing = new Set([A.team?.id, B.team?.id].filter(Boolean) as string[])
    const names = state.teams.filter(x => !playing.has(x.id)).map(x => x.name)
    if (match.ref_name && !names.includes(match.ref_name)) names.unshift(match.ref_name)
    return names
  })()

  const val = (i: number, side: 'a' | 'b') =>
    scores[`${side}${i}`] ?? String(match.periods[i]?.[side === 'a' ? 'score_a' : 'score_b'] ?? '')

  async function save(status: 'final' | 'live') {
    if (!match) return
    setBusy(true)
    const periods: { a: number; b: number }[] = []
    for (let i = 0; i < match.best_of; i++) {
      const a = val(i, 'a'), b = val(i, 'b')
      if (a === '' && b === '') continue
      periods.push({ a: Number(a) || 0, b: Number(b) || 0 })
    }
    if (!periods.length) { toast.error('Enter at least one set'); setBusy(false); return }
    try {
      await api.saveScore({ match_id: match.id, periods, version: match.version, status })
      setScores({}); await onChanged()
      toast.success(status === 'final' ? 'Saved as final' : 'Saved in progress')
    } catch (e) {
      const err = e as Error & { status?: number }
      toast.error(err.status === 409
        ? 'Someone else updated this match — reloaded'
        : `Save failed: ${err.message}`)
      await onChanged()
    }
    setBusy(false)
  }

  async function patch(fields: Record<string, unknown>) {
    if (!match) return
    try { await api.patchMatch(match.id, fields); await onChanged(); toast.success('Match updated') }
    catch (e) { toast.error(`Update failed: ${(e as Error).message}`) }
  }

  return (
    <SheetShell
      open={!!matchId}
      onClose={onClose}
      colors={[A.team?.color, B.team?.color]}
      title={number ?? match.label ?? stage?.name}
      subtitle={[stage?.name, match.court, fmtTime(match.start_time)].filter(Boolean).join(' · ')}
      badge={match.status === 'live'
        ? <LiveChip />
        : match.status === 'final'
          ? <Badge className="bg-white/20 text-[10px] font-semibold text-white hover:bg-white/20">Final</Badge>
          : null}
    >
      {/* scoreboard */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-center">
          <div className="mx-auto mb-2 h-1.5 w-full max-w-28 rounded-full"
               style={{ background: A.team?.color ?? 'var(--border)' }} />
          <div className={cn('truncate text-lg font-semibold leading-tight',
            !A.team && 'text-base font-normal italic text-muted-foreground')}>
            {A.team?.name ?? A.label}
          </div>
          <div className={cn('font-mono text-5xl tabular-nums',
            w && w === A.team?.id ? 'font-semibold' : 'font-normal text-muted-foreground')}>
            {t.played ? t.a : '–'}
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          best of {match.best_of}<br />to {match.target}
        </div>
        <div className="min-w-0 text-center">
          <div className="mx-auto mb-2 h-1.5 w-full max-w-28 rounded-full"
               style={{ background: B.team?.color ?? 'var(--border)' }} />
          <div className={cn('truncate text-lg font-semibold leading-tight',
            !B.team && 'text-base font-normal italic text-muted-foreground')}>
            {B.team?.name ?? B.label}
          </div>
          <div className={cn('font-mono text-5xl tabular-nums',
            w && w === B.team?.id ? 'font-semibold' : 'font-normal text-muted-foreground')}>
            {t.played ? t.b : '–'}
          </div>
        </div>
      </div>

      {match.periods.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {match.periods.map(p => (
            <div key={p.id} className="flex items-center gap-4 text-base">
              <span className="w-14 text-sm text-muted-foreground">Set {p.no}</span>
              <span className={cn('font-mono tabular-nums',
                p.score_a > p.score_b ? 'font-semibold' : 'text-muted-foreground')}>{p.score_a}</span>
              <span className="text-muted-foreground">–</span>
              <span className={cn('font-mono tabular-nums',
                p.score_b > p.score_a ? 'font-semibold' : 'text-muted-foreground')}>{p.score_b}</span>
            </div>
          ))}
        </div>
      )}

      {match.ref_name && (
        <p className="mt-3 text-sm text-muted-foreground">
          Refereed by <span className="text-foreground">{match.ref_name}</span>
        </p>
      )}

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
            <Button size="lg" variant="outline" className="flex-1" onClick={() => save('live')} disabled={busy}>
              Save in progress
            </Button>
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <Separator className="my-5" />
          <h3 className="text-base font-semibold">Match setup</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mt-time">Start time</Label>
              <Input id="mt-time" type="time" defaultValue={match.start_time ?? ''} className="w-full"
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
                  {[1, 2, 3, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? '1 set' : `Best of ${n}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Points to</Label>
              <Input type="number" min={1} defaultValue={match.target}
                onBlur={e => Number(e.target.value) !== match.target && patch({ target: Number(e.target.value) || 25 })} />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
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

          <div className="mt-3 space-y-1.5">
            <Label>Referee</Label>
            <Select value={match.ref_name ?? 'none'}
                    onValueChange={v => patch({ ref_name: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Not assigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {refOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The refereeing team also supplies the line judges.
            </p>
          </div>
        </>
      )}

      {[A, B].some(s => s.team) && (
        <>
          <Separator className="my-5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[A, B].map((s, k) => s.team && (
              <div key={k}>
                <p className="mb-1.5 text-sm font-medium">
                  {s.team.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{s.team.players.length}</span>
                </p>
                {s.team.players.map(p => (
                  <p key={p.id} className="py-0.5 text-sm text-muted-foreground">{p.name}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* destructive actions last, and only before the tournament is under way */}
      {isAdmin && !started && !tournamentComplete(state) && (
        <>
          <Separator className="my-5" />
          <div className="rounded-lg border border-red-600/40 p-3">
            <p className="mb-1 text-sm font-medium">Remove this match</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Only possible before any score has been entered.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className={RED}>Delete match</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {match.label ?? 'this match'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anything that feeds off its result will show TBD. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className={RED} onClick={async () => {
                    try { await api.deleteMatch(match.id); onClose(); await onChanged(); toast.success('Match deleted') }
                    catch (e) { toast.error((e as Error).message) }
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </SheetShell>
  )
}
