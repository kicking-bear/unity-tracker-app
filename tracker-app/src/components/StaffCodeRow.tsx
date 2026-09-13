import { useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function StaffCodeRow({
  eventId, code, onChange,
}: { eventId: string; code: string; onChange: (c: string) => void }) {
  const [draft, setDraft] = useState(code)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const dirty = draft.trim() !== code

  async function save(newCode?: string) {
    setBusy(true)
    try {
      const r = await api.rotateCode(eventId, newCode)
      setDraft(r.code); onChange(r.code); toast.success('Staff code updated')
    } catch (e) { toast.error((e as Error).message); setDraft(code) }
    setBusy(false)
  }
  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={draft} onChange={e => setDraft(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && dirty && save(draft.trim())}
               className="font-mono" aria-label="Staff code" />
        <Button variant="outline" size="icon" onClick={copy} aria-label="Copy code">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => save()} disabled={busy}
                aria-label="Generate a new code" title="Generate a new code">
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {dirty ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save(draft.trim())} disabled={busy}>Save code</Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(code)}>Cancel</Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          One code for the whole event — it unlocks score entry for every division.
        </p>
      )}
    </div>
  )
}
