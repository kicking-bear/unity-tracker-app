import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import type { EventRow } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className="space-y-6">
      {events.map(ev => (
        <Card key={ev.id} className="p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3 border-b pb-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{ev.name}</h2>
              {ev.event_date && (
                <span className="font-mono text-xs text-muted-foreground">{ev.event_date}</span>
              )}
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="ml-auto shrink-0"
                      onClick={() => setEditing(ev.id)}>
                <Pencil className="mr-1.5 size-3.5" />Edit
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ev.tournaments.map(t => (
              <Link key={t.id} to={`/t/${t.slug}`}>
                <Card className="bg-muted/30 transition hover:border-foreground/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <span className="text-xs capitalize text-muted-foreground">
                      {t.sport}
                      {t.match_count ? <> · {t.final_count ?? 0}/{t.match_count} played</> : null}
                    </span>
                    {t.live_count
                      ? <LiveChip />
                      : (t.match_count ?? 0) > 0 && t.final_count === t.match_count
                        ? <Badge variant="secondary">Complete</Badge>
                        : (t.final_count ?? 0) > 0
                          ? <LiveChip label="In play" />
                          : <Badge variant="secondary" className="capitalize">{t.status}</Badge>}
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!ev.tournaments.length && (
              <p className="text-sm text-muted-foreground">No tournaments yet.</p>
            )}
          </div>

          {isAdmin && (
            <div className="mt-4 flex flex-col items-end gap-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground"
                      onClick={() => setShowCodes(v => !v)}>
                <KeyRound className="mr-1.5 size-3.5" />
                {showCodes ? 'Hide staff access code' : 'Staff access code'}
              </Button>
              {showCodes && (
                <div className="w-full sm:max-w-sm">
                  <StaffCodeRow eventId={ev.id} code={codes[ev.id] ?? ''}
                                onChange={c => setCodes(s => ({ ...s, [ev.id]: c }))} />
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <EventAdminDialog event={ev} open={editing === ev.id}
              onOpenChange={o => setEditing(o ? ev.id : null)}
              onChanged={async () => { await loadEvents() }} />
          )}
        </Card>
      ))}
    </div>
  )
}
