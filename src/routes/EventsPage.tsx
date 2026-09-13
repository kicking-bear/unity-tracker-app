import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, KeyRound, Pencil, Plus, Rows3 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { EventRow } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import StaffCodeRow from '@/components/StaffCodeRow'
import EventAdminDialog from '@/components/EventAdminDialog'
import { LiveChip } from '@/components/Bracket'

export default function EventsPage() {
  const { isAdmin } = useRoleContext()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [showCodes, setShowCodes] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadEvents = useCallback(
    () => api.events().then(d => setEvents(d.events)).catch(e => setErr((e as Error).message)), [])
  useEffect(() => { void loadEvents() }, [loadEvents])

  const loadCodes = useCallback(async () => {
    const d = await api.codes()
    setCodes(Object.fromEntries(d.events.map(e => [e.id, e.staff_code ?? ''])))
  }, [])
  useEffect(() => { if (isAdmin && showCodes) void loadCodes() }, [isAdmin, showCodes, loadCodes])
  useEffect(() => { if (!isAdmin) setShowCodes(false) }, [isAdmin])

  if (err) return <p className="text-sm text-destructive">Couldn’t load events: {err}</p>
  if (!events) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!events.length) return <p className="text-sm text-muted-foreground">No events yet.</p>

  return (
    <div className="space-y-5">
      {events.map(ev => {
        const first = ev.tournaments[0]
        return (
          <Card key={ev.id} className="w-full max-w-[360px] gap-0 p-4">
            {/* header */}
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight">{ev.name}</h2>
                {ev.event_date && (
                  <span className="font-mono text-xs text-muted-foreground">{ev.event_date}</span>
                )}
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" className="ml-auto h-8 shrink-0"
                        onClick={() => setEditing(ev.id)}>
                  <Pencil className="mr-1.5 size-3.5" />Edit
                </Button>
              )}
            </div>

            <Separator className="my-3" />

            {/* views */}
            {first && (
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/t/${first.slug}`}
                      className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 py-3
                                 text-sm font-medium transition hover:border-foreground/30">
                  <Rows3 className="size-5" />Bracket view
                </Link>
                <Link to={`/t/${first.slug}/schedule`}
                      className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 py-3
                                 text-sm font-medium transition hover:border-foreground/30">
                  <CalendarDays className="size-5" />Schedule view
                </Link>
              </div>
            )}

            <Separator className="my-3" />

            {/* divisions — a compact list */}
            <div className="divide-y">
              {ev.tournaments.map(t => (
                <Link key={t.id} to={`/t/${t.slug}`}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {t.sport}
                      {t.match_count ? <> · {t.final_count ?? 0}/{t.match_count} played</> : null}
                    </p>
                  </div>
                  {t.live_count
                    ? <LiveChip />
                    : (t.match_count ?? 0) > 0 && t.final_count === t.match_count
                      ? <Badge variant="secondary">Complete</Badge>
                      : (t.final_count ?? 0) > 0
                        ? <LiveChip label="In play" />
                        : <Badge variant="secondary" className="capitalize">{t.status}</Badge>}
                </Link>
              ))}
              {!ev.tournaments.length && (
                <p className="py-2 text-sm text-muted-foreground">No divisions yet.</p>
              )}
            </div>

            {isAdmin && (
              <button type="button"
                      onClick={() => toast.message('Not available yet')}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border
                                 border-dashed py-2.5 text-sm text-muted-foreground transition
                                 hover:border-foreground/40 hover:text-foreground">
                <Plus className="size-4" />Add division
              </button>
            )}

            {isAdmin && (
              <div className="mt-3 space-y-2">
                <Button variant="ghost" size="sm" className="-mx-2 h-8 text-muted-foreground"
                        onClick={() => setShowCodes(v => !v)}>
                  <KeyRound className="mr-1.5 size-3.5" />
                  {showCodes ? 'Hide staff access code' : 'Staff access code'}
                </Button>
                {showCodes && (
                  <StaffCodeRow eventId={ev.id} code={codes[ev.id] ?? ''}
                                onChange={c => setCodes(s => ({ ...s, [ev.id]: c }))} />
                )}
              </div>
            )}

            {isAdmin && (
              <EventAdminDialog event={ev} open={editing === ev.id}
                onOpenChange={o => setEditing(o ? ev.id : null)}
                onChanged={async () => { await loadEvents() }} />
            )}
          </Card>
        )
      })}
    </div>
  )
}
