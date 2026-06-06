// ── 2026 W杯 日本グループF ──────────────────────────────────
// football-data.org の competition id: WC2026
export const WC_COMPETITION_ID = 2000 // football-data.org World Cup id

export const JAPAN_MATCHES = [
  {
    id: 'j1',
    fdMatchId: null as number | null, // football-data.org の matchId (sync後に設定)
    date: '6月15日',
    dateISO: '2026-06-15',
    opponent: 'オランダ',
    opponentEn: 'Netherlands',
    venue: 'AT&Tスタジアム（テキサス州）',
  },
  {
    id: 'j2',
    fdMatchId: null as number | null,
    date: '6月21日',
    dateISO: '2026-06-21',
    opponent: 'チュニジア',
    opponentEn: 'Tunisia',
    venue: 'Estadio BBVA（メキシコ）',
  },
  {
    id: 'j3',
    fdMatchId: null as number | null,
    date: '6月26日',
    dateISO: '2026-06-26',
    opponent: 'スウェーデン',
    opponentEn: 'Sweden',
    venue: 'AT&Tスタジアム（テキサス州）',
  },
]

export type TeamGroupLabel =
  | 'A' | 'B' | 'C' | 'D'
  | 'E' | 'F' | 'G' | 'H'
  | 'I' | 'J' | 'K' | 'L'

export interface TeamGroup {
  label: string
  teams: string[]
}

export const GROUPED_TEAMS: TeamGroup[] = [
  { label: 'グループA', teams: ['メキシコ', '南アフリカ', '韓国', 'チェコ'] },
  { label: 'グループB', teams: ['カナダ', 'ボスニア・ヘルツェゴビナ', 'カタール', 'スイス'] },
  { label: 'グループC', teams: ['ブラジル', 'モロッコ', 'ハイチ', 'スコットランド'] },
  { label: 'グループD', teams: ['アメリカ', 'パラグアイ', 'オーストラリア', 'トルコ'] },
  { label: 'グループE', teams: ['ドイツ', 'キュラソー', 'コートジボワール', 'エクアドル'] },
  { label: 'グループF', teams: ['オランダ', '日本', 'スウェーデン', 'チュニジア'] },
  { label: 'グループG', teams: ['ベルギー', 'エジプト', 'イラン', 'ニュージーランド'] },
  { label: 'グループH', teams: ['スペイン', 'カーボベルデ', 'サウジアラビア', 'ウルグアイ'] },
  { label: 'グループI', teams: ['フランス', 'セネガル', 'イラク', 'ノルウェー'] },
  { label: 'グループJ', teams: ['アルゼンチン', 'アルジェリア', 'オーストリア', 'ヨルダン'] },
  { label: 'グループK', teams: ['ポルトガル', 'コンゴ民主共和国', 'ウズベキスタン', 'コロンビア'] },
  { label: 'グループL', teams: ['イングランド', 'クロアチア', 'ガーナ', 'パナマ'] },
]

export const TEAMS = GROUPED_TEAMS.flatMap(group => group.teams)

const TEAM_ORDER: Record<string, number> = TEAMS.reduce((acc, team, index) => {
  acc[team] = index
  return acc
}, {} as Record<string, number>)

export function orderTeamsByGroupDefinition(teams: string[]): string[] {
  return [...teams].sort((a, b) => {
    const aIndex = TEAM_ORDER[a] ?? Number.MAX_SAFE_INTEGER
    const bIndex = TEAM_ORDER[b] ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.localeCompare(b, 'ja')
  })
}

export function groupTeamsByDefinition(teams: string[]): TeamGroup[] {
  const teamSet = new Set(teams)
  return GROUPED_TEAMS.map(group => ({
    label: group.label,
    teams: group.teams.filter(team => teamSet.has(team)),
  }))
}

// ── 大会開始日 ────────────────────────────────────────────
export const TOURNAMENT_START = new Date(
  process.env.TOURNAMENT_START_ISO || '2026-06-11T03:00:00.000Z'
)

