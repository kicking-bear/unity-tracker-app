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

export default function EventsPage() {
  const { isAdmin } = useRoleContext()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [showCodes, setShowCodes] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadEvents = useCallback(() =>
    api.events().then(d => setEvents(d.events)).catch(e => setErr((e as Error).message)), [])
  useEffect(() => { void loadEvents() }, [loadEvents])

  const loadCodes = useCallback(async () => {
    const d = await api.codes()
    setCodes(Object.fromEntries(d.tournaments.map(t => [t.id, t.staff_code ?? ''])))
  }, [])

  useEffect(() => { if (isAdmin && showCodes) void loadCodes() }, [isAdmin, showCodes, loadCodes])
  useEffect(() => { if (!isAdmin) setShowCodes(false) }, [isAdmin])

  if (err) return <p className="text-sm text-destructive">Couldn’t load events: {err}</p>
  if (!events) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!events.length) return <p className="text-sm text-muted-foreground">No events yet.</p>

  return (
    <div className="space-y-10">
      {events.map(ev => (
        <section key={ev.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b pb-2">
            <h2 className="text-2xl font-semibold tracking-tight">{ev.name}</h2>
            {ev.event_date && (
              <span className="font-mono text-xs text-muted-foreground">{ev.event_date}</span>
            )}
            {isAdmin && (
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="sm" className="text-muted-foreground"
                        onClick={() => setShowCodes(v => !v)}>
                  <KeyRound className="mr-1.5 size-3.5" />
                  {showCodes ? 'Hide codes' : 'Staff access codes'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(ev.id)}>
                  <Pencil className="mr-1.5 size-3.5" />Edit
                </Button>
                <EventAdminDialog event={ev} open={editing === ev.id}
                  onOpenChange={o => setEditing(o ? ev.id : null)}
                  onChanged={async () => { await loadEvents() }} />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ev.tournaments.map(t => (
              <Card key={t.id} className="flex flex-col">
                <Link to={`/t/${t.slug}`} className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-semibold tracking-tight">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-xs capitalize text-muted-foreground">
                      {t.sport}{t.division ? ` · ${t.division}` : ''}
                    </span>
                    <Badge variant={t.status === 'live' ? 'default' : 'secondary'}>{t.status}</Badge>
                  </CardContent>
                </Link>

                {isAdmin && showCodes && (
                  <div className="space-y-2 border-t px-6 pb-4 pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Staff access code</p>
                    <StaffCodeRow
                      tournamentId={t.id}
                      code={codes[t.id] ?? ''}
                      onChange={c => setCodes(s => ({ ...s, [t.id]: c }))}
                    />
                  </div>
                )}
              </Card>
            ))}
            {!ev.tournaments.length && (
              <p className="text-sm text-muted-foreground">No tournaments yet.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
