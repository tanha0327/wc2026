import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { fetchWCResults } from '@/lib/football-api'
import { ActualResults } from '@/lib/data'

export const dynamic = 'force-dynamic'

const DOC_PATH = 'meta/results'

export async function GET() {
  const db = getAdminDb()
  const docRef = db.doc(DOC_PATH)
  const doc = await docRef.get()

  if (!doc.exists) {
    const fresh = await fetchWCResults()
    const merged: ActualResults = {
      matches: fresh.matches || {},
      rankings: fresh.rankings || {},
      advancedTeams: fresh.advancedTeams || { r16: [], r8: [], r4plus: [] },
      scorer: fresh.scorer,
      scorers: fresh.scorers || [],
      syncedAt: new Date().toISOString(),
    }
    const sanitized = JSON.parse(JSON.stringify(merged)) as ActualResults
    await docRef.set(sanitized)
    return NextResponse.json(sanitized)
  }

  return NextResponse.json(doc.data() as ActualResults)
}
