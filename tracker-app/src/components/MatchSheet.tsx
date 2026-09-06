import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { fmtTime, parseLines, serialiseLines, sideOf, stageById, tally, winnerOf } from '@/lib/tournament'
import type { Match, TournamentState } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CardHeader, LiveChip } from '@/components/Bracket'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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

  if (!match) return <Sheet open={false}><SheetContent /></Sheet>

  const A = sideOf(state, match, 'a')
  const B = sideOf(state, match, 'b')
  const t = tally(match)
  const w = winnerOf(state, match)
  const stage = stageById(state, match.stage_id)
  const lineJudges = parseLines(match.line_names)
  const canScore = isStaff && !!A.team && !!B.team

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
      setScores({}); await onChanged(); toast.success(status === 'final' ? 'Saved as final' : 'Saved in progress')
    } catch (e) {
      const err = e as Error & { status?: number }
      toast.error(err.status === 409 ? 'Someone else updated this match — reloaded' : `Save failed: ${err.message}`)
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
    <Sheet open={!!matchId} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8 md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85vh] md:w-[560px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:pb-6 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95">
        <SheetHeader className="-mx-5 shrink-0 px-0 pb-0 pt-0">
          <CardHeader className="rounded-none" colors={[A.team?.color, B.team?.color]}
            left={number ?? match.label ?? stage?.name}
            right={<span className="pr-10 text-white/85">{stage?.name}</span>}
            live={match.status === 'live'} />
          <SheetTitle className="sr-only">Match detail</SheetTitle>
          <SheetDescription className="sr-only">Scores, sets and officials</SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {match.court && <Badge variant="outline" className="font-normal">{match.court}</Badge>}
          {match.start_time && <span>{fmtTime(match.start_time)}</span>}
          {match.status !== 'live' && (
            <Badge variant="secondary" className={cn('font-normal',
              match.status === 'scheduled' && 'bg-transparent text-muted-foreground')}>
              {match.status === 'final' ? 'Final' : 'Scheduled'}
            </Badge>
          )}
        </div>

        {/* scoreboard */}
        <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3">
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
          <div className="mt-4 shrink-0 space-y-1.5">
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

        {(match.ref_name || lineJudges.length > 0) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {match.ref_name && <>Ref <span className="text-foreground">{match.ref_name}</span></>}
            {match.ref_name && lineJudges.length > 0 && <span className="mx-2">·</span>}
            {lineJudges.length > 0 && <>Lines <span className="text-foreground">{lineJudges.join(', ')}</span></>}
          </p>
        )}

        {/* score entry */}
        {canScore && (
          <>
            <Separator className="my-5 shrink-0" />
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

        {/* admin: schedule + officials */}
        {isAdmin && (
          <>
            <Separator className="my-5 shrink-0" />
            <h3 className="text-base font-semibold">Match setup</h3>
            <div className="mt-3 grid shrink-0 grid-cols-2 gap-3">
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
            </div>

            <div className="mt-3 space-y-1.5">
              <Label htmlFor="mt-ref">Referee</Label>
              <Input id="mt-ref" defaultValue={match.ref_name ?? ''} placeholder="Name"
                onBlur={e => e.target.value !== (match.ref_name ?? '') && patch({ ref_name: e.target.value || null })} />
            </div>

            <div className="mt-3 space-y-1.5">
              <Label>Line judges</Label>
              {[...lineJudges, ''].map((v, i) => (
                <Input key={i} defaultValue={v} placeholder={i === 0 ? 'Name' : 'Add another'}
                  onBlur={e => {
                    const next = [...lineJudges]
                    if (i < next.length) next[i] = e.target.value
                    else if (e.target.value.trim()) next.push(e.target.value)
                    else return
                    if (serialiseLines(next) !== serialiseLines(lineJudges))
                      patch({ line_names: serialiseLines(next) })
                  }} />
              ))}
              <p className="text-xs text-muted-foreground">Leave a name blank to remove it.</p>
            </div>

            <div className="mt-5 rounded-lg border border-destructive/40 p-3">
              <p className="mb-2 text-sm font-medium">Remove this match</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Use this for placement matches you are not playing, such as third place.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600">Delete match</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {match.label ?? 'this match'}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The match and any scores on it are removed. Anything that feeds off its
                      result will show TBD. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
                      onClick={async () => {
                        try { await api.deleteMatch(match.id); onClose(); await onChanged(); toast.success('Match deleted') }
                        catch (e) { toast.error((e as Error).message) }
                      }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {/* rosters */}
        {[A, B].some(s => s.team) && (
          <>
            <Separator className="my-5 shrink-0" />
            <div className="grid shrink-0 gap-4 sm:grid-cols-2">
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
