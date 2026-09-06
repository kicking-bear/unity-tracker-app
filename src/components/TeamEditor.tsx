import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { api } from '@/lib/api'
import { PALETTE, paletteName } from '@/lib/palette'
import type { Team } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function TeamEditor({ slug, onChanged }: { slug: string; onChanged: () => Promise<void> }) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.tournament(slug).then(d => {
      setTeams(d.teams)
      setNames(Object.fromEntries(d.teams.map(t => [t.id, t.name])))
    }).catch(e => setMsg((e as Error).message))
  }, [slug])

  async function save(id: string, fields: Record<string, unknown>) {
    setMsg('')
    try {
      await api.patchTeam(id, fields)
      const d = await api.tournament(slug)
      setTeams(d.teams)
      await onChanged()
    } catch (e) { setMsg((e as Error).message) }
  }

  if (!teams) return <p className="text-sm text-muted-foreground">Loading teams…</p>

  return (
    <div className="space-y-4">
      {teams.map(t => (
        <div key={t.id} className="space-y-2">
          <div className="flex gap-2">
            <Input value={names[t.id] ?? ''}
                   onChange={e => setNames(s => ({ ...s, [t.id]: e.target.value }))} />
            <Button variant="outline" size="sm" className="h-9 shrink-0"
                    disabled={(names[t.id] ?? '').trim() === t.name}
                    onClick={() => save(t.id, { name: (names[t.id] ?? '').trim() })}>
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  )
}
