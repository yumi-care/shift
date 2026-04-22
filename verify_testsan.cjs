const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== テストさん確認テスト ==========\n');
    
    // Step 1: 現在のlocalStorageを確認
    console.log('【Step 1】現在のlocalstorage確認');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    
    const currentData = await page.evaluate(() => {
      const staffs2 = JSON.parse(localStorage.getItem('staffs_2') || '[]');
      return staffs2;
    });
    
    console.log(`現在保存されているスタッフ (staffs_2): ${currentData.length}名`);
    currentData.forEach((staff, i) => {
      console.log(`  [${i+1}] "${staff.staff_name}" (work_days="${staff.work_days}")`);
    });
    
    const hasTestsan = currentData.some(s => s.staff_name === 'テストさん');
    
    if (hasTestsan) {
      console.log('\n✓ "テストさん" が localStorage に保存されています');
    } else {
      console.log('\n⚠️  "テストさん" が見つかりません。登録されていない可能性があります。');
      console.log('\n新しく登録テストを実行します...\n');
      
      // Step 2: Phase 2で登録
      console.log('【Step 2】Phase 2で「テストさん」を新規登録');
      await page.goto('http://localhost:5173/phase2');
      await new Promise(r => setTimeout(r, 2000));
      
      // 法人・事業所選択
      const corps = await page.evaluate(() => {
        const select = document.querySelector('select');
        return Array.from(select.options).filter(opt => opt.value).map(opt => opt.value);
      });
      
      if (corps.length === 0) {
        console.log('❌ 法人がありません');
        await browser.close();
        return;
      }
      
      const corpId = corps[0];
      await page.select('select:first-of-type', corpId);
      await new Promise(r => setTimeout(r, 800));
      
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
      console.log(`✓ 法人・事業所選択: corp=${corpId}, facility=${facilityId}`);
      
      // フォーム入力
      await page.type('input[name="staff_name"]', 'テストさん');
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length > 0) checkboxes[0].click();
      });
      console.log('✓ 名前入力: "テストさん", 職種選択');
      
      // 送信
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
      console.log(`✓ 登録完了: "${alertMsg}"`);
    }
    
    // Step 3: Phase 3で確認
    console.log('\n【Step 3】Phase 3のスタッフドロップダウン確認');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const phase3Link = `http://localhost:5173/phase3?corp_id=2&facility_id=2&year=${year}&month=${month}`;
    
    await page.goto(phase3Link);
    await new Promise(r => setTimeout(r, 2000));
    
    // 期限確認
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) checkbox.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // ドロップダウン確認
    const dropdown = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return { found: false };
      
      const options = Array.from(select.options).map(opt => opt.textContent.trim());
      return { found: true, options };
    });
    
    if (!dropdown.found) {
      console.log('❌ スタッフドロップダウンが見つかりません');
      await browser.close();
      return;
    }
    
    console.log(`ドロップダウンの選択肢: ${dropdown.options.length}個\n`);
    dropdown.options.forEach((opt, i) => {
      console.log(`  [${i}] ${opt}`);
    });
    
    const hasTestsan2 = dropdown.options.some(opt => opt.includes('テストさん'));
    
    console.log(`\n【最終結果】`);
    console.log(hasTestsan2 ? 
      '✓ ✓ ✓ "テストさん" がPhase 3のドロップダウンに表示されています！' :
      '❌ "テストさん" がドロップダウンに表示されていません'
    );
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
