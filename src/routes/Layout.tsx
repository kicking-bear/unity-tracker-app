import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/lib/useRole'
import { RoleContext } from '@/lib/roleContext'

export default function Layout() {
  const roleApi = useRole()
  const { role, username, isStaff, login, useCode, signOut } = roleApi
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('staff')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const loc = useLocation()

  function close() { setOpen(false); setErr(''); setPass(''); setCode('') }

  async function doLogin() {
    setBusy(true); setErr('')
    try { await login(user.trim(), pass); close() }
    catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  async function doCode() {
    setBusy(true); setErr('')
    try { await useCode(code.trim()); close() }
    catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  const label = role === 'admin' ? (username ?? 'Admin') : role === 'score' ? 'Staff' : 'Staff Access'

  return (
    <RoleContext.Provider value={roleApi}>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight">Tournaments</Link>
          <div className="ml-auto flex items-center gap-2">
            {isStaff && (
              <Button variant="ghost" size="sm" onClick={signOut}
                      className="text-muted-foreground">Sign out</Button>
            )}
            <Button variant={isStaff ? 'secondary' : 'ghost'} size="sm"
                    onClick={() => setOpen(true)}>{label}</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5" key={loc.pathname}>
        <Outlet />
      </main>

      <Dialog open={open} onOpenChange={o => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Staff Access</DialogTitle>
            <DialogDescription>
              {isStaff
                ? <>Signed in as <span className="font-medium text-foreground">
                    {role === 'admin' ? (username ?? 'admin') : 'staff'}</span>.</>
                : 'Scorekeepers use a code. Organisers sign in with an account.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={t => { setTab(t); setErr('') }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff code</TabsTrigger>
              <TabsTrigger value="admin">Organiser</TabsTrigger>
            </TabsList>

            <TabsContent value="staff" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={code} autoComplete="off" placeholder="score-xxxxxx"
                  className="font-mono"
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doCode()} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button className="w-full" onClick={doCode} disabled={busy}>Continue</Button>
            </TabsContent>

            <TabsContent value="admin" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="user">Username</Label>
                <Input id="user" value={user} autoComplete="username"
                  onChange={e => setUser(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pass">Password</Label>
                <div className="relative">
                  <Input id="pass" type={show ? 'text' : 'password'} value={pass}
                    autoComplete="current-password" className="pr-10"
                    onChange={e => setPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doLogin()} />
                  <button type="button" onClick={() => setShow(s => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button className="w-full" onClick={doLogin} disabled={busy}>Sign in</Button>
            </TabsContent>
          </Tabs>

          {isStaff && (
            <DialogFooter>
              <Button variant="outline" className="w-full"
                onClick={() => { signOut(); close() }}>Sign out</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </RoleContext.Provider>
  )
}
