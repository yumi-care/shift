import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('🔄 テスト開始...\n');

    // ステップ1: ログインページにアクセス
    console.log('📍 ログインページにアクセス...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await delay(1500);

    // ステップ2: デモログイン ボタンを見つけてクリック
    console.log('🔐 デモでログイン...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find(btn => btn.textContent.includes('デモ'));
      if (demoBtn) demoBtn.click();
      return !!demoBtn;
    });
    await delay(2500);

    // ステップ3: localStorage にテストデータを設定
    console.log('📝 テストデータを設定...');
    await page.evaluate(() => {
      // スタッフデータ（Phase 2）
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

      // シフト申告データ（Phase 3）
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
    console.log('✓ テストデータを設定完了\n');

    // ステップ4: ダッシュボードに移動
    console.log('📍 ダッシュボードに移動...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(2000);

    // ステップ5: 法人を選択
    console.log('🔍 法人を選択...');
    await page.select('#corp-select', '1');
    await delay(1500);

    // ステップ6: 事業所を選択
    console.log('🔍 事業所を選択...');
    await page.select('#facility-select', '1');
    await delay(1500);

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

    console.log('========================================');
    if (tableContent.length > 0) {
      console.log('✅ 申告済みスタッフ一覧が表示されました！');
      console.log('========================================\n');
      console.log('📋 スタッフ情報：\n');
      tableContent.forEach((staff, idx) => {
        console.log(`[${idx + 1}] ${staff.staffName}`);
        console.log(`  職種: ${staff.position}`);
        console.log(`  勤務曜日: ${staff.workDays}`);
        console.log(`  勤務時間: ${staff.workHours}`);
        console.log(`  申告状況: ${staff.submissionStatus}\n`);
      });

      const hasSubmission = tableContent.some(s => 
        s.submissionStatus.includes('申告済み')
      );
      
      if (hasSubmission) {
        console.log('========================================');
        console.log('✅✅ テスト成功！');
        console.log('========================================');
        console.log('Phase 3（シフト申告）で入力したデータが、');
        console.log('ダッシュボードの「申告済みスタッフ一覧」に');
        console.log('正常に反映されました！');
        console.log('========================================\n');
      } else {
        console.log('⚠️  スタッフは表示されていますが、申告状況が反映されていません。');
      }
    } else {
      console.log('⚠️  スタッフ一覧が表示されていません。');
    }

    console.log('✓ テスト完了');
    await delay(3000);
    await browser.close();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
})();
