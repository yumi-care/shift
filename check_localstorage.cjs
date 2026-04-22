const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== localStorage 内容確認 ==========\n');
    
    // 現在のシステムにアクセス
    await page.goto('http://localhost:5173/');
    
    // localStorage全体を確認
    const allStorage = await page.evaluate(() => {
      const data = {};
      for (let key of Object.keys(localStorage)) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    console.log('【localStorage 全体内容】\n');
    
    // staffs_* の内容を表示
    for (const [key, value] of Object.entries(allStorage)) {
      if (key.startsWith('staffs_')) {
        console.log(`\n${key}:`);
        if (Array.isArray(value)) {
          console.log(`  スタッフ数: ${value.length}名`);
          value.forEach((staff, i) => {
            console.log(`  [${i+1}] ID=${staff.staff_id}, 名前="${staff.staff_name}", 職種="${staff.position}", work_days="${staff.work_days}"`);
          });
        } else {
          console.log(`  ${JSON.stringify(value)}`);
        }
      }
    }
    
    // 他の重要なキー
    console.log('\n【その他キー】');
    for (const [key, value] of Object.entries(allStorage)) {
      if (!key.startsWith('staffs_') && !key.startsWith('__')) {
        if (typeof value === 'string' && value.length > 100) {
          console.log(`${key}: [長い文字列]`);
        } else {
          console.log(`${key}: ${JSON.stringify(value).substring(0, 100)}`);
        }
      }
    }
    
    // 結論
    console.log('\n========== 確認結果 ==========');
    const staffs2 = allStorage['staffs_2'];
    if (!staffs2 || (Array.isArray(staffs2) && staffs2.length === 0)) {
      console.log('❌ staffs_2 が空です。スタッフが登録されていません。');
    } else if (Array.isArray(staffs2)) {
      const hasTestsan = staffs2.some(s => s.staff_name === 'テストさん');
      console.log(`staffs_2: ${staffs2.length}名のスタッフ`);
      console.log(hasTestsan ? 
        '✓ "テストさん" が含まれています' :
        '❌ "テストさん" が含まれていません'
      );
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
