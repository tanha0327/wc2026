const axios = require('axios');
const { load } = require('cheerio');

(async () => {
  try {
    console.log('=== 日本の試合結果を取得中 ===');
    const res = await axios.get('https://soccer.yahoo.co.jp/wcup/category/2026/cups/159/31457', { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = load(res.data);
    
    console.log('ページサイズ:', res.data.length);
    
    // テーブルがあるか確認
    const tables = $('table');
    console.log('テーブル数:', tables.length);
    
    // 最初のテーブルの内容を確認
    if (tables.length > 0) {
      const firstTable = $(tables[0]);
      const rows = firstTable.find('tbody tr');
      console.log('行数:', rows.length);
      
      rows.slice(0, 5).each((i, row) => {
        const text = $(row).text();
        console.log('行', i, ':', text.substring(0, 150));
      });
    }
    
    console.log('\n=== 得点王ランキングを取得中 ===');
    const res2 = await axios.get('https://soccer.yahoo.co.jp/wcup/category/2026/stats', { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $2 = load(res2.data);
    const tables2 = $2('table');
    console.log('得点王ページ - テーブル数:', tables2.length);
    
    if (tables2.length > 0) {
      const rows2 = $2('table').eq(0).find('tbody tr');
      console.log('得点王行数:', rows2.length);
      rows2.slice(0, 5).each((i, row) => {
        const text = $2(row).text();
        console.log('行', i, ':', text.substring(0, 150));
      });
    }
  } catch (err) {
    console.error('エラー:', err.message);
  }
})();
