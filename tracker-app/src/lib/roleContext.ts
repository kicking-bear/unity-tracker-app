import { createContext, useContext } from 'react'
import type { Role } from './types'
import type { StaffTournament } from './api'

export interface RoleApi {
  role: Role
  username: string | null
  isStaff: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  useCode: (code: string) => Promise<StaffTournament[]>
  signOut: () => void
}

export const RoleContext = createContext<RoleApi>({
  role: 'viewer', username: null, isStaff: false, isAdmin: false,
  login: async () => {}, useCode: async () => [], signOut: () => {},
})

export const useRoleContext = () => useContext(RoleContext)
