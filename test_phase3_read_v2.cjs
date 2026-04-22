const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 3 スタッフドロップダウンテスト v2 ==========\n');
    
    console.log('1. Phase 2でスタッフデータを準備...');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      const staffData = [
        {
          "staff_id": 3001,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "田中太郎",
          "position": "管理者",
          "work_hours_start": "09:00",
          "work_hours_end": "18:00",
          "break_start": "12:00",
          "break_end": "13:00",
          "work_days": "月火水木金"
        },
        {
          "staff_id": 3002,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "佐藤花子",
          "position": "生活支援員",
          "work_hours_start": "10:00",
          "work_hours_end": "17:00",
          "break_start": "12:00",
          "break_end": "12:30",
          "work_days": "月火水木金土"
        },
        {
          "staff_id": 3003,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "鈴木次郎",
          "position": "世話人",
          "work_hours_start": "18:00",
          "work_hours_end": "09:00",
          "break_start": "22:00",
          "break_end": "22:30",
          "work_days": "月火水木金"
        }
      ];
      localStorage.setItem('staffs_2', JSON.stringify(staffData));
    });
    console.log('✓ staffs_2 に3名のスタッフを登録');
    
    console.log('\n2. Phase 3 (staff mode) にアクセス...');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const link = `http://localhost:5173/phase3?corp_id=2&facility_id=2&year=${year}&month=${month}`;
    
    await page.goto(link);
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ ページロード');
    
    console.log('\n3. 期限確認チェックボックスをチェック...');
    const checkboxClicked = await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) {
        checkbox.click();
        return true;
      }
      return false;
    });
    
    if (!checkboxClicked) {
      console.log('❌ チェックボックスが見つかりません');
      const html = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
      console.log('HTML:', html);
      await browser.close();
      return;
    }
    console.log('✓ チェックボックスをクリック');
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n4. スタッフドロップダウンを確認...');
    const dropdowns = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const result = [];
      
      for (let i = 0; i < selects.length; i++) {
        const options = Array.from(selects[i].options).map(opt => ({
          value: opt.value,
          text: opt.textContent.trim()
        }));
        result.push({
          index: i,
          optionCount: options.length,
          options: options
        });
      }
      return result;
    });
    
    console.log(`Found ${dropdowns.length} select dropdowns`);
    dropdowns.forEach((dd, i) => {
      console.log(`\nDropdown ${i}: ${dd.optionCount} options`);
      dd.options.forEach((opt, j) => {
        if (j < 5 || opt.value) {  // Show first 5 or any with value
          console.log(`  [${j}] "${opt.text}" (value="${opt.value}")`);
        }
      });
    });
    
    // Find staff dropdown (should have more than 2 options and contain names)
    let staffDropdown = null;
    for (const dd of dropdowns) {
      const hasStaffNames = dd.options.some(opt => 
        opt.text.includes('太郎') || opt.text.includes('花子') || opt.text.includes('次郎')
      );
      if (hasStaffNames) {
        staffDropdown = dd;
        break;
      }
    }
    
    if (!staffDropdown) {
      console.log('\n❌ スタッフドロップダウンが見つかりません');
      console.log('期待: 3名のスタッフ名が表示されるドロップダウン');
      
      // Check if staff data is in the state
      const stateData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('staffs_2') || '[]');
      });
      console.log('\nlocal Storage staffs_2:', stateData);
    } else {
      const staffNames = staffDropdown.options
        .filter(opt => opt.value)
        .map(opt => opt.text);
      console.log(`\n✓ ✓ ✓ スタッフドロップダウンが見つかりました！`);
      console.log(`✓ ${staffNames.length}名のスタッフが表示されています:`);
      staffNames.forEach((name, i) => {
        console.log(`  [${i+1}] ${name}`);
      });
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
