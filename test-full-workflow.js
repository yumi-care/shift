const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000);

    const buttons = await page.$$('button');
    if (buttons.length > 1) {
      await buttons[buttons.length - 1].click();
      console.log('✓ Clicked demo login');
    }
    
    await delay(2000);

    // Phase 2: Register staff
    console.log('\n2. Opening Phase 2 (Staff Registration)...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.select('#corp-select', '1');
    await delay(300);
    await page.select('#facility-select', '1');
    await delay(300);

    await page.type('input[name="staff_name"]', '田中太郎');
    await delay(200);

    // Select fixed employment and position
    await page.click('input[value="fixed"]');
    await delay(300);
    await page.click('input[value="生活支援員"]');
    await delay(500);

    // Select work days (月火水木金)
    const dayCheckboxes = await page.$$('input[type="checkbox"]');
    for (let i = 0; i < 5; i++) {
      const isChecked = await page.evaluate((elem) => elem.checked, dayCheckboxes[i + 2]);
      if (!isChecked) {
        await dayCheckboxes[i].click();
        await delay(100);
      }
    }
    
    console.log('✓ Selected staff with fixed employment and work days');

    // Add staff
    const addButton = await page.$('button:not([type="button"])') || (await page.$$('button'))[6];
    if (addButton) {
      await addButton.click();
      await delay(1000);
      console.log('✓ Added staff');
    }

    // Phase 3: Check submission
    console.log('\n3. Checking Phase 3 (Shift Submission)...');
    await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2' });
    await delay(1000);

    const phase3Content = await page.evaluate(() => document.body.innerText.substring(0, 200));
    if (phase3Content.includes('管理者')) {
      console.log('✓ Phase 3 page loaded');
    }

    // Dashboard: Check if staff shows as submitted
    console.log('\n4. Opening Dashboard...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000);

    const dashboardContent = await page.evaluate(() => document.body.innerText);
    if (dashboardContent.includes('申告済みスタッフ') || dashboardContent.includes('ダッシュボード')) {
      console.log('✓ Dashboard loaded');
      
      // Select facility and check for staff
      await page.select('#corp-select', '1');
      await delay(300);
      await page.select('#facility-select', '1');
      await delay(300);
      
      const tableContent = await page.evaluate(() => document.body.innerText);
      if (tableContent.includes('田中太郎')) {
        console.log('✓✓ Staff "田中太郎" appears in dashboard');
      } else {
        console.log('! Staff name not found in dashboard');
      }
    }

    console.log('\n=== WORKFLOW TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await delay(3000);
    await browser.close();
  }
})();
