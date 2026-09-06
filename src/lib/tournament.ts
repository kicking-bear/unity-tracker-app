import type { Match, Stage, StandingRow, Team, TournamentState } from './types'

export function tally(m: Match) {
  let a = 0, b = 0, pa = 0, pb = 0
  for (const p of m.periods ?? []) {
    pa += p.score_a; pb += p.score_b
    if (p.score_a > p.score_b) a++
    else if (p.score_b > p.score_a) b++
  }
  return { a, b, pa, pb, played: (m.periods?.length ?? 0) > 0 }
}

/**
 * Winner of a match, resolving each side through the bracket chain.
 * A knockout match stores NULL team_a/team_b and derives its sides from
 * source_a/source_b, so we must resolve those before naming a winner.
 * Depth-limited: brackets are acyclic, but bad data must not hang the UI.
 */
export function winnerOf(s: TournamentState, m: Match, depth = 0): string | null {
  const t = tally(m)
  if (m.status !== 'final' || !t.played || t.a === t.b) return null
  const side = t.a > t.b ? 'a' : 'b'
  return resolveSideId(s, m, side, depth)
}
export function loserOf(s: TournamentState, m: Match, depth = 0): string | null {
  const t = tally(m)
  if (m.status !== 'final' || !t.played || t.a === t.b) return null
  const side = t.a > t.b ? 'b' : 'a'
  return resolveSideId(s, m, side, depth)
}

/** Team id on one side of a match — direct if set, otherwise via its source. */
function resolveSideId(
  s: TournamentState, m: Match, which: 'a' | 'b', depth = 0,
): string | null {
  if (depth > 12) return null
  const direct = which === 'a' ? m.team_a : m.team_b
  if (direct) return direct
  const src = which === 'a' ? m.source_a : m.source_b
  return resolveSource(s, src, depth + 1).team?.id ?? null
}

const ratio = (a: number, b: number) => (b === 0 ? (a > 0 ? 99 : 0) : a / b)

export function standings(s: TournamentState, stageId: string): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  s.teams.filter(t => t.stage_id === stageId).forEach(t =>
    rows.set(t.id, { team: t, p: 0, w: 0, l: 0, sw: 0, sl: 0, pf: 0, pa: 0, tied: false }))

  for (const m of s.matches.filter(m => m.stage_id === stageId && m.status === 'final')) {
    const t = tally(m)
    if (!t.played) continue
    const A = m.team_a ? rows.get(m.team_a) : null
    const B = m.team_b ? rows.get(m.team_b) : null
    if (!A || !B) continue
    A.p++; B.p++
    A.sw += t.a; A.sl += t.b; B.sw += t.b; B.sl += t.a
    A.pf += t.pa; A.pa += t.pb; B.pf += t.pb; B.pa += t.pa
    if (t.a > t.b) { A.w++; B.l++ } else if (t.b > t.a) { B.w++; A.l++ }
  }

  const h2h = (x: StandingRow, y: StandingRow) => {
    const m = s.matches.find(mm => mm.status === 'final' &&
      ((mm.team_a === x.team.id && mm.team_b === y.team.id) ||
       (mm.team_a === y.team.id && mm.team_b === x.team.id)))
    const w = m ? winnerOf(s, m) : null
    return !w ? 0 : (w === x.team.id ? -1 : 1)
  }
  const cmp: Record<string, (x: StandingRow, y: StandingRow) => number> = {
    wins: (x, y) => y.w - x.w,
    point_diff: (x, y) => (y.pf - y.pa) - (x.pf - x.pa),
    set_ratio: (x, y) => ratio(y.sw, y.sl) - ratio(x.sw, x.sl),
    point_ratio: (x, y) => ratio(y.pf, y.pa) - ratio(x.pf, x.pa),
    head_to_head: h2h,
  }
  const chain = s.tournament?.config?.tiebreak ??
    ['wins', 'point_diff', 'set_ratio', 'point_ratio', 'head_to_head']

  const list = [...rows.values()].sort((x, y) => {
    if (x.team.manual_rank || y.team.manual_rank)
      return (x.team.manual_rank ?? 99) - (y.team.manual_rank ?? 99)
    for (const k of chain) { const r = cmp[k]?.(x, y) ?? 0; if (r) return r }
    return x.team.name.localeCompare(y.team.name)
  })

  list.forEach((row, i) => {
    const nx = list[i + 1]
    if (!nx || row.team.manual_rank || nx.team.manual_rank) return
    if (chain.every(k => (cmp[k]?.(row, nx) ?? 0) === 0)) { row.tied = true; nx.tied = true }
  })
  return list
}

