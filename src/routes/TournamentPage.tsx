import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Maximize2, Minimize2, Plus, Rows3 } from 'lucide-react'
import { useTournament } from '@/lib/useTournament'
import { api } from '@/lib/api'
import { currentStage, liveStageId, matchNumbers } from '@/lib/tournament'
import type { Block, TournamentState } from '@/lib/types'
import { useRoleContext } from '@/lib/roleContext'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import Bracket, { bracketColumns, LiveDot } from '@/components/Bracket'
import ScheduleView, { courtColumns } from '@/components/ScheduleView'
import BlockDialog from '@/components/BlockDialog'
import MatchSheet from '@/components/MatchSheet'
import PoolSheet from '@/components/PoolSheet'

type View = 'bracket' | 'schedule'

export default function TournamentPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const [view, setView] = useState<View>(params.get('view') === 'schedule' ? 'schedule' : 'bracket')
  const navigate = useNavigate()
  const { isAdmin } = useRoleContext()
  const { state, error, reload } = useTournament(slug)

  const [selected, setSelected] = useState<{ state: TournamentState; id: string } | null>(null)
  const [pool, setPool] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [fs, setFs] = useState(false)
  const [siblingStates, setSiblingStates] = useState<TournamentState[]>([])
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [blockOpen, setBlockOpen] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)

  const cols = useRef<Record<string, HTMLDivElement | null>>({})
  const scroller = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const positioned = useRef(false)


  const columns = useMemo(() => (state && view === 'bracket' ? bracketColumns(state) : []), [state, view])
  const blocks = useMemo(() => state?.blocks ?? [], [state])
  const visibleStates = useMemo(
    () => siblingStates.filter(s => s.tournament && !hidden.has(s.tournament.slug)), [siblingStates, hidden])
  const schedCols = useMemo(
    () => (view === 'schedule' && visibleStates.length ? courtColumns(visibleStates, blocks) : []),
    [view, visibleStates, blocks])
  const nums = useMemo(() => (state ? matchNumbers(state) : {}), [state])

  const loadSiblings = useCallback(async () => {
    if (!state?.siblings?.length) return
    const list = await Promise.all(state.siblings.map(s => api.tournament(s.slug)))
    setSiblingStates(list)
  }, [state?.siblings])

  useEffect(() => { if (view === 'schedule') void loadSiblings() }, [view, loadSiblings])

  const registerCol = useCallback((key: string, el: HTMLDivElement | null) => { cols.current[key] = el }, [])

  const goTo = useCallback((key: string) => {
    const el = cols.current[key], sc = scroller.current
    if (!el || !sc) return
    const left = sc.scrollLeft + el.getBoundingClientRect().left - sc.getBoundingClientRect().left - (view === 'bracket' ? 16 : 0)
    sc.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setActive(key)
  }, [view])

  useEffect(() => { positioned.current = false; cols.current = {} }, [view, slug])

  useEffect(() => {
    if (!state || positioned.current || view !== 'bracket' || !columns.length) return
    positioned.current = true
    const cur = currentStage(state)
    requestAnimationFrame(() => goTo(cur ? (cur.type === 'pool' ? 'pools' : cur.id) : columns[0].key))
  }, [state, columns, view, goTo])

  useEffect(() => {
    const sc = scroller.current
    if (!sc || view !== 'bracket') return
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
  }, [columns.length, view])

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

  return (
    <div ref={wrap} className={fs ? 'flex h-screen flex-col bg-background p-6' : 'space-y-3'}>
      {!fs && (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="shrink-0 hover:text-foreground">Tournaments</Link>
          <span className="shrink-0">/</span>
          <Link to="/" className="min-w-0 truncate hover:text-foreground">{state.event?.name}</Link>
        </div>
      )}

      {/* toggle left · context control right */}
      <div className="flex min-w-0 items-center gap-2">
        {fs ? (
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {state.event?.name} — {view === 'schedule' ? 'Schedule' : state.tournament.name}
          </h1>
        ) : (
          <div className="flex shrink-0 overflow-hidden rounded-full border">
            <Button size="sm" variant={view === 'bracket' ? 'default' : 'ghost'}
                    aria-label="Bracket view" title="Bracket view"
                    className="h-8 rounded-none px-2.5 sm:px-3" onClick={() => setView('bracket')}>
              <Rows3 className="size-4 sm:mr-1.5 sm:size-3.5" />
              <span className="hidden sm:inline">Bracket</span>
            </Button>
            <Button size="sm" variant={view === 'schedule' ? 'default' : 'ghost'}
                    aria-label="Schedule view" title="Schedule view"
                    className="h-8 rounded-none px-2.5 sm:px-3" onClick={() => setView('schedule')}>
              <CalendarDays className="size-4 sm:mr-1.5 sm:size-3.5" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
          </div>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-1">
          {!fs && view === 'bracket' && (
            <Select value={slug} onValueChange={v => navigate(`/t/${v}`)}>
              <SelectTrigger className="h-9 w-auto min-w-0 max-w-[52vw] gap-2 rounded-lg px-3
                                        text-sm font-semibold sm:max-w-none sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(state.siblings ?? []).map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {!fs && view === 'schedule' && isAdmin && (
            <Button variant="outline" size="sm" className="h-9"
                    onClick={() => { setEditBlock(null); setBlockOpen(true) }}>
              <Plus className="size-4 sm:mr-1.5 sm:size-3.5" />
              <span className="hidden sm:inline">Add block</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="hidden md:inline-flex"
                  onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'}>
            {fs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* bracket: stage chips · schedule: division toggles */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {view === 'bracket' ? columns.map(c => {
          const isLive = c.stages.some(s => s.id === live)
          return (
            <Button key={c.key} size="sm" variant={active === c.key ? 'default' : 'ghost'}
                    className="shrink-0 gap-1.5 rounded-full" onClick={() => goTo(c.key)}>
              {c.label}{isLive && <LiveDot />}
            </Button>
          )
        }) : (
          <div className="flex items-center gap-4 py-1">
            <span className="shrink-0 text-xs text-muted-foreground">Show</span>
            {(state.siblings ?? []).map(s => {
              const on = !hidden.has(s.slug)
              const last = !on ? false : (state.siblings?.length ?? 1) - hidden.size <= 1
              return (
                <label key={s.slug}
                       className={cn('flex shrink-0 cursor-pointer items-center gap-2 text-sm',
                         last && 'cursor-not-allowed opacity-60')}>
                  <Checkbox checked={on} disabled={last}
                    onCheckedChange={() => setHidden(h => {
                      const n = new Set(h)
                      if (n.has(s.slug)) n.delete(s.slug); else n.add(s.slug)
                      return n
                    })} />
                  {s.name}
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className={fs ? 'min-h-0 flex-1' : undefined}>
        {view === 'bracket' ? (
          <Bracket ref={scroller} state={state} columns={columns} liveStage={live}
                   onSelect={id => setSelected({ state, id })} onOpenPool={setPool}
                   registerCol={registerCol} fullscreen={fs} />
        ) : schedCols.length ? (
          <ScheduleView ref={scroller} states={visibleStates} blocks={blocks} columns={schedCols}
                        onSelect={(st, id) => setSelected({ state: st, id })}
                        onEditBlock={isAdmin ? b => { setEditBlock(b); setBlockOpen(true) } : undefined}
                        registerCol={registerCol} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        )}
      </div>

      {isAdmin && state.event && (
        <BlockDialog open={blockOpen} onClose={() => { setBlockOpen(false); setEditBlock(null) }}
                     eventId={state.event.id} courts={schedCols.map(c => c.key)}
                     editing={editBlock}
                     onChanged={async () => { await reload(); await loadSiblings() }} />
      )}

      <PoolSheet state={state} stageId={pool} onClose={() => setPool(null)}
                 onSelectMatch={id => setSelected({ state, id })} />
      <MatchSheet state={selected?.state ?? state} matchId={selected?.id ?? null}
                  number={selected ? matchNumbers(selected.state)[selected.id] : undefined}
                  onClose={() => setSelected(null)}
                  onChanged={async () => { await reload(); if (view === 'schedule') await loadSiblings() }} />
    </div>
  )
}
