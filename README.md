# Tournament Tracker

React + Vite + Tailwind v4 + shadcn/ui front end for the Cloudflare Worker tournament API.

## Setup

```bash
npm install
npx shadcn@latest init      # if you want to re-run; components.json is already configured
npx shadcn@latest add button card table tabs dialog input label badge separator sheet select alert-dialog
npm run dev
```

## Configuration

`VITE_API_URL` — the Cloudflare Worker base URL, no trailing slash.
Defaults are set in `src/lib/api.ts`; override with a `.env.local`:

```
VITE_API_URL=https://njug-tracker.yourname.workers.dev
```

## Deploy

Push to `main`. The GitHub Action builds and publishes to Pages.
In the repo: **Settings → Pages → Source: GitHub Actions**.
Set the Worker URL under **Settings → Secrets and variables → Actions → Variables**
as `VITE_API_URL`.

## Structure

```
src/
  lib/
    api.ts           fetch client for the Worker
    types.ts         shared types
    tournament.ts    standings, tiebreaks, bracket source resolution, conflicts
    useTournament.ts polling hook (skips re-render while typing)
    useRole.ts       staff sign-in
  routes/
    Layout.tsx       header, breadcrumb, staff dialog
    EventsPage.tsx   event list
    TournamentPage.tsx  stage rail, standings, matches
    MatchPage.tsx    match detail + score entry
  components/ui/     shadcn components (added via CLI)
```

## Notes

- Routing is hash-based (`#/t/mens-volleyball`) so GitHub Pages needs no rewrite rules.
- The theme lives in `src/index.css` as CSS variables. Primary is `#EB5E28`.
- Dark mode is on by default via `class="dark"` on `<html>`.


## Auth

- **Organiser** — username + password. Sessions last 12 hours.
- **Staff** — a per-tournament code, rotatable from the admin panel on the tournament page.

Create the first organiser account once, then the endpoint locks itself:

```powershell
Invoke-RestMethod -Uri "$API/api/bootstrap" -Method Post -ContentType "application/json" `
  -Body '{"username":"you","password":"..."}'
```

Set `SESSION_SECRET` in the Worker before going live. Changing it signs everyone out.
