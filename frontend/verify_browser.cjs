const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,  // ブラウザを表示
    args: ['--no-sandbox']
  });

  try {
    console.log('\n========== ブラウザ起動確認 ==========\n');

    const page = await browser.newPage();

    // ダッシュボードにアクセス
    console.log('ダッシュボードを開いています...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await sleep(2000);

    // ページの状態を確認
    const dashboardState = await page.evaluate(() => {
      const staffTable = document.querySelector('.shift-table');
      const setupRequired = document.querySelector('.setup-required');

      return {
        hasTable: !!staffTable,
        needsSetup: !!setupRequired,
        pageTitle: document.title,
        heading: document.querySelector('h2')?.textContent || 'なし'
      };
    });

    console.log('✓ ページロード完了');
    console.log(`  タイトル: ${dashboardState.pageTitle}`);
    console.log(`  ヘッディング: ${dashboardState.heading}`);
    console.log(`  テーブル表示: ${dashboardState.hasTable ? 'あり' : 'なし'}`);

    if (dashboardState.hasTable) {
      console.log('\n✓ データが表示されています！');

      // テーブルの内容を確認
      const tableData = await page.evaluate(() => {
        const rows = document.querySelectorAll('.shift-table tbody tr');
        return Array.from(rows).slice(0, 3).map(row => ({
          staffName: row.cells[0]?.textContent || '',
          position: row.cells[1]?.textContent || '',
          workDays: row.cells[2]?.textContent || '',
          status: row.cells[4]?.textContent || ''
        }));
      });

      console.log('\n【スタッフ一覧】');
      tableData.forEach((staff, i) => {
        console.log(`${i + 1}. ${staff.staffName}`);
        console.log(`   職種: ${staff.position}`);
        console.log(`   勤務曜日: ${staff.workDays}`);
        console.log(`   状態: ${staff.status}`);
      });
    } else if (dashboardState.needsSetup) {
      console.log('\n⚠ 初期設定が必要です。');
      console.log('ブラウザのメニューから「法人・事業所・拠点」を登録してください。');
    } else {
      console.log('\n⚠ ページの状態が不確定です。ブラウザを確認してください。');
    }

    console.log('\n========== ブラウザは開いたまま ==========');
    console.log('確認後、ブラウザを閉じてください。\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
    await browser.close();
  }
})();
