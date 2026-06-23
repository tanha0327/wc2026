const { fetchWCResults } = require('./lib/football-api.ts')

;(async () => {
  try {
    const data = await fetchWCResults()
    const scorers = data.scorers || []
    const y = scorers.find(s => s.name.includes('ヤマル'))
    const h = scorers.find(s => s.name.includes('ヒメネス'))

    console.log('scorers count:', scorers.length)
    console.log('yamal:', y || null)
    console.log('himenes:', h || null)
    console.log('top 30:')
    scorers.slice(0, 30).forEach((s, i) => console.log(`${i + 1}. ${s.name} (${s.goals})`))
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
