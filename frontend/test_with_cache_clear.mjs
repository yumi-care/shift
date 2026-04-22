import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('🔄 ブラウザキャッシュをクリアして再確認...\n');

    // キャッシュクリア
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCache');
    console.log('✓ ブラウザキャッシュをクリア\n');

    // ログイン
    console.log('1️⃣ ログイン...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1500);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find(btn => btn.textContent.includes('デモ'));
      if (demoBtn) demoBtn.click();
    });
    await delay(2500);
    console.log('✓ ログイン完了\n');

    // Phase 3 に移動
    console.log('2️⃣ Phase 3 に移動...');
    await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // ページの内容を確認
    const pageInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      h2: document.querySelector('h2')?.textContent,
      h3: document.querySelector('h3')?.textContent,
      hasAdminForm: !!document.getElementById('admin-corp-select'),
      elementIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id).slice(0, 10)
    }));

    console.log('\n📊 ページ情報:');
    console.log('  URL:', pageInfo.url);
    console.log('  Title:', pageInfo.title);
    console.log('  H2:', pageInfo.h2);
    console.log('  H3:', pageInfo.h3);
    console.log('  管理者フォーム存在:', pageInfo.hasAdminForm);
    console.log('  Element IDs:', pageInfo.elementIds);

    if (pageInfo.hasAdminForm) {
      console.log('\n✅ Phase 3 管理者フォームが正しく表示されています！');
    } else {
      console.log('\n❌ Phase 3 管理者フォームが見つかりません');
      console.log('  違う画面が表示されている可能性があります');
    }

    console.log('\n✓ 確認完了');
    await delay(3000);
    await browser.close();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
})();
