import { useCallback, useEffect, useState } from 'react'
import { api, getSession, getStaffCode, setSession, setStaffCode } from './api'
import type { Role } from './types'

export function useRole() {
  const [role, setRole] = useState<Role>('viewer')
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    if (!getSession() && !getStaffCode()) return
    api.whoami()
      .then(r => { setRole(r.role); setUsername(r.username) })
      .catch(() => { setSession(''); setStaffCode('') })
  }, [])

  const login = useCallback(async (u: string, p: string) => {
    const r = await api.login(u, p)
    setStaffCode('')
    setSession(r.token)
    setRole('admin'); setUsername(r.username)
  }, [])

  const useCode = useCallback(async (code: string) => {
    const r = await api.staffCheck(code)
    setSession('')
    setStaffCode(code)
    setRole('score'); setUsername(null)
    return r.tournaments
  }, [])

  const signOut = useCallback(() => {
    setSession(''); setStaffCode(''); setRole('viewer'); setUsername(null)
  }, [])

  return { role, username, login, useCode, signOut,
    isStaff: role !== 'viewer', isAdmin: role === 'admin' }
}
