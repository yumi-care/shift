const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== テストさん シフト申告～ダッシュボード反映確認 ==========\n');
    
    // ステップ1: ログイン
    console.log('【Step 1】ログイン');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ ログイン完了\n');
    
    // ステップ2: Phase 2でテストさん登録
    console.log('【Step 2】Phase 2 - テストさん登録');
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
    
    // 既存のテストさんがあれば、別の名前で登録
    const testName = `テストさん_${Date.now() % 1000}`;
    await page.type('input[name="staff_name"]', testName, { delay: 30 });
    
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    
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
    console.log(`✓ スタッフ登録: "${testName}"`);
    
    const staffData = await page.evaluate(() => {
      const staffs = JSON.parse(localStorage.getItem(`staffs_2`) || '[]');
      return staffs[staffs.length - 1];
    });
    
    console.log(`✓ staff_id: ${staffData.staff_id}\n`);
    
    // ステップ3: Phase 3でシフト申告
    console.log('【Step 3】Phase 3 - シフト申告');
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
    console.log('✓ 期限確認');
    
    // スタッフ選択
    await page.evaluate((staffId) => {
      const select = document.querySelector('select');
      select.value = staffId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, staffData.staff_id);
    
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✓ スタッフ選択: "${testName}"`);
    
    // 日付選択（最初の3日）
    const selectedDatesCount = await page.evaluate(() => {
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
    
    console.log(`✓ 日付選択: ${selectedDatesCount}日`);
    await new Promise(r => setTimeout(r, 1000));
    
    // 拠点選択
    const locationSelectsCount = await page.$$('select');
    if (locationSelectsCount.length >= 2) {
      for (let i = 1; i < Math.min(4, locationSelectsCount.length); i++) {
        await locationSelectsCount[i].evaluate(select => {
          const options = select.querySelectorAll('option');
          if (options.length > 1) {
            select.value = options[1].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
      console.log('✓ 拠点選択完了');
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 送信
    let submitted = false;
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
    
    // 確認画面で送信
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button.btn-submit');
      if (submitBtn) submitBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ シフト申告送信完了\n');
    
    // ステップ4: ダッシュボード確認
    console.log('【Step 4】ダッシュボード確認');
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人選択
    await page.select('select:first-of-type', corps);
    await new Promise(r => setTimeout(r, 800));
    
    // 事業所選択
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[1].evaluate((select, fId) => {
        select.value = fId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, facilities);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ ダッシュボード: 事業所選択完了');
    
    // テーブル内容確認
    const tableContent = await page.evaluate((staffName) => {
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
        rowCount: rows.length,
        rows: rows,
        hasTestStaff: rows.some(r => r.name === staffName)
      };
    }, testName);
    
    console.log(`\n✓ ダッシュボード テーブル確認:`);
    console.log(`  テーブル行数: ${tableContent.rowCount}`);
    
    if (tableContent.found) {
      tableContent.rows.forEach((row, i) => {
        console.log(`  [${i+1}] ${row.name} | ${row.position} | ${row.workDays} | ${row.workTime} | ${row.status}`);
      });
    }
    
    console.log(`\n【最終結果】`);
    if (tableContent.hasTestStaff) {
      console.log(`✓ ✓ ✓ "${testName}" がダッシュボードに表示されています！`);
      
      const testRow = tableContent.rows.find(r => r.name === testName);
      console.log(`\n申告状況: ${testRow.status}`);
    } else {
      console.log(`❌ "${testName}" がダッシュボードに表示されていません`);
      console.log('\n送信されたデータ:');
      
      const submissionData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem(`shift_submissions_2`) || '{}');
      });
      console.log(JSON.stringify(submissionData, null, 2));
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
