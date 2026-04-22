const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 3 スタッフドロップダウン確認 ==========\n');
    
    // ログイン
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
      
      // テストデータ: 勤務曜日なしのスタッフ
      const staffData = [
        {
          "staff_id": 6001,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "シフト制の人",
          "position": "生活支援員",
          "work_hours_start": "10:00",
          "work_hours_end": "16:00",
          "break_start": "12:00",
          "break_end": "13:00",
          "work_days": ""  // 勤務曜日なし
        },
        {
          "staff_id": 6002,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "固定勤務の人",
          "position": "管理者",
          "work_hours_start": "09:00",
          "work_hours_end": "18:00",
          "break_start": "12:00",
          "break_end": "13:00",
          "work_days": "月火水木金"  // 勤務曜日あり
        }
      ];
      localStorage.setItem('staffs_2', JSON.stringify(staffData));
    });
    console.log('✓ テストデータセット: 2名（勤務曜日なし1名、あり1名）\n');
    
    // Phase 3スタッフモードにアクセス
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const link = `http://localhost:5173/phase3?corp_id=2&facility_id=2&year=${year}&month=${month}`;
    
    console.log(`【Phase 3アクセス】\nURL: ${link}\n`);
    await page.goto(link);
    await new Promise(r => setTimeout(r, 2000));
    
    // 期限確認
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) checkbox.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // スタッフドロップダウンの中身を確認
    const dropdownContent = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) {
        return {
          found: false,
          message: 'select要素が見つかりません'
        };
      }
      
      const options = Array.from(select.options).map((opt, i) => ({
        index: i,
        value: opt.value,
        text: opt.textContent.trim()
      }));
      
      return {
        found: true,
        optionCount: options.length,
        options: options
      };
    });
    
    if (!dropdownContent.found) {
      console.log(`❌ ${dropdownContent.message}`);
      await browser.close();
      return;
    }
    
    console.log(`【スタッフドロップダウン内容】`);
    console.log(`表示されている選択肢: ${dropdownContent.optionCount}個\n`);
    
    dropdownContent.options.forEach(opt => {
      console.log(`  [${opt.value || '(空)'}] ${opt.text}`);
    });
    
    // 確認
    const hasShiftStaff = dropdownContent.options.some(opt => opt.text.includes('シフト制の人'));
    const hasFixedStaff = dropdownContent.options.some(opt => opt.text.includes('固定勤務の人'));
    
    console.log(`\n【結果】`);
    console.log(`✓ "シフト制の人" (勤務曜日なし): ${hasShiftStaff ? '表示されている' : '❌ 表示されていない'}`);
    console.log(`✓ "固定勤務の人" (勤務曜日あり): ${hasFixedStaff ? '表示されている' : '❌ 表示されていない'}`);
    
    if (!hasShiftStaff) {
      console.log('\n問題: 勤務曜日なしのスタッフがドロップダウンに表示されていません');
      
      // localStorage確認
      const stored = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('staffs_2') || '[]');
      });
      console.log('\nlocalStorage staffs_2の内容:');
      console.log(JSON.stringify(stored, null, 2));
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
