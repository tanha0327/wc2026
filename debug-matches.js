const puppeteer = require('puppeteer');

(async () => {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('=== 日本の試合結果を取得 ===');
    await page.goto('https://soccer.yahoo.co.jp/wcup/category/2026/cups/159/31457', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // スコア情報を詳細に抽出
    const matchData = await page.evaluate(() => {
      const results = [];
      
      // sc-tableGame テーブルを探す
      const gameTable = document.querySelector('.sc-tableGame');
      if (gameTable) {
        const rows = gameTable.querySelectorAll('tbody tr');
        console.log('Found', rows.length, 'match rows');
        
        rows.forEach((row, idx) => {
          if (idx < 5) {
            const cells = row.querySelectorAll('td');
            const rowData = {
              rowIndex: idx,
              cells: []
            };
            
            cells.forEach((cell, cellIdx) => {
              const className = cell.className;
              const text = cell.innerText?.trim();
              
              rowData.cells.push({
                cellIndex: cellIdx,
                className,
                text: text ? text.substring(0, 50) : '(empty)'
              });
            });
            
            results.push(rowData);
          }
        });
      }
      
      return results;
    });

    console.log('Match data:', JSON.stringify(matchData, null, 2));

    // 別の方法：全テキストから試合結果を抽出
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log('\n=== ページテキスト（最初の1000文字） ===');
    console.log(pageText.substring(0, 1000));
    
    // スコアを探す
    const scoreMatches = pageText.match(/(\d+)\s*[-–]\s*(\d+)/g);
    console.log('\n=== 抽出したスコア ===');
    console.log(scoreMatches ? scoreMatches.slice(0, 10) : 'なし');

  } catch (err) {
    console.error('エラー:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
