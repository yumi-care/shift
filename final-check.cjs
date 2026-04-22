const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('\n✓ キャッシュクリア\n');
    await wait(2000);

    console.log('Phase 3 へ...\n');
    await page.goto('http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4', { waitUntil: 'networkidle2' });
    await wait(3000);

    const result = await page.evaluate(() => {
      const corps = localStorage.getItem('corporations');
      return {
        corps: corps ? JSON.parse(corps)[0].corp_name : 'none',
        text: document.body.innerText.substring(0, 400)
      };
    });

    console.log('=== 結果 ===\n');
    console.log('localStorage:', result.corps);
    console.log('\n画面:');
    console.log(result.text);

    if (result.corps === 'ゆうみ株式会社') {
      console.log('\n✅ OK - 修正されています');
    } else {
      console.log('\n❌ NG - 修正されていません');
    }

    await wait(60000);
    await browser.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
