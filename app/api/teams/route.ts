import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { TEAMS } from '@/lib/data'

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
  if (!data?.teams?.length) {
    const payload = { teams: TEAMS, updatedAt: new Date().toISOString() }
    await docRef.set(payload)
    return NextResponse.json(payload)
  }

  return NextResponse.json({ teams: data.teams })
}