export function isTournamentStarted(): boolean {
  return new Date() >= TOURNAMENT_START
}

// ── 型定義 ────────────────────────────────────────────────
export interface ScoreData {
  japan: number
  opponent: number
}

export interface PredictionVersion {
  matches: { j1: ScoreData; j2: ScoreData; j3: ScoreData }
  rankings: { r1: string; r2: string; r3: string; r4: string }
  scorer: { name: string; goals: number }
  savedAt: string // ISO string
  lockedAt?: string // 大会開始でロックされた時刻
}

export interface Prediction {
  id: string // nanoid
  name: string
  createdAt: string
  updatedAt: string
  locked: boolean // 大会開始後 true に設定
  // 現在の（最後に保存された）予想
  current: PredictionVersion
  // 変更履歴（最大10件）
  history: PredictionVersion[]
}

export interface MatchResult {
  japan: number
  opponent: number
  status: 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED'
}

export interface ActualResults {
  matches: {
    j1?: MatchResult
    j2?: MatchResult
    j3?: MatchResult
  }
  rankings: {
    r1?: string
    r2?: string
    r3?: string
    r4?: string
  }
  advancedTeams: {
    r16: string[]
    r8: string[]
    r4plus: string[]
  }
  scorer?: { name: string; goals: number }
  scorers?: Array<{ name: string; goals: number }>
  syncedAt?: string
}

// ── ポイント計算 ──────────────────────────────────────────
export interface PointBreakdown {
  match: number
  ranking: number
  scorer: number
  total: number
  details: {
    j1: number; j2: number; j3: number
    r1: number; r2: number; r3: number; r4: number
    scorerPts: number
  }
}

export function calcPoints(pred: Prediction, results: ActualResults | null): PointBreakdown {
  const zero: PointBreakdown = {
    match: 0, ranking: 0, scorer: 0, total: 0,
    details: { j1:0, j2:0, j3:0, r1:0, r2:0, r3:0, r4:0, scorerPts:0 },
  }
  if (!results) return zero

  // 使うのは常に current（ロック済みバージョン）
  const p = pred.current
  let matchPts = 0
  const matchDetails = { j1: 0, j2: 0, j3: 0 }

  const matchKeys = ['j1', 'j2', 'j3'] as const
  matchKeys.forEach((key) => {
    const pScore = p.matches[key]
    const rScore = results.matches[key]
    if (!rScore || rScore.status !== 'FINISHED') return
    let pts = 0
    if (pScore.japan === rScore.japan && pScore.opponent === rScore.opponent) {
      pts = 10
    } else if (pScore.japan - pScore.opponent === rScore.japan - rScore.opponent) {
      pts = 3
    } else if (Math.sign(pScore.japan - pScore.opponent) === Math.sign(rScore.japan - rScore.opponent)) {
      pts = 1
    }
    matchDetails[key] = pts
    matchPts += pts
  })

  let rankPts = 0
  const rankDetails = { r1: 0, r2: 0, r3: 0, r4: 0 }
  const rankMap = { r1: 30, r2: 20, r3: 15, r4: 10 } as const
  const rankKeys = ['r1', 'r2', 'r3', 'r4'] as const
  rankKeys.forEach((key) => {
    const predicted = p.rankings[key]
    const actual = results.rankings[key]
    if (!predicted) return
    let pts = 0
    if (predicted === actual) {
      pts = rankMap[key]
    } else {
      const { r16, r8, r4plus } = results.advancedTeams
      if (r4plus.includes(predicted)) pts = 5
      else if (r8.includes(predicted)) pts = 3
      else if (r16.includes(predicted)) pts = 1
    }
    rankDetails[key] = pts
    rankPts += pts
  })

  // 得点王は的中なら10pt。外れても、選んだ選手が得点したら1点1pt。
  let scorerPts = 0
  if (p.scorer?.name && results.scorer?.name) {
    if (p.scorer.name === results.scorer.name) {
      scorerPts = 10
    } else {
      const selected = results.scorers?.find(s => s.name === p.scorer.name)
      if (selected) scorerPts = selected.goals
    }
  }

  const total = matchPts + rankPts + scorerPts
  return {
    match: matchPts,
    ranking: rankPts,
    scorer: scorerPts,
    total,
    details: { ...matchDetails, ...rankDetails, scorerPts },
  }
}

