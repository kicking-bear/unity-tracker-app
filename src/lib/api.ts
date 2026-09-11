import type { EventRow, TournamentState, Role } from './types'

// Cloudflare Worker base URL — no trailing slash
export const API = import.meta.env.VITE_API_URL ?? 'https://unity-tracker.danielmanning94.workers.dev'

const SESSION = 'tt_session'
const STAFF = 'tt_staff'

export const getSession = () => sessionStorage.getItem(SESSION) ?? ''
export const setSession = (t: string) =>
  t ? sessionStorage.setItem(SESSION, t) : sessionStorage.removeItem(SESSION)
export const getStaffCode = () => sessionStorage.getItem(STAFF) ?? ''
export const setStaffCode = (c: string) =>
  c ? sessionStorage.setItem(STAFF, c) : sessionStorage.removeItem(STAFF)

function authHeaders(): Record<string, string> {
  const s = getSession()
  if (s) return { 'X-Session': s }
  const c = getStaffCode()
  if (c) return { 'X-Staff-Code': c }
  return {}
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error((data as { error?: string }).error ?? res.statusText),
      { status: res.status, data })
  }
  return data as T
}

export interface StaffTournament { id: string; name: string; slug: string }

export const api = {
  events: () => req<{ events: EventRow[] }>('/api/events'),
  tournament: (slug: string) => req<TournamentState>('/api/tournament?slug=' + encodeURIComponent(slug)),
  whoami: () => req<{ role: Role; username: string | null }>('/api/whoami'),

  login: (username: string, password: string) =>
    req<{ ok: boolean; token: string; username: string }>('/api/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }),

  staffCheck: (code: string) =>
    req<{ ok: boolean; tournaments: StaffTournament[] }>('/api/staff',
      { method: 'POST', body: JSON.stringify({ code }) }),

  saveScore: (body: { match_id: string; periods: { a: number; b: number }[]; version: number; status: string }) =>
    req<{ ok: boolean; version: number }>('/api/score', { method: 'POST', body: JSON.stringify(body) }),

  codes: () => req<{ events: { id: string; name: string; staff_code: string }[] }>('/api/codes'),
  rotateCode: (event_id: string, code?: string) =>
    req<{ ok: boolean; code: string }>('/api/staffcode',
      { method: 'POST', body: JSON.stringify({ event_id, code }) }),
  addBlock: (b: Record<string, unknown>) =>
    req<{ ok: boolean; id: string }>('/api/block', { method: 'POST', body: JSON.stringify(b) }),
  deleteBlock: (id: string) =>
    req<{ ok: boolean }>('/api/block/' + id, { method: 'DELETE' }),
  saveTeams: (teams: { id: string; name: string; color: string | null; stage_id: string | null; sort: number }[]) =>
    req<{ ok: boolean }>('/api/teams', { method: 'PATCH', body: JSON.stringify({ teams }) }),

  patchMatch: (id: string, fields: Record<string, unknown>) =>
    req<{ ok: boolean }>('/api/match/' + id, { method: 'PATCH', body: JSON.stringify(fields) }),
  patchTeam: (id: string, fields: Record<string, unknown>) =>
    req<{ ok: boolean }>('/api/team/' + id, { method: 'PATCH', body: JSON.stringify(fields) }),
  patchTournament: (id: string, fields: Record<string, unknown>) =>
    req<{ ok: boolean }>('/api/tournament/' + id, { method: 'PATCH', body: JSON.stringify(fields) }),
  patchEvent: (id: string, fields: Record<string, unknown>) =>
    req<{ ok: boolean }>('/api/event/' + id, { method: 'PATCH', body: JSON.stringify(fields) }),
  deleteMatch: (id: string) =>
    req<{ ok: boolean }>('/api/match/' + id, { method: 'DELETE' }),
  resetTournament: (tournament_id: string) =>
    req<{ ok: boolean }>('/api/reset', { method: 'POST', body: JSON.stringify({ tournament_id }) }),
}
