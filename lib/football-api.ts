import { ActualResults, JAPAN_MATCHES } from './data'

const BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const YAHOO_SCORER_URL = 'https://soccer.yahoo.co.jp/wcup/category/2026/stats?gk=18'
const YAHOO_SCHEDULE_URL = 'https://soccer.yahoo.co.jp/wcup/category/2026/schedule'

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

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchYahooScorers(): Promise<Array<{ name: string; goals: number }>> {
  try {
    const res = await fetch(YAHOO_SCORER_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })

    if (!res.ok) return []

    const html = await res.text()
    const rows = Array.from(html.matchAll(/<tr class="sc-tableStats__row">[\s\S]*?<\/tr>/gi))

    const scorers = rows
      .map((match) => {
        const row = match[0]
        const nameMatch = row.match(/class="sc-tableStats__data sc-tableStats__data--name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)
        const cells = Array.from(row.matchAll(/<td class="sc-tableStats__data(?: [^\"]*)?">([\s\S]*?)<\/td>/gi))
        const goals = Number.parseInt(decodeHtml(cells[4]?.[1] || '0').replace(/[^0-9-]/g, ''), 10) || 0
        const name = nameMatch ? decodeHtml(nameMatch[1]) : ''

        return name && goals > 0 ? { name, goals } : null
      })
      .filter((item): item is { name: string; goals: number } => Boolean(item))

    const unique = new Map<string, { name: string; goals: number }>()
    scorers.forEach(item => {
      const key = item.name.replace(/\s+/g, '').toLowerCase()
      const existing = unique.get(key)
      if (!existing || item.goals > existing.goals) unique.set(key, item)
    })

    return [...unique.values()].sort((a, b) => b.goals - a.goals)
  } catch (err) {
    console.error('[fetchYahooScorers] error:', err)
    return []
  }
}

async function fetchYahooMatches(): Promise<Record<'j1' | 'j2' | 'j3', { japan: number; opponent: number; status: MatchResult['status'] } | undefined>> {
  const result: Record<'j1' | 'j2' | 'j3', any> = { j1: undefined, j2: undefined, j3: undefined }

  try {
    const res = await fetch(YAHOO_SCHEDULE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })

    if (!res.ok) return result

    const html = await res.text()

    const rows = Array.from(html.matchAll(/<tr[^>]*class="[^"]*js-toggleModuleOff[^"]*"[^>]*>[\s\S]*?<\/tr>/gi))

    for (const row of rows) {
      const rowText = row[0]
      if (!rowText.includes('日本')) continue

      const dateMatch = rowText.match(/sc-tableGame__data--date["\']>([^<]+)/)
      const scoreMatch = rowText.match(/sc-tableGame__scoreDetail["\']>[\s\S]*?(\d+)\s*-\s*(\d+)/)
      const teams = Array.from(rowText.matchAll(/<a class="sc-tableGame__team"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi))

      if (!scoreMatch || teams.length < 2) continue

      const team1Text = teams[0][1]
      const team2Text = teams[1][1]
      const score1 = Number.parseInt(scoreMatch[1])
      const score2 = Number.parseInt(scoreMatch[2])

      const isJapanFirst = team1Text.includes('日本')
      const japanScore = isJapanFirst ? score1 : score2
      const opponentScore = isJapanFirst ? score2 : score1
      const opponent = isJapanFirst ? team2Text : team1Text

      const matchDef = JAPAN_MATCHES.find(
        m => m.opponent === opponent || 
             m.opponentEn === opponent ||
             m.opponent.includes(opponent) ||
             opponent.includes(m.opponent)
      )

      if (matchDef) {
        const key = matchDef.id as 'j1' | 'j2' | 'j3'
        result[key] = {
          japan: japanScore,
          opponent: opponentScore,
          status: rowText.includes('試合終了') ? 'FINISHED' : 'SCHEDULED',
        }
      }
    }

    return result
  } catch (err) {
    console.error('[fetchYahooMatches] error:', err)
    return result
  }
}

export async function fetchWCResults(): Promise<Partial<ActualResults>> {
  const result: Partial<ActualResults> = {
    matches: {},
    rankings: {},
    advancedTeams: { r16: [], r8: [], r4plus: [] },
    syncedAt: new Date().toISOString(),
  }

  try {
    // ① 日本の試合スコア取得（Yahoo を優先）
    const yahooMatches = await fetchYahooMatches()
    Object.assign(result.matches, yahooMatches)

    // football-data.org から日本戦を取得（Yahoo で取得できなかった場合のフォールバック）
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

        // Yahoo で取得できなかった場合のみ football-data のデータを使用
        if (!result.matches![key]) {
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

    // ④ 得点王（Yahoo 個人成績ページを優先）
    const yahooScorers = await fetchYahooScorers()
    if (yahooScorers.length > 0) {
      result.scorer = {
        name: yahooScorers[0].name,
        goals: yahooScorers[0].goals,
      }
      result.scorers = yahooScorers
    } else {
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
