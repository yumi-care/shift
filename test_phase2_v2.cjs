const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Phase 2 スタッフ登録テスト ==========\n');
    
    console.log('1. ログイン...');
    await page.goto('http://localhost:5173/login');
    await new Promise(r => setTimeout(r, 1500));
    
    // Set is_logged_in directly
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ ログイン情報をセット');
    
    console.log('\n2. Phase 2に移動...');
    await page.goto('http://localhost:5173/phase2');
    await new Promise(r => setTimeout(r, 2000));
    
    const selectCount = await page.evaluate(() => document.querySelectorAll('select').length);
    if (selectCount === 0) {
      console.log('❌ セレクトボックスが見つかりません');
      const html = await page.evaluate(() => document.body.innerHTML.substring(0, 300));
      console.log('Page HTML:', html);
      await browser.close();
      return;
    }
    console.log('✓ Page loaded, selects found:', selectCount);
    
    console.log('\n3. 法人を取得...');
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log('✓ Corps:', corps.map(c => c.text));
    
    if (corps.length === 0) {
      console.log('❌ No corporations');
      await browser.close();
      return;
    }
    
    const corpId = corps[0].value;
    console.log('\n4. 法人選択: ', corps[0].text, `(${corpId})`);
    await page.select('select:first-of-type', corpId);
    await new Promise(r => setTimeout(r, 1000));
    
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return [];
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log('✓ Facilities:', facilities.map(f => f.text));
    
    if (facilities.length === 0) {
      console.log('❌ No facilities');
      await browser.close();
      return;
    }
    
    const facilityId = facilities[0].value;
    console.log('\n5. 事業所選択:', facilities[0].text, `(${facilityId})`);
    
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilityId);
    
    await new Promise(r => setTimeout(r, 1500));
    
    console.log('\n6. フォームに入力...');
    const staffInput = await page.$('input[name="staff_name"]');
    if (!staffInput) {
      console.log('❌ Staff name input not found');
      await browser.close();
      return;
    }
    
    await page.type('input[name="staff_name"]', 'テスト花子');
    console.log('✓ Staff name entered');
    
    // Select first checkbox (position)
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('✓ Position selected');
    
    console.log('\n7. Form submit...');
    let alertMsg = '';
    page.on('dialog', async dialog => {
      alertMsg = dialog.message();
      console.log(`[ALERT] ${alertMsg}`);
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
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n8. Checking localStorage...');
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
    
    if (Object.keys(saved).length === 0) {
      console.log('❌ ❌ ❌ NO STAFF DATA SAVED ❌ ❌ ❌');
      console.log('Phase 2 staff registration is not working!');
    } else {
      console.log('✓ Staff data saved!');
      console.log(JSON.stringify(saved, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
