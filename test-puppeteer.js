const puppeteer = require('puppeteer');

(async () => {
  let browser = null;
  try {
    console.log('=== Puppeteerで日本の試合結果を取得中 ===');
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('ページを開いています...');
    await page.goto('https://soccer.yahoo.co.jp/wcup/category/2026/cups/159/31457', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const matches = await page.evaluate(() => {
      const allText = document.body.innerText;
      const scorePattern = /(\d+)\s*[-–]\s*(\d+)/g;
      let match;
      const foundScores = [];

      while ((match = scorePattern.exec(allText)) !== null && foundScores.length < 3) {
        foundScores.push({
          japan: parseInt(match[1], 10),
          opponent: parseInt(match[2], 10),
        });
      }

      return foundScores;
    });

    console.log('取得した試合結果:', matches);

    console.log('\n=== 得点王ランキングを取得中 ===');
    const page2 = await browser.newPage();
    await page2.goto('https://soccer.yahoo.co.jp/wcup/category/2026/stats', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const scorers = await page2.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        if (results.length >= 5) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        const nameCell = cells[0]?.innerText?.trim();
        const goalsCell = cells[cells.length - 1]?.innerText?.trim();

        if (nameCell && goalsCell) {
          const goals = parseInt(goalsCell, 10);
          if (!isNaN(goals) && goals > 0) {
            results.push({ name: nameCell, goals });
          }
        }
      });

      return results;
    });

    console.log('取得した得点王:', scorers);
  } catch (err) {
    console.error('エラー:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
