import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Layout from './routes/Layout'
import EventsPage from './routes/EventsPage'
import TournamentPage from './routes/TournamentPage'
import MatchPage from './routes/MatchPage'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <EventsPage /> },
      { path: 't/:slug', element: <TournamentPage /> },
      { path: 't/:slug/m/:matchId', element: <MatchPage /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>,
)
