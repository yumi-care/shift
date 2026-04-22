import puppeteer from 'puppeteer';
import fs from 'fs';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const screenshotDir = '/tmp/screenshots';
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    console.log('🔍 シフト申告リンク生成テスト\n');

    // ログイン
    console.log('1️⃣ ログイン...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await delay(1500);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find(btn => btn.textContent.includes('デモ'));
      if (demoBtn) demoBtn.click();
    });
    await delay(2000);
    await page.screenshot({ path: `${screenshotDir}/01_login.png` });
    console.log('  ✓ スクリーンショット: 01_login.png\n');

    // Phase 3 に移動
    console.log('2️⃣ Phase 3 （管理者リンク生成）に移動...');
    await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2' });
    await delay(1500);
    await page.screenshot({ path: `${screenshotDir}/02_phase3_admin.png` });
    console.log('  ✓ スクリーンショット: 02_phase3_admin.png');

    // 法人・事業所を選択
    console.log('  法人・事業所を選択...');
    const corpSelect = await page.$('#admin-corp-select');
    const facilitySelect = await page.$('#admin-facility-select');
    
    if (!corpSelect) {
      console.log('  ❌ #admin-corp-select が見つかりません');
      console.log('  ページ内容を確認します...\n');
      const pageContent = await page.evaluate(() => ({
        url: window.location.href,
        h2: document.querySelector('h2')?.textContent,
        h3: document.querySelector('h3')?.textContent,
        hasForm: !!document.querySelector('form'),
        inputIds: Array.from(document.querySelectorAll('input, select')).map(el => el.id || el.name)
      }));
      console.log('  ページ情報:', pageContent);
    } else {
      await page.select('#admin-corp-select', '1');
      await delay(1000);
      await page.screenshot({ path: `${screenshotDir}/03_corp_selected.png` });
      console.log('  ✓ 法人を選択');

      if (facilitySelect) {
        await page.select('#admin-facility-select', '1');
        await delay(1000);
        await page.screenshot({ path: `${screenshotDir}/04_facility_selected.png` });
        console.log('  ✓ 事業所を選択\n');

        // リンク生成
        console.log('3️⃣ リンク生成...');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('リンク生成'));
          if (btn) btn.click();
        });
        await delay(1500);
        await page.screenshot({ path: `${screenshotDir}/05_link_generated.png` });
        console.log('  ✓ スクリーンショット: 05_link_generated.png');

        // 生成されたリンクを取得
        const generatedLink = await page.evaluate(() => {
          const input = document.querySelector('.link-input');
          return input?.value || '';
        });

        if (generatedLink) {
          console.log(`  ✓ リンク生成成功\n`);
          console.log(`  リンク: ${generatedLink}\n`);

          // スタッフ側でアクセス
          console.log('4️⃣ スタッフ側でリンクにアクセス...');
          await page.goto(generatedLink, { waitUntil: 'networkidle2' });
          await delay(1500);
          await page.screenshot({ path: `${screenshotDir}/06_staff_page.png` });
          console.log('  ✓ スクリーンショット: 06_staff_page.png');

          // スタッフ選択ドロップダウンを確認
          const staffSelect = await page.$('#staff-select');
          if (staffSelect) {
            console.log('  ✓ スタッフ選択ドロップダウンが表示されています！\n');
          } else {
            console.log('  ❌ スタッフ選択ドロップダウンが見つかりません');
            const pageInfo = await page.evaluate(() => ({
              url: window.location.href,
              h2: document.querySelector('h2')?.textContent,
              inputCount: document.querySelectorAll('input, select').length,
              bodyText: document.body.textContent.substring(0, 200)
            }));
            console.log('  ページ情報:', pageInfo);
          }
        } else {
          console.log('  ❌ リンクが生成されていません');
        }
      } else {
        console.log('  ❌ #admin-facility-select が見つかりません');
      }
    }

    console.log('\n✓ テスト完了');
    console.log(`スクリーンショットは ${screenshotDir} に保存されています`);
    await delay(2000);
    await browser.close();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
})();
