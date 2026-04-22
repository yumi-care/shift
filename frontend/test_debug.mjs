import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('デバッグ開始...\n');

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await delay(2000);

    // ページの内容をログ
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        h1: document.querySelector('h1')?.textContent,
        h2: document.querySelector('h2')?.textContent,
        hasCorpSelect: !!document.querySelector('#corp-select'),
        hasLoginForm: !!document.querySelector('[type="password"]'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });

    console.log('ページ情報：', pageContent);

    await delay(3000);
    await browser.close();
  } catch (error) {
    console.error('エラー:', error.message);
  }
})();
