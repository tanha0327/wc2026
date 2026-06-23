import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { TEAMS, orderTeamsByGroupDefinition } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getAdminDb()
  const docRef = db.doc('meta/teams')
  const doc = await docRef.get()

  if (!doc.exists) {
    const payload = { teams: TEAMS, updatedAt: new Date().toISOString() }
    await docRef.set(payload)
    return NextResponse.json(payload)
  }

  const data = doc.data() as { teams?: string[] }
  const teams = Array.isArray(data?.teams) ? orderTeamsByGroupDefinition(data.teams) : []

  const needsReset = !teams.length || teams.length !== TEAMS.length || TEAMS.some(team => !teams.includes(team))
  if (needsReset) {
    const payload = { teams: TEAMS, updatedAt: new Date().toISOString() }
    await docRef.set(payload)
    return NextResponse.json(payload)
  }

  return NextResponse.json({ teams })
}
