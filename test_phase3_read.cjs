const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 3 スタッフドロップダウンテスト ==========\n');
    
    console.log('1. Phase 2でスタッフデータを事前に準備...');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      const staffData = [
        {
          "staff_id": 2001,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "山田太郎",
          "position": "管理者",
          "work_hours_start": "09:00",
          "work_hours_end": "18:00",
          "break_start": "12:00",
          "break_end": "13:00",
          "work_days": "月火水木金"
        },
        {
          "staff_id": 2002,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "鈴木花子",
          "position": "生活支援員",
          "work_hours_start": "10:00",
          "work_hours_end": "17:00",
          "break_start": "12:00",
          "break_end": "12:30",
          "work_days": "月火水木金土"
        }
      ];
      localStorage.setItem('staffs_2', JSON.stringify(staffData));
      console.log('Set staffs_2');
    });
    console.log('✓ ステータ: staffs_2 に2名を登録済み');
    
    console.log('\n2. Phase 3にアクセス（staff mode）...');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const phase3Link = `http://localhost:5173/phase3?corp_id=2&facility_id=2&year=${year}&month=${month}`;
    console.log(`Link: ${phase3Link}`);
    
    await page.goto(phase3Link);
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ Phase 3 (staff mode) ロード');
    
    console.log('\n3. ページ構造を確認...');
    const pageText = await page.evaluate(() => {
      return document.body.textContent.substring(0, 300);
    });
    console.log(`Page text (first 300 chars): ${pageText}`);
    
    console.log('\n4. スタッフドロップダウンを確認...');
    const staffOptions = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      console.log(`Found ${selects.length} selects`);
      
      for (let i = 0; i < selects.length; i++) {
        const options = Array.from(selects[i].options).map(opt => ({ value: opt.value, text: opt.textContent }));
        if (options.length > 1 && options.some(opt => opt.text.includes('スタッフ') || opt.text.includes('選択'))) {
          return { selectIndex: i, options: options };
        }
      }
      
      // If not found, return first select with options
      if (selects.length > 0) {
        const options = Array.from(selects[0].options).map(opt => ({ value: opt.value, text: opt.textContent }));
        return { selectIndex: 0, options: options };
      }
      return { error: 'No selects found' };
    });
    
    if (staffOptions.error) {
      console.log(`❌ ${staffOptions.error}`);
      await browser.close();
      return;
    }
    
    console.log(`✓ Found ${staffOptions.options.length} staff options:`);
    staffOptions.options.forEach((opt, i) => {
      console.log(`  [${i}] ${opt.text}`);
    });
    
    const staffCount = staffOptions.options.filter(opt => opt.value).length;
    if (staffCount >= 2) {
      console.log(`\n✓ ✓ ✓ スタッフドロップダウンに${staffCount}名表示されています！`);
    } else {
      console.log(`\n❌ スタッフが表示されていません（期待: 2名, 実際: ${staffCount}名）`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
