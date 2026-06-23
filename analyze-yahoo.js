const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    
    console.log('=== 日本の試合結果ページのHTMLを取得 ===');
    const page1 = await browser.newPage();
    await page1.goto('https://soccer.yahoo.co.jp/wcup/category/2026/cups/159/31457', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const html1 = await page1.content();
    fs.writeFileSync('/tmp/matches.html', html1);
    console.log('HTML保存完了: /tmp/matches.html');

    // テーブル構造を分析
    const tableAnalysis = await page1.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results = [];

      tables.forEach((table, tableIdx) => {
        const rows = table.querySelectorAll('tbody tr');
        const rowData = [];

        rows.forEach((row, rowIdx) => {
          if (rowIdx < 5) {
            const cells = row.querySelectorAll('td');
            const cellData = [];
            cells.forEach((cell, cellIdx) => {
              cellData.push({
                idx: cellIdx,
                text: cell.innerText?.trim().substring(0, 100),
                html: cell.innerHTML?.substring(0, 100),
              });
            });
            rowData.push({ rowIdx, cells: cellData });
          }
        });

        results.push({ tableIdx, totalRows: rows.length, sample: rowData });
      });

      return results;
    });

    console.log('テーブル構造:', JSON.stringify(tableAnalysis, null, 2));

    console.log('\n=== 得点王ページのHTMLを取得 ===');
    const page2 = await browser.newPage();
    await page2.goto('https://soccer.yahoo.co.jp/wcup/category/2026/stats', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const html2 = await page2.content();
    fs.writeFileSync('/tmp/scorers.html', html2);
    console.log('HTML保存完了: /tmp/scorers.html');

    // テーブル構造を分析
    const scorerAnalysis = await page2.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results = [];

      tables.forEach((table, tableIdx) => {
        const rows = table.querySelectorAll('tbody tr');
        const rowData = [];

        rows.forEach((row, rowIdx) => {
          if (rowIdx < 5) {
            const cells = row.querySelectorAll('td');
            const cellData = [];
            cells.forEach((cell, cellIdx) => {
              cellData.push({
                idx: cellIdx,
                text: cell.innerText?.trim().substring(0, 100),
              });
            });
            rowData.push({ rowIdx, cells: cellData });
          }
        });

        results.push({ tableIdx, totalRows: rows.length, sample: rowData });
      });

      return results;
    });

    console.log('得点王テーブル構造:', JSON.stringify(scorerAnalysis, null, 2));

    console.log('\n=== 優勝予想ページのHTMLを取得 ===');
    const page3 = await browser.newPage();
    await page3.goto('https://soccer.yahoo.co.jp/wcup/category/2026/cups/159/31458', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const html3 = await page3.content();
    fs.writeFileSync('/tmp/rankings.html', html3);
    console.log('HTML保存完了: /tmp/rankings.html');

    const rankAnalysis = await page3.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results = [];

      tables.forEach((table, tableIdx) => {
        const rows = table.querySelectorAll('tbody tr');
        const rowData = [];

        rows.forEach((row, rowIdx) => {
          if (rowIdx < 5) {
            const cells = row.querySelectorAll('td');
            const cellData = [];
            cells.forEach((cell, cellIdx) => {
              cellData.push({
                idx: cellIdx,
                text: cell.innerText?.trim().substring(0, 100),
              });
            });
            rowData.push({ rowIdx, cells: cellData });
          }
        });

        results.push({ tableIdx, totalRows: rows.length, sample: rowData });
      });

      return results;
    });

    console.log('優勝予想テーブル構造:', JSON.stringify(rankAnalysis, null, 2));

  } catch (err) {
    console.error('エラー:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