// 得点王候補（大会全体からの30名と日本専用10名）
export const SCORER_CANDIDATES: Array<{ name: string; note: string }> = [
  { name: 'キリアン・エムバペ', note: '得点王最有力候補！' },
  { name: 'アーリング・ハーランド', note: '世界最強クラスの怪物！' },
  { name: 'ハリー・ケイン', note: '得点王経験の絶対エース！' },
  { name: 'クリスティアーノ・ロナウド', note: '伝説はまだ終わらない！' },
  { name: 'ヴィニシウス・ジュニオール', note: 'ブラジルの超新エース！' },
  { name: 'ラウタロ・マルティネス', note: '世界王者の主砲！' },
  { name: 'フリアン・アルバレス', note: '勝負強さは世界屈指！' },
  { name: 'ウスマン・デンベレ', note: '爆発力なら世界トップ級！' },
  { name: 'ラミン・ヤマル', note: '世界を驚かす天才少年！' },
  { name: 'ニコ・ウィリアムズ', note: '止められない快速アタッカー！' },
  { name: 'ブカヨ・サカ', note: 'イングランドの得点源！' },
  { name: 'コール・パーマー', note: '新時代のスター候補！' },
  { name: 'ジュード・ベリンガム', note: 'ゴールも奪う万能MF！' },
  { name: 'ロドリゴ', note: '大舞台に強い点取り屋！' },
  { name: 'ラフィーニャ', note: '得点も演出も超一流！' },
  { name: 'ネイマール', note: '最後の輝きを見せるか！' },
  { name: 'アレクサンデル・イサク', note: '北欧が誇る万能FW！' },
  { name: 'ヴィクトル・ギェケレシュ', note: '欧州最強級の得点力！' },
  { name: 'ヴィクター・オシムヘン', note: 'アフリカ最強ストライカー！' },
  { name: 'ジョナサン・デイビッド', note: '開催地を沸かす主砲！' },
  { name: 'モハメド・サラー', note: '世界屈指のレフティー！' },
  { name: 'フヴィチャ・クヴァラツヘリア', note: 'ジョージアの至宝！' },
  { name: 'ベンヤミン・シェシュコ', note: '次世代の怪物候補！' },
  { name: 'セルー・ギラシ', note: '得点感覚は超一流！' },
  { name: 'パトリック・シック', note: '一撃必殺のストライカー！' },
  { name: 'フロリアン・ヴィルツ', note: 'ドイツ復活の旗手！' },
  { name: 'ジャマル・ムシアラ', note: '世界屈指のドリブラー！' },
  { name: 'アルダ・ギュレル', note: 'トルコの天才レフティー！' },
  { name: 'ケナン・ユルディズ', note: '未来を担う新エース！' },
  { name: 'ジョアン・ペドロ', note: '覚醒期待の新星FW！' },
]

export const JAPAN_SCORER_CANDIDATES: Array<{ name: string; note: string }> = [
  { name: '上田綺世', note: '日本のゴール量産機！' },
  { name: '久保建英', note: '日本が誇る天才司令塔！' },
  { name: '中村敬斗', note: '今最もノッてる点取り屋！' },
  { name: '前田大然', note: '爆速プレスでゴール奪取！' },
  { name: '堂安律', note: '大舞台で輝く勝負師！' },
  { name: '小川航基', note: '一瞬で仕留めるストライカー！' },
  { name: '伊東純也', note: '爆速カウンターの切り札！' },
  { name: '後藤啓介', note: '未来のエース候補！' },
  { name: '塩貝健人', note: 'ブレイク期待の若武者！' },
  { name: '鎌田大地', note: '勝負を決める仕事人！' },
]
