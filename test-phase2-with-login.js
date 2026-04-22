const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Phase 2 page...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Click second button (demo login)
    console.log('Clicking demo login button...');
    const buttons = await page.$$('button');
    if (buttons.length > 1) {
      await buttons[buttons.length - 1].click();
      console.log('Clicked button');
    }
    
    console.log('Waiting for login...');
    await delay(3000);

    // Check if redirected to phase2
    const url = page.url();
    console.log('Current URL:', url);

    // Try to find the corp select
    const corpSelect = await page.$('#corp-select');
    if (corpSelect) {
      console.log('✓ Found corp-select - PHASE 2 PAGE LOADED');
      
      // Now test the time input
      await page.select('#corp-select', '1');
      await delay(500);
      await page.select('#facility-select', '1');
      await delay(500);
      
      await page.type('input[name="staff_name"]', 'テスト太郎');
      await delay(300);
      
      await page.click('input[value="生活支援員"]');
      await delay(500);
      
      const hourFields = await page.$$('input[placeholder="HH"]');
      if (hourFields.length > 0) {
        console.log('✓ Found hour input field');
        const firstHourField = hourFields[0];
        await firstHourField.click();
        await page.keyboard.type('09');
        await delay(500);
        
        const focusedPlaceholder = await page.evaluate(() => document.activeElement.placeholder);
        if (focusedPlaceholder === 'MM') {
          console.log('✓✓✓ AUTO-FOCUS TO MINUTES FIELD WORKS ✓✓✓');
        } else {
          console.log('Focus did not move. Focused on:', focusedPlaceholder);
        }
      }
    } else {
      console.log('Not on phase2 page. Page content:');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(bodyText.substring(0, 300));
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
