const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== 最終確認 ===\n');

    // ブラウザのキャッシュをクリア
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // localStorage を完全に削除
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('✓ ブラウザキャッシュクリア\n');
    await wait(1000);

    // Phase 3 にアクセス
    console.log('Phase 3 にアクセス...\n');
    await page.goto('http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4', { waitUntil: 'networkidle2' });
    await wait(3000);

    // 実際の表示を確認
    const pageContent = await page.evaluate(() => {
      return {
        corpName: document.body.innerText.includes('ゆうみ株式会社') ? 'ゆうみ株式会社' : 'ゆうみのいえ法人',
        facilityName: document.body.innerText.includes('ゆうみのいえ') ? 'ゆうみのいえ' : 'unknown',
        pageText: document.body.innerText.substring(0, 400),
        corporations: localStorage.getItem('corporations')
      };
    });

    console.log('=== 画面表示確認 ===\n');
    console.log('法人名:', pageContent.corpName);
    console.log('事業所名:', pageContent.facilityName);
    console.log('\nlocalStorage corporations:', pageContent.corporations);
    console.log('\nページ内容:');
    console.log(pageContent.pageText);

    if (pageContent.corpName === 'ゆうみ株式会社') {
      console.log('\n✅ SUCCESS! 法人名が正しく表示されています');
    } else {
      console.log('\n❌ FAIL! 法人名が変わっていません');
    }

    console.log('\n60秒後に閉じます...\n');
    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
