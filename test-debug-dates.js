const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('\n日付選択のデバッグ\n');

    // ログイン
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          break;
        }
      }
    });
    await wait(2000);

    // テストデータ
    await page.evaluate(() => {
      const corp = { corp_id: 1, corp_name: 'ゆうみのいえ' };
      const facility = { facility_id: 1, facility_name: 'ゆうみのいえ三本木', corp_id: 1 };
      const location = { location_id: 1, location_name: '三本木', facility_id: 1 };
      const staffs = [
        { 
          staff_id: 1, 
          staff_name: '山田太郎', 
          position: '介護職', 
          work_days: '月火水木金',
          work_hours_start: '09:00',
          work_hours_end: '17:00'
        }
      ];

      localStorage.setItem('corporations', JSON.stringify([corp]));
      localStorage.setItem('facilities_1', JSON.stringify([facility]));
      localStorage.setItem('locations_1', JSON.stringify([location]));
      localStorage.setItem('staffs_1', JSON.stringify(staffs));
    });

    // Phase 3
    await page.goto('http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4', { waitUntil: 'networkidle2' });
    await wait(2000);

    // 期限確認
    await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb && !cb.checked) cb.click();
    });
    await wait(500);

    // スタッフ選択
    await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      if (select) {
        select.value = '1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(500);

    console.log('ここから日付をクリックしてください。');
    console.log('ブラウザで 2026年4月 のカレンダーから日付（例: 1日）をクリックしてください。');
    console.log('その後、ターミナルに戻ってEnterを押してください。\n');

    // 10秒待機してから確認
    await wait(10000);

    // 日付選択を確認
    const selectedDates = await page.evaluate(() => {
      return {
        // 選択済み日付を確認
        selectedDatesInState: 'checked via localStorage',
        
        // ページ上の日付セクション
        datesSectionExists: document.querySelector('.selected-dates-section') !== null,
        
        // 拠点選択セクション
        locationSelectExists: document.querySelector('select[class="form-input location-select"]') !== null,
        
        // ページテキスト
        pageText: document.body.innerText.substring(0, 800)
      };
    });

    console.log('=== デバッグ情報 ===\n');
    console.log('日付選択セクション存在:', selectedDates.datesSectionExists);
    console.log('拠点選択セクション存在:', selectedDates.locationSelectExists);
    console.log('\nページ内容:');
    console.log(selectedDates.pageText);

    console.log('\n\n✓ ブラウザで状況を確認してください。60秒後に閉じます...\n');
    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
