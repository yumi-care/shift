const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 2 スタッフ登録テスト ==========\n');
    
    // 1. Login via demo
    console.log('1. デモログイン中...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Click demo button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          break;
        }
      }
    });
    
    // Wait for redirect
    await page.waitForNavigation({ timeout: 10000 });
    console.log('✓ ログイン完了');
    
    // 2. Navigate to Phase 2
    console.log('\n2. Phase 2に移動...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));
    
    const pageTitle = await page.evaluate(() => document.body.textContent.substring(0, 100));
    console.log(`✓ ページロード: ${pageTitle}`);
    
    // 3. Get corporations
    console.log('\n3. 法人一覧を取得...');
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return { error: 'Select not found', innerHTML: document.body.innerHTML.substring(0, 200) };
      return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    
    if (corps.error) {
      console.log(`❌ エラー: ${corps.error}`);
      console.log(`HTML: ${corps.innerHTML}`);
      await browser.close();
      return;
    }
    
    console.log(`✓ 利用可能な法人: ${corps.map(c => c.text).join(', ')}`);
    
    if (corps.length === 0) {
      console.log('❌ 法人がありません');
      await browser.close();
      return;
    }
    
    // 4. Select corporation
    console.log('\n4. 法人を選択...');
    const corpId = corps[0].value;
    await page.select('select:first-of-type', corpId);
    console.log(`✓ ${corps[0].text} を選択`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 5. Get facilities
    console.log('\n5. 事業所一覧を取得...');
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return [];
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    
    console.log(`✓ 利用可能な事業所: ${facilities.map(f => f.text).join(', ')}`);
    
    if (facilities.length === 0) {
      console.log('❌ 事業所がありません');
      await browser.close();
      return;
    }
    
    // 6. Select facility
    console.log('\n6. 事業所を選択...');
    const facilityId = facilities[0].value;
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilityId);
    console.log(`✓ ${facilities[0].text} を選択 (facility_id=${facilityId})`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 7. Check form
    console.log('\n7. スタッフ登録フォームを確認...');
    const formExists = await page.evaluate(() => {
      return document.querySelector('input[name="staff_name"]') !== null;
    });
    
    if (!formExists) {
      console.log('❌ スタッフフォームが見つかりません');
      await browser.close();
      return;
    }
    console.log('✓ フォームが表示されています');
    
    // 8. Fill form
    console.log('\n8. フォームに入力...');
    await page.type('input[name="staff_name"]', 'テスト太郎');
    console.log('✓ スタッフ名を入力: "テスト太郎"');
    
    // Click first position checkbox
    const positionClicked = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].click();
        return true;
      }
      return false;
    });
    
    if (positionClicked) {
      console.log('✓ 職種を選択');
    }
    
    // 9. Click submit button
    console.log('\n9. スタッフを追加ボタンをクリック...');
    let alertMessage = null;
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
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
    
    if (alertMessage) {
      console.log(`✓ アラート: "${alertMessage}"`);
    }
    
    // 10. Check localStorage
    console.log('\n10. localStorage を確認...');
    const savedData = await page.evaluate(() => {
      const result = {};
      for (let key of Object.keys(localStorage)) {
        if (key.startsWith('staffs_')) {
          try {
            result[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            result[key] = localStorage.getItem(key);
          }
        }
      }
      return result;
    });
    
    if (Object.keys(savedData).length === 0) {
      console.log('❌ ❌ ❌ スタッフデータが保存されていません！！！');
      console.log('   Phase 2 のスタッフ登録機能に問題があります');
    } else {
      console.log('✓ スタッフデータが保存されました！');
      console.log('\n保存されたデータ:');
      console.log(JSON.stringify(savedData, null, 2));
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
