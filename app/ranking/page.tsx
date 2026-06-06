'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Prediction, ActualResults, calcPoints } from '@/lib/data'

interface Entry { pred: Prediction; pts: ReturnType<typeof calcPoints> }

export default function RankingPage() {
  const [entries,   setEntries]   = useState<Entry[]>([])
  const [results,   setResults]   = useState<ActualResults|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [syncing,   setSyncing]   = useState(false)
  const [syncedAt,  setSyncedAt]  = useState<string|null>(null)

  const load = async () => {
    const [pr, rr] = await Promise.all([
      fetch('/api/predictions').then(r=>r.json()),
      fetch('/api/results').then(r=>r.json()),
    ])
    const res: ActualResults|null = rr
    setResults(res)
    setSyncedAt(res?.syncedAt || null)
    const sorted = (pr as Prediction[])
      .map(p => ({ pred: p, pts: calcPoints(p, res) }))
      .sort((a,b) => b.pts.total - a.pts.total)
    setEntries(sorted)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/sync')
    await load()
    setSyncing(false)
  }

  const posClass = (i:number) => i===0?'gold':i===1?'silver':i===2?'bronze':''
  const posLabel = (i:number) => i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`

  return (
    <main>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">⚽ W杯<span className="hi">2026</span></Link>
          <div className="nav-links">
            <Link href="/" className="nav-link">予想入力</Link>
            <Link href="/ranking" className="nav-link active">ランキング</Link>
          </div>
        </div>
      </nav>

      <div className="container page-wrap">
        <div className="hero" style={{paddingBottom:16}}>
          <div className="eyebrow">🏆 LIVE RANKING</div>
          <h1 className="hero-title">順位<span className="ac">表</span></h1>
        </div>

        <div className="sync-bar">
          <span>
            <span className={`dot ${syncedAt?'dot-live':'dot-off'}`}></span>
            {syncedAt ? `更新: ${new Date(syncedAt).toLocaleString('ja-JP')}` : '未同期'}
          </span>
          <button className="btn-ghost" onClick={sync} disabled={syncing}>
            {syncing ? '取得中...' : '🔄 結果を同期'}
          </button>
        </div>

        <div className="card">
          {loading && <div className="empty"><div className="empty-icon">⏳</div>読み込み中...</div>}
          {!loading && entries.length===0 && (
            <div className="empty">
              <div className="empty-icon">🎯</div>
              <p style={{marginBottom:12}}>まだ予想が登録されていません</p>
              <Link href="/" style={{color:'var(--blue-glow)', fontSize:14}}>予想を入力する →</Link>
            </div>
          )}
          {entries.map((e,i) => (
            <Link href={`/predict/${e.pred.id}`} className="rank-row" key={e.pred.id}>
              <div className={`rank-num ${posClass(i)}`}>{posLabel(i)}</div>
              <div className="rank-info">
                <div className="rank-name">
                  {e.pred.name}
                  {e.pred.locked
                    ? <span className="badge-lock" style={{marginLeft:8}}>🔒 確定</span>
                    : <span className="badge-open" style={{marginLeft:8}}>✏️ 編集可</span>
                  }
                </div>
                <div className="rank-sub">
                  {results
                    ? `試合 ${e.pts.match}pt ／ 順位 ${e.pts.ranking}pt ／ 得点王 ${e.pts.scorer}pt`
                    : '詳細を見る →'}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="rank-pts">{e.pts.total}</div>
                <div className="rank-pts-unit">pt</div>
              </div>
              <span className="rank-arrow">›</span>
            </Link>
          ))}
        </div>

        <div className="mt16" style={{textAlign:'center'}}>
          <Link href="/" className="btn-ghost">＋ 予想を追加する</Link>
        </div>
      </div>
    </main>
  )
}
