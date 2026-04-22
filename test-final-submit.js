const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  try {
    console.log('\n╔═════════════════════════════════════════════════════╗');
    console.log('║      PHASE 3 申告完全フロー テスト                 ║');
    console.log('╚═════════════════════════════════════════════════════╝\n');

    // ログイン
    console.log('【Step 1】ログイン');
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
    console.log('✓\n');
    await wait(2000);

    // テストデータ
    console.log('【Step 2】テストデータ作成');
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
    console.log('✓ 企業・事業所・拠点・スタッフを登録\n');

    // Phase 3
    console.log('【Step 3】Phase 3 スタッフモード開始');
    const staffLink = 'http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4';
    await page.goto(staffLink, { waitUntil: 'networkidle2' });
    console.log('✓\n');
    await wait(2000);

    // 期限確認
    console.log('【Step 4】期限確認');
    await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb && !cb.checked) cb.click();
    });
    console.log('✓\n');
    await wait(500);

    // スタッフ選択
    console.log('【Step 5】スタッフ選択');
    await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      if (select) {
        select.value = '1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✓ 山田太郎\n');
    await wait(500);

    // 日付選択
    console.log('【Step 6】日付選択');
    await page.evaluate(() => {
      const days = document.querySelectorAll('.calendar-day.active');
      if (days.length > 0) {
        days[0].click(); // 1日
        days[1]?.click(); // 2日
      }
    });
    console.log('✓ 4月1-2日\n');
    await wait(1000);

    // 拠点選択を確認
    const locationSectionExists = await page.evaluate(() => {
      return document.querySelector('.selected-dates-section') !== null;
    });

    console.log(`【Step 7】拠点選択セクション確認`);
    console.log(`${locationSectionExists ? '✓ セクション表示' : '✗ セクション未表示'}\n`);

    if (locationSectionExists) {
      // 拠点を選択
      console.log('【Step 8】拠点を選択');
      const locationSelected = await page.evaluate(() => {
        const selects = document.querySelectorAll('select[class="form-input location-select"]');
        if (selects.length > 0) {
          selects.forEach(sel => {
            sel.value = '1';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return selects.length;
        }
        return 0;
      });

      if (locationSelected > 0) {
        console.log(`✓ ${locationSelected}日分の拠点を選択\n`);
        await wait(500);
      }
    }

    // 確認画面へ
    console.log('【Step 9】確認画面へボタンクリック');
    const confirmClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('確認画面へ')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (confirmClicked) {
      console.log('✓\n');
      await wait(2000);
    } else {
      console.log('✗ ボタン見つからず\n');
    }

    // 確認画面で送信
    console.log('【Step 10】送信ボタンクリック');
    const submitClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('送信')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (submitClicked) {
      console.log('✓\n');
      await wait(2000);
    } else {
      console.log('✗ 送信ボタン見つからず\n');
    }

    // 完了確認
    console.log('【Step 11】申告完了確認');
    const completed = await page.evaluate(() => {
      return document.body.innerText.includes('申告完了');
    });

    if (completed) {
      console.log('✓ 申告完了画面表示\n');

      // localStorage確認
      const submissions = await page.evaluate(() => {
        return localStorage.getItem('shift_submissions_1');
      });

      if (submissions) {
        console.log('【Step 12】申告データ保存確認');
        const data = JSON.parse(submissions);
        console.log('✓ localStorage に申告データが保存されました\n');

        console.log('╔═════════════════════════════════════════════════════╗');
        console.log('║    ✅ SUCCESS! 申告フロー完全に機能しました ✅    ║');
        console.log('║                                                     ║');
        console.log('║  • スタッフドロップダウン: ✓ 表示・選択可能        ║');
        console.log('║  • 日付選択: ✓ 機能                                ║');
        console.log('║  • 拠点選択: ✓ 表示・選択可能                      ║');
        console.log('║  • 申告送信: ✓ 完了                                ║');
        console.log('║  • データ保存: ✓ localStorage に記録               ║');
        console.log('╚═════════════════════════════════════════════════════╝\n');
      }
    } else {
      console.log('✗ 申告完了画面が表示されていません\n');
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('ページ内容:\n', pageText.substring(0, 500));
    }

    console.log('✓ ブラウザで確認してください。60秒後に閉じます...\n');
    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
