const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== 勤務曜日なし＋Phase3入力の反映確認 ==========\n');
    
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    
    // Phase 2: 勤務曜日なしでスタッフ登録
    console.log('【Step 1】勤務曜日なしでスタッフ登録\n');
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
    
    const staffName = `シフト制テスト_${Date.now() % 100}`;
    await page.type('input[name="staff_name"]', staffName, { delay: 30 });
    
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    
    // 勤務曜日は選択しない
    console.log(`✓ "${staffName}" を登録`);
    console.log(`  勤務曜日: なし（シフト申告制）\n`);
    
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
    
    const staffData = await page.evaluate(() => {
      const staffs = JSON.parse(localStorage.getItem('staffs_2') || '[]');
      return staffs[staffs.length - 1];
    });
    
    console.log(`✓ 登録完了\n`);
    
    // Phase 3: 日付・拠点入力
    console.log('【Step 2】Phase 3でシフト申告\n');
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
    }, staffData.staff_id);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // カレンダーから日付選択（最初の3日）
    const datesSelected = await page.evaluate(() => {
      let count = 0;
      const calendarDays = document.querySelectorAll('.calendar-day.active');
      for (let i = 1; i <= 3 && i < calendarDays.length; i++) {
        const dayNum = parseInt(calendarDays[i].textContent);
        if (dayNum > 0 && dayNum < 20) {
          calendarDays[i].click();
          count++;
        }
      }
      return count;
    });
    
    console.log(`✓ 日付選択: ${datesSelected}日`);
    await new Promise(r => setTimeout(r, 1000));
    
    // 拠点選択
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      for (let i = 1; i < Math.min(4, selects.length); i++) {
        await selects[i].evaluate(select => {
          const options = select.querySelectorAll('option');
          if (options.length > 1) {
            select.value = options[1].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    }
    console.log(`✓ 拠点選択完了`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 確認画面へ
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
    console.log(`✓ シフト申告送信\n`);
    
    // ダッシュボード確認
    console.log('【Step 3】ダッシュボール確認\n');
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人・事業所選択
    await page.select('select:first-of-type', corps);
    await new Promise(r => setTimeout(r, 800));
    
    const dashSelects = await page.$$('select');
    if (dashSelects.length >= 2) {
      await dashSelects[1].evaluate((select, fId) => {
        select.value = fId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, facilities);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // テーブル確認
    const tableData = await page.evaluate((searchName) => {
      const table = document.querySelector('table.shift-table');
      if (!table) return { found: false };
      
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        return {
          name: cells[0],
          position: cells[1],
          workDays: cells[2],
          workTime: cells[3],
          status: cells[4]
        };
      });
      
      return {
        found: true,
        rows: rows,
        targetRow: rows.find(r => r.name === searchName)
      };
    }, staffName);
    
    console.log('【ダッシュボール表示】\n');
    if (tableData.found) {
      tableData.rows.forEach((row, i) => {
        console.log(`[${i+1}] ${row.name}`);
        console.log(`    職種: ${row.position}`);
        console.log(`    勤務曜日: ${row.workDays}`);
        console.log(`    勤務時間: ${row.workTime}`);
        console.log(`    申告状況: ${row.status}`);
        console.log('');
      });
    }
    
    if (tableData.targetRow) {
      console.log(`✓ ✓ ✓ "${staffName}" の申告が反映されました！`);
      console.log(`    → ${tableData.targetRow.status}`);
    } else {
      console.log(`❌ "${staffName}" がダッシュボードに表示されていません`);
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
