const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('🔄 テスト開始...\n');

    // ステップ1: ホームページにアクセス
    console.log('📍 ダッシュボードにアクセス...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    // ステップ2: localStorage にスタッフデータを登録
    console.log('📝 スタッフデータを localStorage に登録...');
    await page.evaluate(() => {
      const testStaff = [
        {
          staff_id: 1,
          staff_name: "山田太郎",
          positions: ["生活支援員"],
          location_ids: [3],
          work_hours_start: "09:00",
          work_hours_end: "18:00",
          break_start: "12:00",
          break_end: "13:00",
          work_days: ["月", "火", "水", "木", "金"]
        },
        {
          staff_id: 2,
          staff_name: "鈴木花子",
          positions: ["生活支援員"],
          location_ids: [4],
          work_hours_start: "10:00",
          work_hours_end: "20:00",
          break_start: "15:00",
          break_end: "16:00",
          work_days: ["火", "水", "木", "金", "土"]
        }
      ];
      localStorage.setItem('staffs_1', JSON.stringify(testStaff));
    });
    console.log('✓ スタッフデータを登録完了\n');

    // ステップ3: 申告データを登録
    console.log('📝 シフト申告データを localStorage に登録...');
    await page.evaluate(() => {
      const submissions = {
        "山田太郎": {
          "2026-04-01": {
            staff_name: "山田太郎",
            location_id: 3,
            location_name: "三本木拠点",
            submitted_at: "2026-04-17T02:00:00.000Z",
            status: "submitted"
          },
          "2026-04-02": {
            staff_name: "山田太郎",
            location_id: 3,
            location_name: "三本木拠点",
            submitted_at: "2026-04-17T02:00:00.000Z",
            status: "submitted"
          }
        },
        "鈴木花子": {
          "2026-04-03": {
            staff_name: "鈴木花子",
            location_id: 4,
            location_name: "豊橋駅前拠点",
            submitted_at: "2026-04-17T02:00:00.000Z",
            status: "submitted"
          }
        }
      };
      localStorage.setItem('shift_submissions_1', JSON.stringify(submissions));
    });
    console.log('✓ 申告データを登録完了\n');

    // ステップ4: ページをリロード
    console.log('🔄 ページをリロード...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // ステップ5: 法人を選択
    console.log('🔍 法人「ゆうみのいえ法人」を選択...');
    const corpSelect = await page.$('#corp-select');
    if (corpSelect) {
      await corpSelect.click();
      await page.waitForTimeout(500);
      // corp_id = 1 を選択
      await page.select('#corp-select', '1');
      await page.waitForTimeout(1000);
    }

    // ステップ6: 事業所を選択
    console.log('🔍 事業所「ゆうみのいえ三本木」を選択...');
    const facilitySelect = await page.$('#facility-select');
    if (facilitySelect) {
      await facilitySelect.click();
      await page.waitForTimeout(500);
      await page.select('#facility-select', '1');
      await page.waitForTimeout(1000);
    }

    // ステップ7: 申告済みスタッフ一覧を確認
    console.log('📊 申告済みスタッフ一覧を確認...\n');
    const tableContent = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => ({
        staffName: row.cells[0]?.textContent?.trim() || '',
        position: row.cells[1]?.textContent?.trim() || '',
        workDays: row.cells[2]?.textContent?.trim() || '',
        workHours: row.cells[3]?.textContent?.trim() || '',
        submissionStatus: row.cells[4]?.textContent?.trim() || ''
      }));
    });

    if (tableContent.length > 0) {
      console.log('✅ 申告済みスタッフ一覧が表示されました！');
      console.log('📋 スタッフ情報：');
      tableContent.forEach((staff, idx) => {
        console.log(`\n  [${idx + 1}] ${staff.staffName}`);
        console.log(`    職種: ${staff.position}`);
        console.log(`    勤務曜日: ${staff.workDays}`);
        console.log(`    勤務時間: ${staff.workHours}`);
        console.log(`    申告状況: ${staff.submissionStatus}`);
      });

      // 申告状況を確認
      const hasSubmission = tableContent.some(s => 
        s.submissionStatus.includes('申告済み')
      );
      
      if (hasSubmission) {
        console.log('\n✅ 成功！ Phase 3 で申告されたデータが、ダッシュボードに反映されました！');
      } else {
        console.log('\n⚠️  スタッフは表示されていますが、申告状況がまだ更新されていません。');
      }
    } else {
      console.log('⚠️  スタッフ一覧が表示されていません。');
    }

    console.log('\n✓ テスト完了');
    await browser.close();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
})();
