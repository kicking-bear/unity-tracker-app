import { useCallback, useEffect, useState } from 'react'
import { Check, Shuffle } from 'lucide-react'
import { api } from '@/lib/api'
import { PALETTE, paletteName } from '@/lib/palette'
import type { Stage, Team } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function TeamEditor({ slug, onChanged }: { slug: string; onChanged: () => Promise<void> }) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [pools, setPools] = useState<Stage[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const d = await api.tournament(slug)
    setTeams(d.teams)
    setPools(d.stages.filter(s => s.type === 'pool').sort((a, b) => a.sort - b.sort))
    setNames(Object.fromEntries(d.teams.map(t => [t.id, t.name])))
  }, [slug])

  useEffect(() => { load().catch(e => setMsg((e as Error).message)) }, [load])

  async function save(id: string, fields: Record<string, unknown>) {
    setMsg('')
    try { await api.patchTeam(id, fields); await load(); await onChanged() }
    catch (e) { setMsg((e as Error).message) }
  }

  /** Even split across pools, shuffled. */
  async function randomise() {
    if (!teams || pools.length < 2) return
    setMsg('Shuffling…')
    const shuffled = [...teams].sort(() => Math.random() - 0.5)
    const per = Math.ceil(shuffled.length / pools.length)
    try {
      for (let i = 0; i < shuffled.length; i++) {
        const pool = pools[Math.floor(i / per)] ?? pools[pools.length - 1]
        if (shuffled[i].stage_id !== pool.id)
          await api.patchTeam(shuffled[i].id, { stage_id: pool.id })
      }
      await load(); await onChanged(); setMsg('Pools shuffled.')
    } catch (e) { setMsg((e as Error).message) }
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
                    onClick={() => save(t.id, { name: (names[t.id] ?? '').trim() })}>
              Save
            </Button>
          </div>

          {pools.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pool</Label>
              <Select value={t.stage_id ?? 'none'}
                      onValueChange={v => save(t.id, { stage_id: v === 'none' ? null : v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {pools.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {PALETTE.map(c => {
              const on = (t.color ?? '').toLowerCase() === c.hex.toLowerCase()
              return (
                <button key={c.hex} type="button" title={c.name} aria-label={c.name}
                  onClick={() => save(t.id, { color: c.hex })}
                  className={cn('relative size-7 rounded-md border transition',
                    on ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'hover:scale-110')}
                  style={{ background: c.hex }}>
                  {on && <Check className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference" />}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">{paletteName(t.color) ?? 'No colour set'}</p>
        </div>
      ))}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  )
}
