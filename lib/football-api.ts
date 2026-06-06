import { ActualResults, JAPAN_MATCHES } from './data'

const BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''

// football-data.org の 2026 W杯 competition id
// 大会前は id=2000 (FIFA World Cup) で取得できる
const WC_ID = 2000

const headers = {
  'X-Auth-Token': API_KEY,
}

interface FDMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: { name: string; shortName: string; tla: string }
  awayTeam: { name: string; shortName: string; tla: string }
  score: {
    winner: string | null
    fullTime: { home: number | null; away: number | null }
  }
}

interface FDStandings {
  season: { currentMatchday: number }
  standings: Array<{
    stage: string
    type: string
    group: string | null
    table: Array<{
      position: number
      team: { name: string; shortName: string }
      playedGames: number
      won: number; draw: number; lost: number
      points: number
    }>
  }>
}

interface FDScorers {
  scorers: Array<{
    player: { name: string }
    team: { name: string }
    goals: number
  }>
}

// チーム名の英語 → 日本語マッピング
const TEAM_EN_JA: Record<string, string> = {
  'Netherlands': 'オランダ',
  'Japan': '日本',
  'Sweden': 'スウェーデン',
  'Tunisia': 'チュニジア',
  'France': 'フランス',
  'Brazil': 'ブラジル',
  'Argentina': 'アルゼンチン',
  'England': 'イングランド',
  'Spain': 'スペイン',
  'Germany': 'ドイツ',
  'Portugal': 'ポルトガル',
  'Belgium': 'ベルギー',
  'Croatia': 'クロアチア',
  'Uruguay': 'ウルグアイ',
  'Senegal': 'セネガル',
  'Morocco': 'モロッコ',
  'USA': 'アメリカ',
  'United States': 'アメリカ',
  'Mexico': 'メキシコ',
  'Colombia': 'コロンビア',
  'Switzerland': 'スイス',
  'Denmark': 'デンマーク',
  'Austria': 'オーストリア',
  'Poland': 'ポーランド',
  'Czechia': 'チェコ',
  'Czech Republic': 'チェコ',
  'Ukraine': 'ウクライナ',
  'Canada': 'カナダ',
  'Australia': 'オーストラリア',
  'Ecuador': 'エクアドル',
  'Qatar': 'カタール',
  'Saudi Arabia': 'サウジアラビア',
  'South Korea': '韓国',
  'Korea Republic': '韓国',
  'Iran': 'イラン',
  'Norway': 'ノルウェー',
  'Scotland': 'スコットランド',
  'Turkey': 'トルコ',
  'Türkiye': 'トルコ',
  'Bosnia and Herzegovina': 'ボスニア・ヘルツェゴビナ',
  'New Zealand': 'ニュージーランド',
  'Iraq': 'イラク',
  'Egypt': 'エジプト',
  'Haiti': 'ハイチ',
  'Panama': 'パナマ',
  'Uzbekistan': 'ウズベキスタン',
  'Curaçao': 'キュラソー',
}

function toJa(en: string): string {
  return TEAM_EN_JA[en] || en
}

