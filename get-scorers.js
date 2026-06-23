const puppeteer = require('puppeteer');

(async () => {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('=== Yahooから得点王ランキングを取得中 ===');
    await page.goto('https://soccer.yahoo.co.jp/wcup/category/2026/stats', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const scorers = await page.evaluate(() => {
      const results = [];
      const statsTable = document.querySelector('.sc-tableStats');
      if (!statsTable) return results;

      const rows = statsTable.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        if (results.length >= 30) return;

        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        const nameCell = cells[1]?.innerText?.trim();
        const goalsCell = cells[4]?.innerText?.trim();

        if (nameCell && goalsCell) {
          const goals = parseInt(goalsCell, 10);
          if (!isNaN(goals) && goals > 0) {
            results.push({ name: nameCell, goals });
          }
        }
      });

      return results;
    });

    console.log('取得した得点王（上位30名）:');
    scorers.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.goals}ゴール)`);
    });

  } catch (err) {
    console.error('エラー:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
