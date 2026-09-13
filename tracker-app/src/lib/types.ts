export type Role = 'viewer' | 'score' | 'admin'

export interface Player { id: string; name: string; position?: string | null; sort: number }
export interface Team {
  id: string; tournament_id: string; stage_id: string | null
  name: string; captain?: string | null; color?: string | null
  crest?: string | null; manual_rank?: number | null; sort: number
  players: Player[]
}
export interface Stage {
  id: string; tournament_id: string; name: string
  type: 'pool' | 'knockout'; round: number
  best_of: number; target: number; sort: number
}
export interface Period { id: string; match_id: string; no: number; score_a: number; score_b: number }
export interface Match {
  id: string; tournament_id: string; stage_id: string; label?: string | null
  team_a: string | null; team_b: string | null
  source_a?: string | null; source_b?: string | null
  start_time?: string | null; court?: string | null
  ref_team?: string | null; line_team?: string | null
  ref_name?: string | null; line_names?: string | null
  best_of: number; target: number
  status: 'scheduled' | 'live' | 'final'
  version: number; sort: number
  periods: Period[]
}
export interface TournamentConfig {
  tiebreak?: string[]
  third_place?: boolean
  placement_matches?: boolean
  draws_held?: boolean
}
export interface Tournament {
  id: string; event_id: string; name: string; slug: string
  sport: string; division?: string | null
  format: string; status: string
  config: TournamentConfig; sort: number
}
export interface TournamentSummary
  extends Pick<Tournament, 'id' | 'name' | 'slug' | 'sport' | 'division' | 'status'> {
  live_count?: number; final_count?: number; match_count?: number
}
export interface EventRow {
  id: string; name: string; event_date?: string | null; status: string
  tournaments: TournamentSummary[]
}
export interface Block {
  id: string; event_id: string; title: string; details?: string | null
  court?: string | null; start_time?: string | null; end_time?: string | null; sort: number
}
export interface TournamentState {
  event: { id: string; name: string; event_date?: string | null; status: string } | null
  siblings: Pick<Tournament, 'id' | 'name' | 'slug' | 'sport' | 'division' | 'status'>[]
  tournament: Tournament | null
  stages: Stage[]
  teams: Team[]
  matches: Match[]
  blocks?: Block[]
  ts: number
}
export interface StandingRow {
  team: Team; p: number; w: number; l: number
  sw: number; sl: number; pf: number; pa: number; tied: boolean
}
