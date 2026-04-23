const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('error', err => {
    errors.push(err.message);
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  try {
    console.log('本番環境にアクセス中...');
    await page.goto('https://shift-one-tawny.vercel.app/phase1', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('\n=== ページ読み込み完了 ===\n');

    // ページの状態確認
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        hasError: !!document.querySelector('[role="alert"], .error, .alert-danger'),
        errorText: document.querySelector('[role="alert"], .error, .alert-danger')?.textContent || null,
        hasForm: !!document.querySelector('form, select, input'),
        windowError: window.lastError || null
      };
    });

    console.log('ページ状態:', JSON.stringify(pageState, null, 2));

    // コンソール出力
    console.log('\n=== コンソール出力 ===');
    logs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });

    // エラー
    if (errors.length > 0) {
      console.log('\n=== エラー ===');
      errors.forEach(err => console.log(err));
    }

    // Network エラーをキャッチ
    console.log('\n=== ネットワーク監視 ===');
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ ${response.status()} ${response.url()}`);
      }
    });

    await new Promise(r => setTimeout(r, 2000));

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
