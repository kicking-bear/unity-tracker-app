import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Block } from '@/lib/types'
import SheetShell from '@/components/SheetShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const RED = 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'

export default function BlockDialog({
  open, onClose, eventId, courts, blocks, onChanged,
}: {
  open: boolean; onClose: () => void; eventId: string
  courts: string[]; blocks: Block[]; onChanged: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [court, setCourt] = useState('ALL')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!title.trim()) { toast.error('Give the block a title'); return }
    if (!time) { toast.error('Set a start time'); return }
    setBusy(true)
    try {
      await api.addBlock({
        event_id: eventId, title: title.trim(), details: details.trim() || null,
        court, start_time: time,
      })
      setTitle(''); setDetails(''); setTime('')
      await onChanged(); toast.success('Block added')
    } catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }

  async function remove(id: string) {
    try { await api.deleteBlock(id); await onChanged(); toast.success('Block removed') }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <SheetShell open={open} onClose={onClose} colors={['#3A3F47', '#20242A']}
                title="Schedule blocks" subtitle="Lunch, ceremonies, anything that isn’t a match">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="blk-title">Title</Label>
          <Input id="blk-title" value={title} placeholder="Lunch break"
                 onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blk-det">Details</Label>
          <Input id="blk-det" value={details} placeholder="Optional"
                 onChange={e => setDetails(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Select value={court} onValueChange={setCourt}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All courts</SelectItem>
              {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blk-time">Start time</Label>
          <Input id="blk-time" type="time" value={time} className="h-10 w-full"
                 onChange={e => setTime(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save} disabled={busy}>Add block</Button>
      </div>

      {blocks.length > 0 && (
        <>
          <Separator className="my-5" />
          <h3 className="mb-2 text-sm font-semibold">Existing blocks</h3>
          <div className="space-y-2">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.start_time} · {b.court === 'ALL' || !b.court ? 'All courts' : b.court}
                  </p>
                </div>
                <Button size="sm" className={RED} onClick={() => remove(b.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </>
      )}
    </SheetShell>
  )
}
