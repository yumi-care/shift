const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 3でスタッフ情報が表示されるか確認 ==========\n');
    
    // ログイン
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    
    // Phase 2でスタッフ登録（勤務曜日あり）
    console.log('【Phase 2】スタッフ登録');
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
    
    const staffName = `情報表示テスト_${Date.now() % 100}`;
    await page.type('input[name="staff_name"]', staffName, { delay: 30 });
    
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    
    // 勤務曜日を選択
    await page.evaluate(() => {
      const dayLabels = document.querySelectorAll('label');
      let count = 0;
      for (const label of dayLabels) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox && label.textContent.trim().match(/[月火水木金]/)) {
          if (count < 3) {
            checkbox.click();
            count++;
          }
        }
      }
    });
    
    console.log(`✓ スタッフ登録: "${staffName}"`);
    console.log(`  - 職種: 管理者（最初のチェックボックス）`);
    console.log(`  - 勤務時間: 09:00～18:00`);
    console.log(`  - 勤務曜日: 月火水（3日選択）`);
    
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
      const staff = staffs[staffs.length - 1];
      return {
        id: staff.staff_id,
        name: staff.staff_name,
        position: staff.position,
        work_days: staff.work_days,
        work_hours_start: staff.work_hours_start,
        work_hours_end: staff.work_hours_end,
        break_start: staff.break_start,
        break_end: staff.break_end
      };
    });
    
    console.log(`\n登録内容 (localStorage):`);
    console.log(`  - ID: ${staffData.id}`);
    console.log(`  - 名前: ${staffData.name}`);
    console.log(`  - 職種: ${staffData.position}`);
    console.log(`  - 勤務曜日: ${staffData.work_days}`);
    console.log(`  - 勤務時間: ${staffData.work_hours_start}～${staffData.work_hours_end}`);
    console.log(`  - 休憩: ${staffData.break_start}～${staffData.break_end}\n`);
    
    // Phase 3でアクセス
    console.log('【Phase 3】スタッフ選択～申告ページで情報表示確認');
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
    }, staffData.id);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Phase 3のページで表示されている情報を確認
    const phase3Display = await page.evaluate(() => {
      const text = document.body.textContent;
      
      return {
        pageText: text.substring(0, 1000),
        
        // スタッフ情報が表示されているか確認
        hasPosition: text.includes('管理者'),
        hasWorkDays: text.includes('月火水'),
        hasWorkHours: text.includes('09:00') && text.includes('18:00'),
        
        // どんな要素があるか確認
        headings: Array.from(document.querySelectorAll('h3, h4')).map(h => h.textContent),
        
        infoSections: Array.from(document.querySelectorAll('div')).filter(div => {
          const text = div.textContent;
          return (text.includes('職種') || text.includes('勤務') || text.includes('時間'));
        }).map(div => div.textContent.trim().substring(0, 100))
      };
    });
    
    console.log('【Phase 3画面に表示されている情報】\n');
    console.log(`職種（管理者）が表示: ${phase3Display.hasPosition ? '✓ YES' : '❌ NO'}`);
    console.log(`勤務曜日（月火水）が表示: ${phase3Display.hasWorkDays ? '✓ YES' : '❌ NO'}`);
    console.log(`勤務時間（09:00～18:00）が表示: ${phase3Display.hasWorkHours ? '✓ YES' : '❌ NO'}`);
    
    if (phase3Display.headings.length > 0) {
      console.log(`\nページの見出し: ${phase3Display.headings.join(' / ')}`);
    }
    
    if (phase3Display.infoSections.length > 0) {
      console.log(`\nスタッフ情報セクション:`);
      phase3Display.infoSections.forEach((section, i) => {
        console.log(`  [${i+1}] ${section}`);
      });
    }
    
    console.log(`\n【確認結果】`);
    if (!phase3Display.hasPosition && !phase3Display.hasWorkDays && !phase3Display.hasWorkHours) {
      console.log(`❌ Phase 2で登録したスタッフ情報が表示されていません`);
      console.log(`   → スタッフ情報が掬い上げられていない`);
    } else {
      console.log(`✓ スタッフ情報が掬い上げられています`);
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
