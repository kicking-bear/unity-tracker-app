import { Navigate, useParams } from 'react-router-dom'

/** Deep links to a match now open the tournament bracket; the sheet handles detail. */
export default function MatchPage() {
  const { slug } = useParams()
  return <Navigate to={`/t/${slug}`} replace />
}
