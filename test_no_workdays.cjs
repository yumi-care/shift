const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== テスト：勤務曜日なしのスタッフ ==========\n');
    
    // Step 1: ログイン
    console.log('【Step 1】ログイン情報を設定');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ ログイン完了\n');
    
    // Step 2: Phase 2に移動
    console.log('【Step 2】Phase 2に移動 → スタッフ登録');
    await page.goto('http://localhost:5173/phase2');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人選択
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      return Array.from(select.options).filter(opt => opt.value).map(opt => opt.value);
    });
    const corpId = corps[0];
    await page.select('select:first-of-type', corpId);
    await new Promise(r => setTimeout(r, 800));
    console.log(`✓ 法人選択: ${corpId}`);
    
    // 事業所選択
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => opt.value);
    });
    const facilityId = facilities[0];
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilityId);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✓ 事業所選択: ${facilityId}`);
    
    // スタッフ名入力
    await page.type('input[name="staff_name"]', 'シフト制太郎');
    console.log('✓ スタッフ名入力: "シフト制太郎"');
    
    // 職種選択（チェックボックスをクリック）
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].click();
      }
    });
    console.log('✓ 職種選択: 最初の職種');
    
    // ※ 勤務曜日は選択しない
    console.log('✓ 勤務曜日: 選択しない（シフト申告制）');
    
    // フォーム送信
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
    console.log(`✓ スタッフを追加ボタンクリック → "${alertMsg}"\n`);
    
    // Step 3: Phase 3でシフト申告
    console.log('【Step 3】Phase 3でシフト申告');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const phase3Link = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=${facilityId}&year=${year}&month=${month}`;
    
    await page.goto(phase3Link);
    await new Promise(r => setTimeout(r, 2000));
    
    // 期限確認
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) checkbox.click();
    });
    console.log('✓ 期限確認をチェック');
    
    await new Promise(r => setTimeout(r, 1000));
    
    // スタッフ選択
    const staffSelectFound = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return false;
      const options = Array.from(select.options).map(opt => opt.textContent);
      console.log('Staff options:', options);
      
      // スタッフ「シフト制太郎」を選択
      for (const option of select.options) {
        if (option.textContent.includes('シフト制太郎')) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    });
    
    if (staffSelectFound) {
      console.log('✓ スタッフ選択: "シフト制太郎"');
    } else {
      console.log('❌ スタッフが選択できない（ドロップダウンに表示されていない）\n');
    }
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Step 4: ダッシュボード確認
    console.log('\n【Step 4】ダッシュボードで確認');
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人選択
    await page.select('select:first-of-type', corpId);
    await new Promise(r => setTimeout(r, 1000));
    
    // 事業所選択
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      if (selects.length >= 2) {
        selects[1].value = fId;
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, facilityId);
    
    await new Promise(r => setTimeout(r, 2000));
    
    // ダッシュボード内容確認
    const dashboardContent = await page.evaluate(() => {
      const table = document.querySelector('table.shift-table');
      if (!table) {
        return {
          hasTable: false,
          message: '申告済みスタッフ一覧が見つかりません'
        };
      }
      
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        return cells;
      });
      
      return {
        hasTable: true,
        rowCount: rows.length,
        rows: rows
      };
    });
    
    console.log(`ダッシュボード確認:`);
    if (dashboardContent.hasTable) {
      console.log(`✓ 申告済みスタッフ一覧が表示されています`);
      console.log(`  行数: ${dashboardContent.rowCount}`);
      if (dashboardContent.rowCount > 0) {
        console.log(`\n  表示されているスタッフ:`);
        dashboardContent.rows.forEach((row, i) => {
          console.log(`    [${i+1}] ${row.join(' | ')}`);
        });
      } else {
        console.log(`  ❌ スタッフが表示されていません`);
      }
    } else {
      console.log(`❌ ${dashboardContent.message}`);
    }
    
    // Step 5: localStorage確認
    console.log('\n【Step 5】localStorage確認');
    const storageData = await page.evaluate(() => {
      return {
        staffs: JSON.parse(localStorage.getItem(`staffs_${2}`) || '[]'),
        submissions: JSON.parse(localStorage.getItem(`shift_submissions_${2}`) || '{}')
      };
    });
    
    console.log(`✓ staffs_2: ${storageData.staffs.length}名`);
    if (storageData.staffs.length > 0) {
      console.log(`  最後のスタッフ: "${storageData.staffs[storageData.staffs.length - 1].staff_name}" (work_days="${storageData.staffs[storageData.staffs.length - 1].work_days}")`);
    }
    
    console.log(`✓ shift_submissions_2: ${Object.keys(storageData.submissions).length}名から申告`);
    
    console.log('\n========== テスト完了 ==========');
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
