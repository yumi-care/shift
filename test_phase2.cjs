const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('✓ Phase 2に移動します...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('select', { timeout: 10000 });
    console.log('✓ ページが読み込まれました');

    // Get corporations
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log(`✓ 利用可能な法人: ${JSON.stringify(corps)}`);

    if (corps.length === 0) {
      console.log('❌ 法人がありません');
      await browser.close();
      return;
    }

    // Select first corporation
    const corpId = corps[0].value;
    await page.select('select:first-of-type', corpId);
    console.log(`✓ 法人を選択 (corp_id=${corpId})`);
    
    await page.waitForTimeout(1000);

    // Wait for facility selector
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return [];
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log(`✓ 利用可能な事業所: ${JSON.stringify(facilities)}`);

    if (facilities.length === 0) {
      console.log('❌ 事業所がありません');
      await browser.close();
      return;
    }

    const facilityId = facilities[0].value;
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      if (selects.length >= 2) {
        selects[1].value = fId;
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, facilityId);
    console.log(`✓ 事業所を選択 (facility_id=${facilityId})`);

    await page.waitForTimeout(1000);

    // Check if form appeared
    const formExists = await page.$('input[name="staff_name"]') !== null;
    if (!formExists) {
      console.log('❌ スタッフフォームが出現しません');
      await browser.close();
      return;
    }

    // Fill form
    await page.type('input[name="staff_name"]', 'テストスタッフ');
    console.log('✓ スタッフ名を入力');

    // Find and click first position checkbox
    const firstCheckbox = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].click();
        return true;
      }
      return false;
    });

    if (firstCheckbox) {
      console.log('✓ 職種を選択');
    }

    // Click submit
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('スタッフを追加')) {
          btn.click();
          console.log('clicked add button');
          break;
        }
      }
    });

    // Handle alert
    page.on('dialog', async dialog => {
      console.log(`[ALERT] ${dialog.message()}`);
      await dialog.accept();
    });

    await page.waitForTimeout(2000);

    // Check localStorage
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

    console.log('\n=== localStorage にあるスタッフデータ ===');
    if (Object.keys(savedData).length === 0) {
      console.log('❌ スタッフデータが保存されていません');
    } else {
      console.log(JSON.stringify(savedData, null, 2));
    }

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
})();
