import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { Prediction, PredictionVersion, isTournamentStarted, TOURNAMENT_START } from '@/lib/data'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getAdminDb()
  const snap = await db.collection('predictions').orderBy('createdAt', 'asc').get()
  const predictions = snap.docs.map(d => d.data() as Prediction)
  return NextResponse.json(predictions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getAdminDb()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const tournamentStarted = isTournamentStarted()

  // 名前で既存の予想を検索
  const existing = await db.collection('predictions')
    .where('name', '==', body.name.trim())
    .limit(1)
    .get()

  if (!existing.empty) {
    // ── 更新：ロックチェック ──────────────────────────────
    const doc = existing.docs[0]
    const pred = doc.data() as Prediction

    if (pred.locked || tournamentStarted) {
      return NextResponse.json(
        { error: '大会が開始されたため予想を変更できません', locked: true },
        { status: 403 }
      )
    }

    const version: PredictionVersion = {
      matches: body.matches,
      rankings: body.rankings,
      scorer: body.scorer ?? { name: '', goals: 0 },
      savedAt: now,
    }

    // 変更履歴に前のバージョンを積む（最大10件）
    const newHistory = [pred.current, ...(pred.history || [])].slice(0, 10)

    await doc.ref.update({
      current: version,
      history: newHistory,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, id: doc.id })
  } else {
    // ── 新規作成 ─────────────────────────────────────────
    if (tournamentStarted) {
      return NextResponse.json(
        { error: '大会が開始されたため新規予想は受け付けていません', locked: true },
        { status: 403 }
      )
    }

    const version: PredictionVersion = {
      matches: body.matches,
      rankings: body.rankings,
      scorer: body.scorer ?? { name: '', goals: 0 },
      savedAt: now,
    }

    const pred: Prediction = {
      id: nanoid(),
      name: body.name.trim(),
      createdAt: now,
      updatedAt: now,
      locked: false,
      current: version,
      history: [],
    }

    await db.collection('predictions').doc(pred.id).set(pred)
    return NextResponse.json({ success: true, id: pred.id })
  }
}
