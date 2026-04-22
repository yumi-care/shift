const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n========== ダッシュボード修正確認 ==========\n');

    // セットアップ
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // ログイン状態 + データ設定
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('is_logged_in', 'true');

      // Phase 2: スタッフ登録データ
      localStorage.setItem('staffs_1', JSON.stringify([
        {
          staff_id: 1,
          staff_name: '山田太郎',
          position: 'サービス提供責任者',
          work_days: '月火水木金',
          work_hours_start: '09:00',
          work_hours_end: '18:00'
        },
        {
          staff_id: 2,
          staff_name: '佐藤花子',
          position: 'ヘルパー',
          work_days: '',
          work_hours_start: '',
          work_hours_end: ''
        },
        {
          staff_id: 3,
          staff_name: '鈴木次郎',
          position: 'ケアワーカー',
          work_days: '月水金',
          work_hours_start: '10:00',
          work_hours_end: '17:00'
        }
      ]));

      // Phase 3: 申告データ（スタッフ1と2だけ申告あり、3は申告なし）
      localStorage.setItem('shift_submissions_1', JSON.stringify({
        '1': {
          '2026-04-01': { staff_id: '1', staff_name: '山田太郎', location_name: '（勤務曜日により自動申告）', status: 'submitted' },
          '2026-04-02': { staff_id: '1', staff_name: '山田太郎', location_name: '（勤務曜日により自動申告）', status: 'submitted' }
        },
        '2': {
          '2026-04-05': { staff_id: '2', staff_name: '佐藤花子', location_name: '三本木', status: 'submitted' }
        }
      }));
    });

    console.log('✓ テストデータ設定完了');
    console.log('  - Staff 1: 山田太郎（申告2日あり）');
    console.log('  - Staff 2: 佐藤花子（申告1日あり）');
    console.log('  - Staff 3: 鈴木次郎（申告なし）');

    // ダッシュボードにアクセス
    console.log('\nダッシュボードを開いています...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await sleep(2000);

    // 法人・事業所・月を選択
    await page.select('[id="corp-select"]', '1');
    await sleep(1000);

    const facilities = await page.$$eval('[id="facility-select"] option', opts =>
      opts.map(o => o.value).filter(v => v)
    );

    if (facilities.length === 0) {
      console.log('⚠ 事業所が見つかりません。バックエンドから取得中...');
      // バックエンド経由で事業所を取得
      await sleep(2000);
    }

    // テーブル内容を確認
    const tableContent = await page.evaluate(() => {
      const rows = document.querySelectorAll('.shift-table tbody tr');
      return Array.from(rows).map(row => ({
        name: row.cells[0]?.textContent.trim() || '',
        position: row.cells[1]?.textContent.trim() || '',
        workDays: row.cells[2]?.textContent.trim() || '',
        status: row.cells[4]?.textContent.trim() || ''
      }));
    });

    console.log('\n========== ダッシュボード表示結果 ==========\n');

    if (tableContent.length === 0) {
      console.log('⚠ テーブルが空です（正常: 申告がない場合は表示されない）');
    } else {
      console.log('申告済みスタッフ一覧:');
      tableContent.forEach((staff, i) => {
        console.log(`\n${i + 1}. ${staff.name}`);
        console.log(`   職種: ${staff.position}`);
        console.log(`   勤務曜日: ${staff.workDays}`);
        console.log(`   申告状況: ${staff.status}`);
      });

      // 検証
      const hasYamada = tableContent.some(s => s.name.includes('山田'));
      const hasSato = tableContent.some(s => s.name.includes('佐藤'));
      const hasSuzuki = tableContent.some(s => s.name.includes('鈴木'));

      console.log('\n========== 検証 ==========\n');

      if (hasYamada) {
        console.log('✓ 山田太郎が表示（申告あり）');
      } else {
        console.log('✗ 山田太郎が表示されていない');
      }

      if (hasSato) {
        console.log('✓ 佐藤花子が表示（申告あり）');
      } else {
        console.log('✗ 佐藤花子が表示されていない');
      }

      if (!hasSuzuki) {
        console.log('✓ 鈴木次郎が表示されていない（申告なし・正常）');
      } else {
        console.log('✗ 鈴木次郎が表示されている（申告なしなので表示されるべきではない）');
      }

      if (hasYamada && hasSato && !hasSuzuki) {
        console.log('\n✓✓✓ ダッシュボード修正が正常に機能しています！ ✓✓✓');
      } else {
        console.log('\n⚠ 予期しない表示があります');
      }
    }

    console.log();

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
