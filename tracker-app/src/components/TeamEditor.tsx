import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Stage, Team } from '@/lib/types'
import ColorPicker from '@/components/ColorPicker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Draft { id: string; name: string; color: string | null; stage_id: string | null }

export default function TeamEditor({ slug, onChanged }: { slug: string; onChanged: () => Promise<void> }) {
  const [pools, setPools] = useState<Stage[]>([])
  const [draft, setDraft] = useState<Draft[] | null>(null)
  const [saved, setSaved] = useState<Draft[] | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const d = await api.tournament(slug)
    const rows: Draft[] = d.teams.map((t: Team) => ({
      id: t.id, name: t.name, color: t.color ?? null, stage_id: t.stage_id ?? null,
    }))
    setPools(d.stages.filter(s => s.type === 'pool').sort((a, b) => a.sort - b.sort))
    setDraft(rows); setSaved(rows)
  }, [slug])

  useEffect(() => { load().catch(e => toast.error((e as Error).message)) }, [load])

  if (!draft || !saved) return <p className="text-sm text-muted-foreground">Loading teams…</p>

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (id: string, f: Partial<Draft>) =>
    setDraft(d => d!.map(t => (t.id === id ? { ...t, ...f } : t)))

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= draft!.length) return
    const next = [...draft!]
    ;[next[i], next[j]] = [next[j], next[i]]
    setDraft(next)
  }

  function randomise() {
    if (pools.length < 2) return
    const shuffled = [...draft!].sort(() => Math.random() - 0.5)
    const per = Math.ceil(shuffled.length / pools.length)
    setDraft(shuffled.map((t, i) => ({
      ...t, stage_id: (pools[Math.floor(i / per)] ?? pools[pools.length - 1]).id,
    })))
    toast.message('Pools shuffled — press Save to apply')
  }

  async function save() {
    setBusy(true)
    try {
      await api.saveTeams(draft!.map((t, i) => ({ ...t, sort: i })))
      await load(); await onChanged()
      toast.success('Teams saved')
      if (pools.length > 1) {
        const counts = pools.map(p => draft!.filter(t => t.stage_id === p.id).length)
        const un = draft!.filter(t => !t.stage_id).length
        if (un) toast.warning(`${un} team${un > 1 ? 's' : ''} not in a pool`)
        else if (Math.max(...counts) - Math.min(...counts) > 1)
          toast.warning('Pools are uneven: ' + pools.map((p, i) => `${p.name} ${counts[i]}`).join(' · '))
      }
    } catch (e) { toast.error((e as Error).message) }
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      {pools.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Pools &amp; order</p>
            <p className="text-xs text-muted-foreground">Changes apply when you save.</p>
          </div>
          <Button variant="outline" size="sm" onClick={randomise}>
            <Shuffle className="mr-1.5 size-3.5" />Randomise
          </Button>
        </div>
      )}

      {draft.map((t, i) => (
        <div key={t.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 flex-col">
              <Button variant="ghost" size="icon" className="size-6" aria-label="Move up"
                      disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" aria-label="Move down"
                      disabled={i === draft.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <Input value={t.name} onChange={e => set(t.id, { name: e.target.value })} />
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-8">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Colour</Label>
              <ColorPicker value={t.color} onChange={hex => set(t.id, { color: hex })} />
            </div>
            {pools.length > 1 && (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground">Pool</Label>
                <Select value={t.stage_id ?? 'none'}
                        onValueChange={v => set(t.id, { stage_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {pools.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 flex gap-2 bg-background pt-2">
        <Button className="flex-1" onClick={save} disabled={!dirty || busy}>
          {dirty ? 'Save teams' : 'Saved'}
        </Button>
        {dirty && (
          <Button variant="outline" onClick={() => setDraft(saved)}>Discard</Button>
        )}
      </div>
    </div>
  )
}
