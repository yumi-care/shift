const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // コンソールメッセージをキャプチャ
  const consoleLogs = [];
  const consoleErrors = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('error', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.toString()}`);
  });

  try {
    console.log('\n========== エラーチェック ==========\n');

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    await sleep(3000);

    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasErrors: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot,
        bodyContent: document.body.textContent.substring(0, 200),
        reactErrors: document.querySelectorAll('[role="alert"]').length > 0
      };
    });

    console.log('ページ状態:');
    console.log(`  URL: ${pageState.url}`);
    console.log(`  タイトル: ${pageState.title}`);
    console.log(`  本文: ${pageState.bodyContent.substring(0, 100)}\n`);

    if (consoleLogs.length > 0) {
      console.log('【コンソール出力】');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    }

    if (consoleErrors.length > 0) {
      console.log('\n【エラー】');
      consoleErrors.forEach(err => console.log(`  ${err}`));
    }

    if (consoleLogs.length === 0 && consoleErrors.length === 0) {
      console.log('コンソール出力: なし（通常動作）');
    }

    // DOM構造を確認
    const domStructure = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootExists: !!root,
        rootChildren: root ? root.children.length : 0,
        mainElement: !!document.querySelector('main'),
        headerElement: !!document.querySelector('header'),
        errorBoundary: !!document.querySelector('[role="alert"]')
      };
    });

    console.log('\n【DOM構造】');
    console.log(`  #root存在: ${domStructure.rootExists}`);
    console.log(`  rootの子要素数: ${domStructure.rootChildren}`);
    console.log(`  main要素: ${domStructure.mainElement}`);
    console.log(`  header要素: ${domStructure.headerElement}`);
    console.log(`  エラーメッセージ: ${domStructure.errorBoundary ? 'あり' : 'なし'}`);

    console.log('\n========== 終了 ==========\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
