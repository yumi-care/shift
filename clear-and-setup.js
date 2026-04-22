const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== localStorage 完全クリア + 再セットアップ ===\n');

    // ログインページを開く
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    // localStorage を完全にクリア
    await page.evaluate(() => {
      localStorage.clear();
      console.log('✓ localStorage クリア完了');
    });

    await wait(2000);

    // 新しいデータを設定
    await page.evaluate(() => {
      localStorage.setItem('corporations', JSON.stringify([
        { corp_id: 1, corp_name: 'ゆうみ株式会社' }
      ]));
      localStorage.setItem('facilities_1', JSON.stringify([
        { facility_id: 1, facility_name: 'ゆうみのいえ', corp_id: 1 }
      ]));
      localStorage.setItem('locations_1', JSON.stringify([
        { location_id: 1, location_name: '三本木', facility_id: 1 },
        { location_id: 2, location_name: '田子', facility_id: 1 },
        { location_id: 3, location_name: '南部', facility_id: 1 },
        { location_id: 4, location_name: '五戸', facility_id: 1 }
      ]));
      localStorage.setItem('staffs_1', JSON.stringify([
        { staff_id: 1, staff_name: '山田太郎', position: '介護職', work_days: '月火水木金', work_hours_start: '09:00', work_hours_end: '17:00' },
        { staff_id: 2, staff_name: '鈴木花子', position: '看護師', work_days: '月水金', work_hours_start: '08:00', work_hours_end: '16:00' }
      ]));
      
      console.log('✓ 新しいデータを設定:');
      console.log('  法人: ゆうみ株式会社');
      console.log('  事業所: ゆうみのいえ');
      console.log('  拠点: 三本木、田子、南部、五戸');
      console.log('  スタッフ: 山田太郎、鈴木花子');
    });

    console.log('\n✅ セットアップ完了\n');
    console.log('ログイン後、以下のリンクにアクセスしてください:\n');
    console.log('http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4\n');
    console.log('20秒後にブラウザを閉じます...\n');

    await wait(20000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
