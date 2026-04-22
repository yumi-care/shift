const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n========== ダッシュボードデバッグ ==========\n');

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // テストデータ設定
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('is_logged_in', 'true');
      localStorage.setItem('corporations_', JSON.stringify([
        { corp_id: 1, corp_name: 'ゆうみ株式会社' }
      ]));
      localStorage.setItem('facilities_1', JSON.stringify([
        { facility_id: 1, facility_name: 'ゆうみのいえ' }
      ]));
      localStorage.setItem('staffs_1', JSON.stringify([
        { staff_id: 1, staff_name: '山田太郎', position: 'サ責', work_days: '月火水木金', work_hours_start: '09:00', work_hours_end: '18:00' },
        { staff_id: 2, staff_name: '佐藤花子', position: 'ヘルパー', work_days: '', work_hours_start: '', work_hours_end: '' },
        { staff_id: 3, staff_name: '鈴木次郎', position: 'ケア', work_days: '月水金', work_hours_start: '10:00', work_hours_end: '17:00' }
      ]));
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

    console.log('✓ localStorage設定完了\n');

    // ダッシュボードにアクセス
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await sleep(2000);

    // ページの状態を確認
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasCorpSelect: !!document.getElementById('corp-select'),
        hasTable: !!document.querySelector('.shift-table'),
        selectorValue: document.getElementById('corp-select')?.value || 'なし',
        tableRowCount: document.querySelectorAll('.shift-table tbody tr').length
      };
    });

    console.log('ページ状態:');
    console.log(`  URL: ${pageState.url}`);
    console.log(`  法人セレクト存在: ${pageState.hasCorpSelect}`);
    console.log(`  テーブル存在: ${pageState.hasTable}`);
    console.log(`  法人セレクト値: ${pageState.selectorValue}`);
    console.log(`  テーブル行数: ${pageState.tableRowCount}\n`);

    // 法人を選択
    console.log('法人「ゆうみ株式会社」を選択中...');
    const corpSelect = await page.$('#corp-select');
    if (corpSelect) {
      await corpSelect.select('1');
      await sleep(1500);
      console.log('✓ 法人選択完了');
    } else {
      console.log('✗ 法人セレクト見つかりません');
    }

    // 事業所セレクトを確認
    const facilitySelect = await page.$('#facility-select');
    if (facilitySelect) {
      const options = await page.$$eval('#facility-select option', opts =>
        opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      console.log(`✓ 事業所セレクト存在（${options.length}個のオプション）\n`);

      // 事業所を選択
      if (options.length > 1) {
        await facilitySelect.select('1');
        await sleep(1500);
        console.log('✓ 事業所「ゆうみのいえ」選択完了\n');
      }
    }

    // テーブルを確認
    const finalState = await page.evaluate(() => {
      const rows = document.querySelectorAll('.shift-table tbody tr');
      return {
        tableExists: !!document.querySelector('.shift-table'),
        rowCount: rows.length,
        rows: Array.from(rows).map(row => ({
          name: row.cells[0]?.textContent.trim() || '',
          position: row.cells[1]?.textContent.trim() || '',
          status: row.cells[4]?.textContent.trim() || ''
        }))
      };
    });

    console.log('========== 最終結果 ==========\n');
    console.log(`テーブル存在: ${finalState.tableExists}`);
    console.log(`表示スタッフ数: ${finalState.rowCount}\n`);

    if (finalState.rowCount > 0) {
      console.log('【申告済みスタッフ】');
      finalState.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.name} (${row.position}) - ${row.status}`);
      });

      const hasSuzuki = finalState.rows.some(r => r.name.includes('鈴木'));
      if (!hasSuzuki) {
        console.log('\n✓ 鈴木次郎は表示されていない（申告なし・正常）');
        console.log('✓ ダッシュボード修正が機能しています！');
      } else {
        console.log('\n✗ 鈴木次郎が表示されている（修正が機能していない）');
      }
    } else {
      console.log('⚠ テーブルに行がありません。');
      console.log('  事業所選択の値を確認してください。');
    }

    console.log();

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
