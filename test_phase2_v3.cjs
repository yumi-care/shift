const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 2 スタッフ登録テスト v3 ==========\n');
    
    console.log('1. ログイン情報をセット...');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ ログイン情報セット');
    
    console.log('\n2. Phase 2に移動...');
    await page.goto('http://localhost:5173/phase2');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n3. 法人・事業所を選択...');
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log(`✓ Found ${corps.length} corporations`);
    
    const corpId = corps[0].value;
    await page.select('select:first-of-type', corpId);
    await new Promise(r => setTimeout(r, 1000));
    
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return [];
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    
    const facilityId = facilities[0].value;
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilityId);
    
    await new Promise(r => setTimeout(r, 1500));
    console.log(`✓ Selected facility ${facilityId}`);
    
    console.log('\n4. スタッフ名を入力...');
    await page.type('input[name="staff_name"]', 'テスト次郎', { delay: 50 });
    console.log('✓ Name entered');
    
    console.log('\n5. 職種チェックボックスをクリック...');
    const positionCheckboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${positionCheckboxes.length} checkboxes`);
    
    if (positionCheckboxes.length > 0) {
      // Click the first checkbox using puppeteer's click, not manual state change
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes[0].click();
      });
      await new Promise(r => setTimeout(r, 300));
      console.log('✓ Clicked first position checkbox');
    }
    
    console.log('\n6. フォーム送信...');
    let alertMsg = '';
    page.on('dialog', async dialog => {
      alertMsg = dialog.message();
      await dialog.accept();
    });
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('スタッフを追加')) {
          console.log('Clicking button');
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    console.log(`Alert: "${alertMsg}"`);
    
    console.log('\n7. localStorage確認...');
    const saved = await page.evaluate(() => {
      const data = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('staffs_')) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            data[key] = localStorage.getItem(key);
          }
        }
      });
      return data;
    });
    
    console.log('\n========== 結果 ==========');
    if (Object.keys(saved).length === 0) {
      console.log('❌ スタッフデータが保存されていません');
      console.log('\n問題点：');
      console.log('- チェックボックスが正しく選択されていない可能性');
      console.log('- フォーム検証が失敗している');
    } else {
      console.log('✓ スタッフデータが保存されました！');
      Object.entries(saved).forEach(([key, value]) => {
        console.log(`\nKey: ${key}`);
        console.log(JSON.stringify(value, null, 2));
      });
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
