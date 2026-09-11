import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Maximize2, Minimize2, Rows3 } from 'lucide-react'
import { useTournament } from '@/lib/useTournament'
import { api } from '@/lib/api'
import { currentStage, liveStageId, matchNumbers } from '@/lib/tournament'
import type { TournamentState } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Bracket, { bracketColumns, LiveDot } from '@/components/Bracket'
import ScheduleView, { courtColumns } from '@/components/ScheduleView'
import MatchSheet from '@/components/MatchSheet'
import PoolSheet from '@/components/PoolSheet'

type View = 'bracket' | 'schedule'

export default function TournamentPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { state, error, reload } = useTournament(slug)
  const [view, setView] = useState<View>('bracket')
  const [selected, setSelected] = useState<{ state: TournamentState; id: string } | null>(null)
  const [pool, setPool] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [fs, setFs] = useState(false)
  const [siblingStates, setSiblingStates] = useState<TournamentState[]>([])

  const cols = useRef<Record<string, HTMLDivElement | null>>({})
  const scroller = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const positioned = useRef(false)

  const columns = useMemo(
    () => (state && view === 'bracket' ? bracketColumns(state) : []), [state, view])
  const schedCols = useMemo(
    () => (view === 'schedule' && siblingStates.length ? courtColumns(siblingStates) : []),
    [view, siblingStates])
  const nums = useMemo(() => (state ? matchNumbers(state) : {}), [state])

  // schedule view spans the whole event, so load the sibling tournaments too
  useEffect(() => {
    if (view !== 'schedule' || !state?.siblings?.length) return
    let cancelled = false
    Promise.all(state.siblings.map(s => api.tournament(s.slug)))
      .then(list => { if (!cancelled) setSiblingStates(list) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [view, state?.siblings])

  const registerCol = useCallback((key: string, el: HTMLDivElement | null) => {
    cols.current[key] = el
  }, [])

  const offsetOf = (el: HTMLDivElement, sc: HTMLDivElement) =>
    sc.scrollLeft + el.getBoundingClientRect().left - sc.getBoundingClientRect().left - 16

  const goTo = useCallback((key: string) => {
    const el = cols.current[key], sc = scroller.current
    if (!el || !sc) return
    sc.scrollTo({ left: Math.max(0, offsetOf(el, sc)), behavior: 'smooth' })
    setActive(key)
  }, [])

  useEffect(() => { positioned.current = false; cols.current = {} }, [view, slug])

  useEffect(() => {
    if (!state || positioned.current) return
    const list = view === 'bracket' ? columns : schedCols
    if (!list.length) return
    positioned.current = true
    const key = view === 'bracket'
      ? (() => { const cur = currentStage(state); return cur ? (cur.type === 'pool' ? 'pools' : cur.id) : list[0].key })()
      : list[0].key
    requestAnimationFrame(() => goTo(key))
  }, [state, columns, schedCols, view, goTo])

  useEffect(() => {
    const sc = scroller.current
    if (!sc) return
    const onScroll = () => {
      const scRect = sc.getBoundingClientRect()
      let best: string | null = null, bestD = Infinity
      for (const [k, el] of Object.entries(cols.current)) {
        if (!el) continue
        const d = Math.abs(el.getBoundingClientRect().left - scRect.left - 16)
        if (d < bestD) { bestD = d; best = k }
      }
      if (best) setActive(best)
    }
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => sc.removeEventListener('scroll', onScroll)
  }, [columns.length, schedCols.length])

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

  const live = liveStageId(state)
  const tabs = view === 'bracket'
    ? columns.map(c => ({ key: c.key, label: c.label, live: c.stages.some(s => s.id === live) }))
    : schedCols.map(c => ({ key: c.key, label: c.label, live: false }))

  return (
    <div ref={wrap} className={fs ? 'flex h-screen flex-col bg-background p-6' : 'space-y-3'}>
      {/* breadcrumb */}
      {!fs && (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="shrink-0 transition-colors hover:text-foreground">Tournaments</Link>
          <span className="shrink-0">/</span>
          <Link to="/" className="min-w-0 truncate transition-colors hover:text-foreground">
            {state.event?.name}
          </Link>
        </div>
      )}

      {/* division switcher + view toggle */}
      <div className="flex min-w-0 items-center gap-2">
        {fs ? (
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {state.event?.name} — {state.tournament.name}
          </h1>
        ) : (
          <Select value={slug} onValueChange={v => navigate(`/t/${v}`)}>
            <SelectTrigger className="h-auto w-auto min-w-0 max-w-[62vw] gap-2 border-0 bg-transparent px-0
                                      text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0
                                      sm:max-w-none sm:text-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {(state.siblings ?? []).map(s => (
                <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!fs && (
            <div className="flex overflow-hidden rounded-full border">
              <Button size="sm" variant={view === 'bracket' ? 'default' : 'ghost'}
                      className="h-8 rounded-none px-3" onClick={() => setView('bracket')}>
                <Rows3 className="mr-1.5 size-3.5" />Bracket
              </Button>
              <Button size="sm" variant={view === 'schedule' ? 'default' : 'ghost'}
                      className="h-8 rounded-none px-3" onClick={() => setView('schedule')}>
                <CalendarDays className="mr-1.5 size-3.5" />Schedule
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="hidden md:inline-flex"
                  onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'}>
            {fs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* stage / court chips */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <Button key={t.key} size="sm" variant={active === t.key ? 'default' : 'ghost'}
                  className="shrink-0 gap-1.5 rounded-full" onClick={() => goTo(t.key)}>
            {t.label}{t.live && <LiveDot />}
          </Button>
        ))}
      </div>

      <div className={fs ? 'min-h-0 flex-1' : undefined}>
        {view === 'bracket' ? (
          <Bracket ref={scroller} state={state} columns={columns} liveStage={live}
                   onSelect={id => setSelected({ state, id })} onOpenPool={setPool}
                   registerCol={registerCol} fullscreen={fs} />
        ) : schedCols.length ? (
          <ScheduleView ref={scroller} states={siblingStates} columns={schedCols}
                        onSelect={(st, id) => setSelected({ state: st, id })}
                        registerCol={registerCol} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        )}
      </div>

      <PoolSheet state={state} stageId={pool} onClose={() => setPool(null)}
                 onSelectMatch={id => setSelected({ state, id })} />

      <MatchSheet
        state={selected?.state ?? state}
        matchId={selected?.id ?? null}
        number={selected ? matchNumbers(selected.state)[selected.id] : undefined}
        onClose={() => setSelected(null)}
        onChanged={async () => {
          await reload()
          if (view === 'schedule' && state.siblings?.length) {
            const list = await Promise.all(state.siblings.map(s => api.tournament(s.slug)))
            setSiblingStates(list)
          }
        }} />
    </div>
  )
}
