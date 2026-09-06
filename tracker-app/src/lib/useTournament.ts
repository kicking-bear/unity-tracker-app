import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { TournamentState } from './types'

/** Polls tournament state, but never re-renders while an input is focused. */
export function useTournament(slug?: string, intervalMs = 8000) {
  const [state, setState] = useState<TournamentState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ts = useRef(-1)

  const load = useCallback(async (force = false) => {
    if (!slug) return
    try {
      const d = await api.tournament(slug)
      setError(null)
      const el = document.activeElement as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (force || (d.ts !== ts.current && !typing)) { ts.current = d.ts; setState(d) }
    } catch (e) { setError((e as Error).message) }
  }, [slug])

  useEffect(() => { void load(true) }, [load])
  useEffect(() => {
    const id = setInterval(() => void load(false), intervalMs)
    return () => clearInterval(id)
  }, [load, intervalMs])

  return { state, error, reload: () => load(true) }
}
