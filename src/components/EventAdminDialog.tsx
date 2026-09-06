import { useState } from 'react'
import { api } from '@/lib/api'
import type { EventRow } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import TeamEditor from '@/components/TeamEditor'

export default function EventAdminDialog({
  event, open, onOpenChange, onChanged,
}: { event: EventRow; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(event.name)
  const [date, setDate] = useState(event.event_date ?? '')
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(event.tournaments.map(t => [t.id, t.name])))
  const [msg, setMsg] = useState('')

  async function saveEvent() {
    setMsg('')
    try {
      await api.patchEvent(event.id, { name: name.trim(), event_date: date || null })
      await onChanged(); setMsg('Saved.')
    } catch (e) { setMsg((e as Error).message) }
  }
  async function saveTournament(id: string, fields: Record<string, unknown>) {
    setMsg('')
    try { await api.patchTournament(id, fields); await onChanged() }
    catch (e) { setMsg((e as Error).message) }
  }
  async function reset(id: string) {
    setMsg('')
    try { await api.resetTournament(id); await onChanged(); setMsg('Tournament reset.') }
    catch (e) { setMsg((e as Error).message) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">Edit event</DialogTitle>
          <DialogDescription>Event details, tournament settings and resets.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Event name</Label>
            <Input id="ev-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-date">Date</Label>
            <Input id="ev-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={saveEvent}>Save event</Button>
        </div>

        <Separator className="my-2" />

        <div className="space-y-5">
          {event.tournaments.map(t => (
            <div key={t.id} className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor={`tn-${t.id}`}>Tournament name</Label>
                <div className="flex gap-2">
                  <Input id={`tn-${t.id}`} value={names[t.id] ?? ''}
                    onChange={e => setNames(s => ({ ...s, [t.id]: e.target.value }))} />
                  <Button variant="outline" size="sm" className="h-9"
                    disabled={(names[t.id] ?? '').trim() === t.name}
                    onClick={() => saveTournament(t.id, { name: (names[t.id] ?? '').trim() })}>
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={t.status} onValueChange={v => saveTournament(t.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Danger zone</Label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">Reset tournament</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset {t.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Every score is deleted and all matches return to scheduled. Teams, rosters,
                          times, courts and officials are kept. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => reset(t.id)}
                          className="bg-destructive text-white hover:bg-destructive/90">
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="teams" className="border-none">
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    Teams &amp; colours
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <TeamEditor slug={t.slug} onChanged={onChanged} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </DialogContent>
    </Dialog>
  )
}
