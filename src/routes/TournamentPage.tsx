import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useTournament } from '@/lib/useTournament'
import { currentStage, matchNumbers } from '@/lib/tournament'
import { Button } from '@/components/ui/button'
import Bracket, { bracketColumns } from '@/components/Bracket'
import MatchSheet from '@/components/MatchSheet'

export default function TournamentPage() {
  const { slug } = useParams()
  const { state, error, reload } = useTournament(slug)
  const [selected, setSelected] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [fs, setFs] = useState(false)
  const cols = useRef<Record<string, HTMLDivElement | null>>({})
  const scroller = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const positioned = useRef(false)

  const columns = useMemo(() => (state ? bracketColumns(state) : []), [state])
  const nums = useMemo(() => (state ? matchNumbers(state) : {}), [state])

  const registerCol = useCallback((key: string, el: HTMLDivElement | null) => { cols.current[key] = el }, [])

  const goTo = useCallback((key: string) => {
    const el = cols.current[key], sc = scroller.current
    if (!el || !sc) return
    sc.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' })
    setActive(key)
  }, [])

  // default position: the stage currently in progress — once, on first load
  useEffect(() => {
    if (!state || positioned.current || !columns.length) return
    const cur = currentStage(state)
    const key = cur ? (cur.type === 'pool' ? 'pools' : cur.id) : columns[0].key
    positioned.current = true
    requestAnimationFrame(() => goTo(key))
  }, [state, columns, goTo])

  // keep the active tab in sync while the user scrolls
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    const onScroll = () => {
      let best: string | null = null, bestD = Infinity
      for (const [k, el] of Object.entries(cols.current)) {
        if (!el) continue
        const d = Math.abs(el.offsetLeft - 16 - sc.scrollLeft)
        if (d < bestD) { bestD = d; best = k }
      }
      if (best) setActive(best)
    }
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => sc.removeEventListener('scroll', onScroll)
  }, [columns.length])

  // fullscreen for TVs
  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void wrap.current?.requestFullscreen?.()
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!state?.tournament) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div ref={wrap} className={fs ? 'flex h-screen flex-col bg-background p-6' : 'space-y-3'}>
      <div className="flex items-baseline gap-2">
        {!fs && (
          <>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">{state.event?.name}</Link>
            <span className="text-sm text-muted-foreground">/</span>
          </>
        )}
        <h1 className={fs ? 'text-3xl font-semibold tracking-tight' : 'text-2xl font-semibold tracking-tight'}>
          {fs ? `${state.event?.name} — ${state.tournament.name}` : state.tournament.name}
        </h1>
        <Button variant="ghost" size="icon" className="ml-auto hidden md:inline-flex"
                onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'}>
          {fs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
      </div>

      {/* stage tabs drive the horizontal scroll */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {columns.map(c => (
          <Button key={c.key} size="sm" variant={active === c.key ? 'default' : 'ghost'}
                  className="shrink-0 rounded-full" onClick={() => goTo(c.key)}>
            {c.label}
          </Button>
        ))}
      </div>

      <div className={fs ? 'min-h-0 flex-1' : undefined}>
        <Bracket ref={scroller} state={state} columns={columns}
                 onSelect={setSelected} registerCol={registerCol} fullscreen={fs} />
      </div>

      <MatchSheet state={state} matchId={selected}
                  number={selected ? nums[selected] : undefined}
                  onClose={() => setSelected(null)} onChanged={reload} />
    </div>
  )
}
