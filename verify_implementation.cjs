const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== 新仕様の実装確認 ==========\n');
    
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    
    // Phase 2: 勤務曜日ありでスタッフ登録
    console.log('【テスト1】勤務曜日あり（月火水木金）でスタッフ登録\n');
    await page.goto('http://localhost:5173/phase2');
    await new Promise(r => setTimeout(r, 2000));
    
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      return Array.from(select.options).filter(opt => opt.value)[0]?.value;
    });
    
    await page.select('select:first-of-type', corps);
    await new Promise(r => setTimeout(r, 800));
    
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      return Array.from(selects[1].options).filter(opt => opt.value)[0]?.value;
    });
    
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilities);
    await new Promise(r => setTimeout(r, 1000));
    
    const staffName1 = `固定勤務テスト_${Date.now() % 100}`;
    await page.type('input[name="staff_name"]', staffName1, { delay: 30 });
    
    // 職種選択
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    
    // 勤務曜日を月火水木金で選択
    await page.evaluate(() => {
      const dayLabels = document.querySelectorAll('label');
      for (const label of dayLabels) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox && ['月', '火', '水', '木', '金'].includes(label.textContent.trim())) {
          checkbox.click();
        }
      }
    });
    
    console.log(`✓ "${staffName1}" を登録`);
    console.log(`  勤務曜日: 月火水木金`);
    
    let alertMsg = '';
    page.on('dialog', async dialog => {
      alertMsg = dialog.message();
      await dialog.accept();
    });
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('スタッフを追加')) {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    
    const staff1Data = await page.evaluate(() => {
      const staffs = JSON.parse(localStorage.getItem('staffs_2') || '[]');
      return staffs[staffs.length - 1];
    });
    
    console.log(`✓ 登録完了\n`);
    
    // Phase 3: 固定勤務スタッフ選択時の動作確認
    console.log('【テスト2】Phase 3で固定勤務スタッフ選択\n');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const phase3Link = `http://localhost:5173/phase3?corp_id=${corps}&facility_id=${facilities}&year=${year}&month=${month}`;
    
    await page.goto(phase3Link);
    await new Promise(r => setTimeout(r, 2000));
    
    // 期限確認
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) checkbox.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // スタッフ選択
    await page.evaluate((sId) => {
      const select = document.querySelector('select');
      select.value = sId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, staff1Data.staff_id);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // 画面内容確認
    const phase3Content = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasAutoSubmitted: text.includes('申告完了') || text.includes('自動申告'),
        hasCalendar: text.includes('シフト申告日付を選択'),
        hasButton: document.querySelector('button.btn-confirm') !== null,
        fullText: text.substring(0, 600)
      };
    });
    
    console.log(`固定勤務スタッフ選択後の表示:`);
    console.log(`  ✓ 「申告完了」メッセージ: ${phase3Content.hasAutoSubmitted ? 'YES' : 'NO'}`);
    console.log(`  ✓ カレンダー表示: ${phase3Content.hasCalendar ? 'YES' : 'NO'}`);
    
    if (phase3Content.hasAutoSubmitted && !phase3Content.hasCalendar) {
      console.log(`\n✓ ✓ ✓ 固定勤務スタッフは申告画面をスキップしています！\n`);
    } else if (!phase3Content.hasAutoSubmitted) {
      console.log(`\n❌ 申告完了メッセージが表示されていません\n`);
    } else if (phase3Content.hasCalendar) {
      console.log(`\n❌ カレンダーが表示されている（固定勤務は表示されないべき）\n`);
    }
    
    // 確認画面へボタンをクリック
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('確認画面へ')) {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    
    // 送信
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button.btn-submit');
      if (submitBtn) submitBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    console.log(`✓ 申告送信完了`);
    
    // ダッシュボード確認
    console.log(`\n【テスト3】ダッシュボール確認\n`);
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人・事業所選択
    await page.select('select:first-of-type', corps);
    await new Promise(r => setTimeout(r, 800));
    
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[1].evaluate((select, fId) => {
        select.value = fId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, facilities);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // テーブル確認
    const dashboardTable = await page.evaluate((staffName) => {
      const table = document.querySelector('table.shift-table');
      if (!table) return { found: false };
      
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        return {
          name: cells[0],
          workDays: cells[2],
          status: cells[4]
        };
      });
      
      return {
        found: true,
        rows: rows,
        hasStaff: rows.some(r => r.name === staffName)
      };
    }, staffName1);
    
    if (dashboardTable.found) {
      console.log(`✓ ダッシュボール テーブル:`);
      dashboardTable.rows.forEach((row, i) => {
        console.log(`  [${i+1}] ${row.name} | 勤務曜日: ${row.workDays} | ${row.status}`);
      });
    }
    
    console.log(`\n【実装結果】`);
    if (phase3Content.hasAutoSubmitted && !phase3Content.hasCalendar && dashboardTable.hasStaff) {
      console.log(`✓ ✓ ✓ 新仕様が正常に実装されています！`);
      console.log(`  - 固定勤務スタッフは申告画面をスキップ`);
      console.log(`  - 申告完了メッセージを表示`);
      console.log(`  - ダッシュボール反映確認`);
    } else {
      console.log(`❌ 実装に問題があります`);
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