export async function fetchWCResults(): Promise<Partial<ActualResults>> {
  const result: Partial<ActualResults> = {
    matches: {},
    rankings: {},
    advancedTeams: { r16: [], r8: [], r4plus: [] },
    syncedAt: new Date().toISOString(),
  }

  try {
    // ① 日本の試合スコア取得
    const matchesRes = await fetch(
      `${BASE}/competitions/${WC_ID}/matches?team=JPN&stage=GROUP_STAGE`,
      { headers, next: { revalidate: 0 } }
    )
    if (matchesRes.ok) {
      const data = await matchesRes.json()
      const fdMatches: FDMatch[] = data.matches || []

      for (const fdMatch of fdMatches) {
        const isJapanHome = fdMatch.homeTeam.tla === 'JPN' || fdMatch.homeTeam.name.includes('Japan')
        const opponent = isJapanHome ? fdMatch.awayTeam.name : fdMatch.homeTeam.name
        const opponentJa = toJa(opponent)

        const matchDef = JAPAN_MATCHES.find(m => m.opponentEn === opponent || m.opponent === opponentJa)
        if (!matchDef) continue

        const key = matchDef.id as 'j1' | 'j2' | 'j3'
        const home = fdMatch.score.fullTime.home
        const away = fdMatch.score.fullTime.away

        if (home !== null && away !== null) {
          result.matches![key] = {
            japan: isJapanHome ? home : away,
            opponent: isJapanHome ? away : home,
            status: fdMatch.status as MatchResult['status'],
          }
        } else {
          result.matches![key] = {
            japan: 0,
            opponent: 0,
            status: fdMatch.status as MatchResult['status'],
          }
        }
      }
    }

    // ② ノックアウトステージ結果（勝ち上がりボーナス用）
    const knockoutRes = await fetch(
      `${BASE}/competitions/${WC_ID}/matches?stage=ROUND_OF_16,QUARTER_FINALS,SEMI_FINALS,FINAL`,
      { headers, next: { revalidate: 0 } }
    )
    if (knockoutRes.ok) {
      const data = await knockoutRes.json()
      const koMatches: FDMatch[] = data.matches || []
      const r16Set = new Set<string>()
      const r8Set = new Set<string>()
      const r4Set = new Set<string>()

      koMatches.forEach(m => {
        const stage = (m as any).stage as string
        const teams = [toJa(m.homeTeam.name), toJa(m.awayTeam.name)]
        if (stage === 'ROUND_OF_16') teams.forEach(t => r16Set.add(t))
        if (stage === 'QUARTER_FINALS') teams.forEach(t => r8Set.add(t))
        if (['SEMI_FINALS', 'FINAL', 'THIRD_PLACE'].includes(stage)) teams.forEach(t => r4Set.add(t))
      })

      result.advancedTeams = {
        r16: [...r16Set],
        r8: [...r8Set],
        r4plus: [...r4Set],
      }

      // ③ 最終順位：FINAL と THIRD_PLACE から取得
      const finalMatch = koMatches.find(m => (m as any).stage === 'FINAL' && m.status === 'FINISHED')
      const thirdMatch = koMatches.find(m => (m as any).stage === 'THIRD_PLACE' && m.status === 'FINISHED')

      if (finalMatch) {
        const winner = finalMatch.score.winner
        if (winner === 'HOME_TEAM') {
          result.rankings!.r1 = toJa(finalMatch.homeTeam.name)
          result.rankings!.r2 = toJa(finalMatch.awayTeam.name)
        } else if (winner === 'AWAY_TEAM') {
          result.rankings!.r1 = toJa(finalMatch.awayTeam.name)
          result.rankings!.r2 = toJa(finalMatch.homeTeam.name)
        }
      }
      if (thirdMatch) {
        const winner = thirdMatch.score.winner
        if (winner === 'HOME_TEAM') {
          result.rankings!.r3 = toJa(thirdMatch.homeTeam.name)
          result.rankings!.r4 = toJa(thirdMatch.awayTeam.name)
        } else if (winner === 'AWAY_TEAM') {
          result.rankings!.r3 = toJa(thirdMatch.awayTeam.name)
          result.rankings!.r4 = toJa(thirdMatch.homeTeam.name)
        }
      }
    }

    // ④ 得点王
    const scorerRes = await fetch(
      `${BASE}/competitions/${WC_ID}/scorers?limit=100`,
      { headers, next: { revalidate: 0 } }
    )
    if (scorerRes.ok) {
      const data: FDScorers = await scorerRes.json()
      if (data.scorers?.length > 0) {
        result.scorer = {
          name: data.scorers[0].player.name,
          goals: data.scorers[0].goals,
        }
        result.scorers = data.scorers.map(s => ({
          name: s.player.name,
          goals: s.goals,
        }))
      }
    }
  } catch (err) {
    console.error('[fetchWCResults] error:', err)
  }

  return result
}

// MatchResult の型をここでも export
export type { MatchResult }
interface MatchResult {
  japan: number
  opponent: number
  status: 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED'
}
