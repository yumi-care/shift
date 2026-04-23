const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // ネットワークレスポンスをログ
  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('api')) {
      console.log(`[${response.status()}] ${response.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Error')) {
      console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    }
  });

  try {
    console.log('本番環境にアクセス中...\n');
    await page.goto('https://shift-one-tawny.vercel.app/phase1', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await new Promise(r => setTimeout(r, 2000));

    // 詳細なDOM確認
    const details = await page.evaluate(() => {
      return {
        allText: document.body.innerText.substring(0, 800),
        selects: Array.from(document.querySelectorAll('select')).length,
        inputs: Array.from(document.querySelectorAll('input')).length,
        buttons: Array.from(document.querySelectorAll('button')).length,
        hasReactError: document.querySelector('[role="alert"]') !== null
      };
    });

    console.log('=== ページテキスト（最初の800文字） ===');
    console.log(details.allText);

    console.log('\n=== 見つかった要素 ===');
    console.log(`select: ${details.selects}`);
    console.log(`input: ${details.inputs}`);
    console.log(`button: ${details.buttons}`);

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
