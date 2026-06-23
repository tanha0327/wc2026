import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { fetchWCResults } from '@/lib/football-api'
import { ActualResults, TEAMS, isTournamentStarted } from '@/lib/data'

export const dynamic = 'force-dynamic'

const DOC_PATH = 'meta/results'

export async function GET() {
  try {
    const db = getAdminDb()

    // football-data.org から最新結果を取得
    const fresh = await fetchWCResults()

    // 既存データとマージ（手動入力分を上書きしない）
    const existingSnap = await db.doc(DOC_PATH).get()
    const existing = (existingSnap.exists ? existingSnap.data() : {}) as Partial<ActualResults>
    const validTeamSet = new Set(TEAMS)
    const sanitizeTeams = (teams?: string[]) => (teams || []).filter((t) => validTeamSet.has(t))

    const merged: ActualResults = {
      matches: { ...existing.matches, ...fresh.matches },
      rankings: { ...existing.rankings, ...fresh.rankings },
      advancedTeams: {
        r32: sanitizeTeams(fresh.advancedTeams?.r32).length
          ? sanitizeTeams(fresh.advancedTeams?.r32)
          : sanitizeTeams(existing.advancedTeams?.r32),
        r16: sanitizeTeams(fresh.advancedTeams?.r16).length
          ? sanitizeTeams(fresh.advancedTeams?.r16)
          : sanitizeTeams(existing.advancedTeams?.r16),
        r8: sanitizeTeams(fresh.advancedTeams?.r8).length
          ? sanitizeTeams(fresh.advancedTeams?.r8)
          : sanitizeTeams(existing.advancedTeams?.r8),
        r4plus: sanitizeTeams(fresh.advancedTeams?.r4plus).length
          ? sanitizeTeams(fresh.advancedTeams?.r4plus)
          : sanitizeTeams(existing.advancedTeams?.r4plus),
      },
      scorer: fresh.scorer || existing.scorer,
      scorers: fresh.scorers || existing.scorers || [],
      syncedAt: new Date().toISOString(),
    }

    const sanitizedMerged = JSON.parse(JSON.stringify(merged)) as ActualResults
    await db.doc(DOC_PATH).set(sanitizedMerged)

    // 大会開始後、まだロックされていない予想を一括ロック
    if (isTournamentStarted()) {
      const unlockedSnap = await db.collection('predictions')
        .where('locked', '==', false)
        .get()

      if (!unlockedSnap.empty) {
        const batch = db.batch()
        const lockedAt = new Date().toISOString()
        unlockedSnap.docs.forEach(doc => {
          batch.update(doc.ref, {
            locked: true,
            'current.lockedAt': lockedAt,
          })
        })
        await batch.commit()
        console.log(`[sync] Locked ${unlockedSnap.size} predictions`)
      }
    }

    return NextResponse.json({ success: true, data: merged })
  } catch (err) {
    console.error('[sync] error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