export function stageComplete(s: TournamentState, stageId: string) {
  const ms = s.matches.filter(m => m.stage_id === stageId)
  return ms.length > 0 && ms.every(m => m.status === 'final')
}

export interface Side { team: Team | null; label: string }

export function resolveSource(s: TournamentState, src?: string | null, depth = 0): Side {
  if (!src) return { team: null, label: 'TBD' }
  const [kind, ...rest] = src.split(':')
  if (kind === 'rank') {
    const name = rest.slice(0, -1).join(':')
    const n = Number(rest[rest.length - 1])
    const st = s.stages.find(x => x.name === name)
    const label = `${name} #${n}`
    if (!st || !stageComplete(s, st.id)) return { team: null, label }
    const rows = standings(s, st.id)
    if (rows.some(r => r.tied)) return { team: null, label: `${label} (tie)` }
    return { team: rows[n - 1]?.team ?? null, label }
  }
  const m = s.matches.find(x => x.id === rest.join(':'))
  const label = (kind === 'winner' ? 'Winner ' : 'Loser ') + (m?.label ?? '')
  if (!m || depth > 12) return { team: null, label }
  const id = kind === 'winner' ? winnerOf(s, m, depth) : loserOf(s, m, depth)
  return { team: id ? s.teams.find(t => t.id === id) ?? null : null, label }
}

export function sideOf(s: TournamentState, m: Match, which: 'a' | 'b'): Side {
  const direct = which === 'a' ? m.team_a : m.team_b
  if (direct) {
    const t = s.teams.find(x => x.id === direct)
    if (t) return { team: t, label: t.name }
  }
  return resolveSource(s, which === 'a' ? m.source_a : m.source_b)
}

export const teamById = (s: TournamentState, id?: string | null) =>
  id ? s.teams.find(t => t.id === id) ?? null : null
export const stageById = (s: TournamentState, id?: string | null) =>
  id ? s.stages.find(x => x.id === id) ?? null : null

/** Officials conflict: a team cannot officiate a match it plays, or another at the same time. */
export function conflicts(s: TournamentState, m: Match): string[] {
  const out: string[] = []
  ;([['ref_team', 'Ref'], ['line_team', 'Lines']] as const).forEach(([k, lbl]) => {
    const id = m[k]
    if (!id) return
    if (id === m.team_a || id === m.team_b) out.push(`${lbl} is playing in this match`)
    else if (m.start_time && s.matches.some(x =>
      x.id !== m.id && x.start_time === m.start_time && (x.team_a === id || x.team_b === id)))
      out.push(`${lbl} is playing at ${m.start_time}`)
  })
  return out
}

export const sortStages = (stages: Stage[]) => [...stages].sort((a, b) => a.sort - b.sort)

/** Stable display number for a match, by sort order within the tournament. */
export function matchNumbers(s: TournamentState): Record<string, number> {
  const ordered = [...s.matches].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  return Object.fromEntries(ordered.map((m, i) => [m.id, i + 1]))
}

/** First stage that still has unfinished matches; falls back to the last stage. */
export function currentStage(s: TournamentState): Stage | null {
  const stages = sortStages(s.stages)
  for (const st of stages) {
    const ms = s.matches.filter(m => m.stage_id === st.id)
    if (ms.length && ms.some(m => m.status !== 'final')) return st
  }
  return stages[stages.length - 1] ?? null
}

/** "14:30" -> "2:30 PM"; anything else passes through untouched. */
export function fmtTime(t?: string | null): string {
  if (!t) return ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return t
  const h = Number(m[1]), min = m[2]
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${min} ${ap}`
}

export const parseLines = (v?: string | null): string[] => {
  if (!v) return []
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.filter(Boolean) : [] }
  catch { return v.split(',').map(x => x.trim()).filter(Boolean) }
}
export const serialiseLines = (a: string[]) => JSON.stringify(a.map(x => x.trim()).filter(Boolean))

/** Stage the tournament is currently on, for the live indicator. */
export function liveStageId(s: TournamentState): string | null {
  if (s.matches.some(m => m.status === 'live')) {
    const m = s.matches.find(x => x.status === 'live')!
    return m.stage_id
  }
  return currentStage(s)?.id ?? null
}
