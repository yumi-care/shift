const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('\n╔═════════════════════════════════════════════════════╗');
    console.log('║  PHASE 3 申告フロー全体テスト                     ║');
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
    console.log('✓ ログイン\n');
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
    console.log('✓ データ作成\n');

    // Phase 3 スタッフモード
    console.log('【Step 3】Phase 3 スタッフモード開始');
    const staffLink = 'http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4';
    await page.goto(staffLink, { waitUntil: 'networkidle2' });
    console.log('✓ Phase 3 スタッフモード\n');
    await wait(2000);

    // Step 4: 期限確認
    console.log('【Step 4】期限確認チェックボックスをクリック');
    await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb && !cb.checked) cb.click();
    });
    console.log('✓ チェック\n');
    await wait(1000);

    // Step 5: スタッフ選択
    console.log('【Step 5】スタッフを選択');
    const staffSelected = await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      if (!select) return false;
      select.value = '1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });

    if (staffSelected) {
      console.log('✓ スタッフ選択: 山田太郎\n');
      await wait(1000);
    } else {
      console.log('✗ スタッフ選択失敗\n');
    }

    // Step 6: 日付選択
    console.log('【Step 6】日付を選択（4月1-2日）');
    const datesSelected = await page.evaluate(() => {
      const days = document.querySelectorAll('.calendar-day.active');
      if (days.length >= 2) {
        days[0].click();
        return 1;
      }
      return 0;
    });

    if (datesSelected > 0) {
      console.log(`✓ ${datesSelected}日目を選択\n`);
      await wait(1000);
    }

    // Step 7: 拠点選択
    console.log('【Step 7】拠点を選択');
    const locationSelected = await page.evaluate(() => {
      const selects = document.querySelectorAll('select[class="form-input location-select"]');
      if (selects.length > 0) {
        selects[0].value = '1';
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    });

    if (locationSelected) {
      console.log('✓ 拠点選択: 三本木\n');
      await wait(1000);
    } else {
      console.log('⚠ 拠点選択できなかった\n');
    }

    // Step 8: 確認画面へ
    console.log('【Step 8】「確認画面へ」ボタンをクリック');
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
      console.log('✓ クリック\n');
      await wait(2000);
    } else {
      console.log('✗ ボタンが見つからない\n');
    }

    // Step 9: 確認画面で送信
    console.log('【Step 9】確認画面を確認して送信');
    
    const confirmPageContent = await page.evaluate(() => {
      const modal = document.querySelector('.confirm-modal');
      if (modal) {
        return {
          found: true,
          text: modal.innerText.substring(0, 200)
        };
      }
      return { found: false };
    });

    if (confirmPageContent.found) {
      console.log('✓ 確認画面が表示されました');
      console.log(`内容: ${confirmPageContent.text}\n`);

      console.log('【Step 10】「送信」ボタンをクリック');
      const submitted = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('送信')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (submitted) {
        console.log('✓ 送信ボタンクリック\n');
        await wait(2000);

        // Step 11: 送信完了確認
        console.log('【Step 11】申告完了を確認');
        const completed = await page.evaluate(() => {
          return document.body.innerText.includes('申告完了');
        });

        if (completed) {
          console.log('✓ 申告完了画面が表示されました\n');

          // Step 12: ダッシュボードで反映確認
          console.log('【Step 12】ダッシュボードで反映を確認');
          
          const submissions = await page.evaluate(() => {
            return localStorage.getItem('shift_submissions_1');
          });

          if (submissions) {
            const data = JSON.parse(submissions);
            console.log('✓ localStorage に申告データが保存されました');
            console.log(`内容: ${JSON.stringify(data, null, 2).substring(0, 300)}\n`);

            console.log('╔═════════════════════════════════════════════════════╗');
            console.log('║         ✅ SUCCESS! 申告完了しました ✅            ║');
            console.log('╚═════════════════════════════════════════════════════╝\n');
          } else {
            console.log('⚠ localStorage に申告データが保存されていません\n');
          }
        } else {
          console.log('✗ 申告完了画面が表示されていません\n');
          const bodyText = await page.evaluate(() => document.body.innerText);
          console.log('ページテキスト:\n', bodyText.substring(0, 500));
        }
      } else {
        console.log('✗ 送信ボタンが見つかりません\n');
      }
    } else {
      console.log('✗ 確認画面が表示されていません\n');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('ページテキスト:\n', bodyText.substring(0, 500));
    }

    console.log('\n✓ ブラウザで状況を確認してください。60秒後に閉じます...\n');
    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
