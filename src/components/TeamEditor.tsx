import { useCallback, useEffect, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import ColorPicker from '@/components/ColorPicker'
import type { Stage, Team } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function TeamEditor({ slug, onChanged }: { slug: string; onChanged: () => Promise<void> }) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [pools, setPools] = useState<Stage[]>([])
  const [names, setNames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const d = await api.tournament(slug)
    setTeams(d.teams)
    setPools(d.stages.filter(s => s.type === 'pool').sort((a, b) => a.sort - b.sort))
    setNames(Object.fromEntries(d.teams.map(t => [t.id, t.name])))
  }, [slug])

  useEffect(() => { load().catch(e => toast.error((e as Error).message)) }, [load])

  async function save(id: string, fields: Record<string, unknown>, label: string) {
    try {
      await api.patchTeam(id, fields)
      await load(); await onChanged()
      toast.success(label)
      checkPools()
    } catch (e) { toast.error((e as Error).message) }
  }

  /** Warn when pools end up lopsided — the organiser has to fix it, not us. */
  function checkPools() {
    if (!teams || pools.length < 2) return
    const counts = pools.map(p => ({
      name: p.name, n: teams.filter(t => t.stage_id === p.id).length }))
    const unassigned = teams.filter(t => !t.stage_id).length
    if (unassigned) toast.warning(`${unassigned} team${unassigned > 1 ? 's' : ''} not in a pool`)
    const min = Math.min(...counts.map(c => c.n)), max = Math.max(...counts.map(c => c.n))
    if (max - min > 1)
      toast.warning('Pools are uneven: ' + counts.map(c => `${c.name} ${c.n}`).join(' · '))
  }

  /** Even split across pools, shuffled. */
  async function randomise() {
    if (!teams || pools.length < 2) return
    const shuffled = [...teams].sort(() => Math.random() - 0.5)
    const per = Math.ceil(shuffled.length / pools.length)
    try {
      for (let i = 0; i < shuffled.length; i++) {
        const pool = pools[Math.floor(i / per)] ?? pools[pools.length - 1]
        if (shuffled[i].stage_id !== pool.id)
          await api.patchTeam(shuffled[i].id, { stage_id: pool.id })
      }
      await load(); await onChanged(); toast.success('Pools shuffled')
    } catch (e) { toast.error((e as Error).message) }
  }

  if (!teams) return <p className="text-sm text-muted-foreground">Loading teams…</p>

  return (
    <div className="space-y-5">
      {pools.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Pool assignment</p>
            <p className="text-xs text-muted-foreground">Set each team below, or shuffle them evenly.</p>
          </div>
          <Button variant="outline" size="sm" onClick={randomise}>
            <Shuffle className="mr-1.5 size-3.5" />Randomise
          </Button>
        </div>
      )}

      {teams.map(t => (
        <div key={t.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex gap-2">
            <Input value={names[t.id] ?? ''}
                   onChange={e => setNames(s => ({ ...s, [t.id]: e.target.value }))} />
            <Button variant="outline" size="sm" className="h-9 shrink-0"
                    disabled={(names[t.id] ?? '').trim() === t.name}
                    onClick={() => save(t.id, { name: (names[t.id] ?? '').trim() }, 'Team name saved')}>
              Save
            </Button>
          </div>

          {pools.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pool</Label>
              <Select value={t.stage_id ?? 'none'}
                      onValueChange={v => save(t.id, { stage_id: v === 'none' ? null : v }, 'Pool updated')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {pools.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Label className="text-xs text-muted-foreground">Colour</Label>
            <ColorPicker value={t.color} onChange={hex => save(t.id, { color: hex }, 'Colour updated')} />
          </div>
        </div>
      ))}
    </div>
  )
}
