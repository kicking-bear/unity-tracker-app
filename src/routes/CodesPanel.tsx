import { useEffect, useState } from 'react'
import { RefreshCw, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Row { id: string; name: string; slug: string; staff_code: string }

export default function CodesPanel() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => api.codes().then(d => setRows(d.tournaments)).catch(() => setRows([]))
  useEffect(() => { void load() }, [])

  async function rotate(id: string) {
    setBusy(id)
    try { await api.rotateCode(id); await load() } finally { setBusy(null) }
  }
  async function copy(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code); setTimeout(() => setCopied(null), 1500)
  }

  if (!rows) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">Staff codes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Give a code to whoever is keeping score. It only unlocks that tournament.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-40 shrink-0 truncate text-sm">{r.name}</span>
            <Input readOnly value={r.staff_code ?? ''} className="font-mono" />
            <Button variant="outline" size="icon" onClick={() => copy(r.staff_code)}
                    aria-label="Copy code">
              {copied === r.staff_code ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => rotate(r.id)}
                    disabled={busy === r.id} aria-label="Generate a new code">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
