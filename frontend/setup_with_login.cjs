const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n========== 初期設定（ログイン含む） ==========\n');

    // まずホームページにアクセス
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // ログイン状態をセット
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
      localStorage.setItem('user_email', 'admin@example.com');
    });

    console.log('✓ ログイン状態を設定しました');

    // Phase 1 データを登録
    const corporations = [{
      corp_id: 1,
      corp_name: 'ゆうみ株式会社'
    }];

    const facilities = [{
      facility_id: 1,
      facility_name: 'ゆうみのいえ'
    }];

    const locations = [
      {
        location_id: 1,
        location_name: '三本木',
        facility_id: 1,
        address: '',
        business_hours_start: null,
        business_hours_end: null,
        staff_capacity: 0
      },
      {
        location_id: 2,
        location_name: '江島',
        facility_id: 1,
        address: '',
        business_hours_start: null,
        business_hours_end: null,
        staff_capacity: 0
      },
      {
        location_id: 3,
        location_name: '牛川',
        facility_id: 1,
        address: '',
        business_hours_start: null,
        business_hours_end: null,
        staff_capacity: 0
      }
    ];

    const staffs = [
      {
        staff_id: 1,
        staff_name: '田中太郎',
        position: 'サービス提供責任者',
        work_days: '月火水木金',
        work_hours_start: '08:30',
        work_hours_end: '17:30'
      },
      {
        staff_id: 2,
        staff_name: '鈴木花子',
        position: 'ケアマネジャー',
        work_days: '月火水木金',
        work_hours_start: '09:00',
        work_hours_end: '18:00'
      },
      {
        staff_id: 3,
        staff_name: '佐藤次郎',
        position: 'ヘルパー',
        work_days: '月火水金',
        work_hours_start: '10:00',
        work_hours_end: '16:00'
      },
      {
        staff_id: 4,
        staff_name: '阿部一子',
        position: 'ヘルパー',
        work_days: '',
        work_hours_start: '',
        work_hours_end: ''
      },
      {
        staff_id: 5,
        staff_name: '加藤次子',
        position: 'ケアワーカー',
        work_days: '',
        work_hours_start: '',
        work_hours_end: ''
      },
      {
        staff_id: 6,
        staff_name: '高橋三郎',
        position: 'ヘルパー',
        work_days: '',
        work_hours_start: '',
        work_hours_end: ''
      }
    ];

    // localStorage に登録
    await page.evaluate((data) => {
      localStorage.setItem('corporations_', JSON.stringify(data.corporations));
      localStorage.setItem('facilities_1', JSON.stringify(data.facilities));
      localStorage.setItem('locations_1', JSON.stringify(data.locations));
      localStorage.setItem('staffs_1', JSON.stringify(data.staffs));
    }, { corporations, facilities, locations, staffs });

    console.log('\n✓ 法人登録: ゆうみ株式会社');
    console.log('✓ 事業所登録: ゆうみのいえ');
    console.log('✓ 拠点登録: 三本木、江島、牛川');
    console.log('\n✓ スタッフ登録 (6名):');
    console.log('  【固定勤務】');
    console.log('  - 田中太郎 (サ責, 月火水木金)');
    console.log('  - 鈴木花子 (ケアマネ, 月火水木金)');
    console.log('  - 佐藤次郎 (ヘルパー, 月火水金)');
    console.log('  【シフト申告】');
    console.log('  - 阿部一子 (ヘルパー)');
    console.log('  - 加藤次子 (ケアワーカー)');
    console.log('  - 高橋三郎 (ヘルパー)');

    // ダッシュボードにアクセスして確認
    console.log('\n========== ダッシュボード確認 ==========\n');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await sleep(2000);

    // ダッシュボード内容を確認
    const dashboardInfo = await page.evaluate(() => {
      const heading = document.querySelector('h2')?.textContent;
      const tableRows = document.querySelectorAll('.shift-table tbody tr');
      const staffCount = tableRows.length;

      return {
        heading,
        staffCount,
        showsTable: !!document.querySelector('.shift-table')
      };
    });

    if (dashboardInfo.showsTable && dashboardInfo.staffCount > 0) {
      console.log(`✓ ダッシュボード表示: "${dashboardInfo.heading}"`);
      console.log(`✓ スタッフ一覧: ${dashboardInfo.staffCount}名`);
      console.log('\n✓✓✓ セットアップ完了！ ✓✓✓');
    } else {
      console.log('⚠ ダッシュボードが正常に表示されていません');
    }

    console.log('\nブラウザで http://localhost:5173/ にアクセスしてください\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
