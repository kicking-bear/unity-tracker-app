import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Block } from '@/lib/types'
import SheetShell from '@/components/SheetShell'
import TimeField from '@/components/TimeField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const RED = 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'

export default function BlockDialog({
  open, onClose, eventId, courts, editing, onChanged,
}: {
  open: boolean; onClose: () => void; eventId: string
  courts: string[]; editing?: Block | null; onChanged: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [court, setCourt] = useState('ALL')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(editing?.title ?? '')
    setDetails(editing?.details ?? '')
    setCourt(editing?.court ?? 'ALL')
    setTime(editing?.start_time ?? '')
    setEndTime(editing?.end_time ?? '')
  }, [open, editing])

  async function save() {
    if (!title.trim()) return toast.error('Give the block a title')
    if (!time) return toast.error('Set a start time')
    setBusy(true)
    const fields = {
      title: title.trim(), details: details.trim() || null,
      court, start_time: time, end_time: endTime || null,
    }
    try {
      if (editing) await api.patchBlock(editing.id, fields)
      else await api.addBlock({ event_id: eventId, ...fields })
      await onChanged()
      toast.success(editing ? 'Block updated' : 'Block added')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }

  async function remove() {
    if (!editing) return
    try { await api.deleteBlock(editing.id); await onChanged(); toast.success('Block removed'); onClose() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <SheetShell open={open} onClose={onClose} colors={['#3A3F47', '#20242A']}
                title={editing ? 'Edit block' : 'Add block'}
                subtitle="Lunch, ceremonies, anything that isn’t a match">
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
              <SelectItem value="ALL">All locations</SelectItem>
              {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="blk-time">Start time</Label>
            <TimeField id="blk-time" value={time} onChange={setTime} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blk-end">End time</Label>
            <TimeField id="blk-end" value={endTime} onChange={setEndTime} />
          </div>
        </div>
        <Button className="w-full" onClick={save} disabled={busy}>
          {editing ? 'Save block' : 'Add block'}
        </Button>
      </div>

      {editing && (
        <>
          <Separator className="my-5" />
          <div className="rounded-lg border border-red-600/40 p-3">
            <p className="mb-2 text-sm font-medium">Remove this block</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className={RED}>Delete block</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{editing.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It disappears from the schedule. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className={RED} onClick={remove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </SheetShell>
  )
}
