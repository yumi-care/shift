const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening and logging in...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000);

    const buttons = await page.$$('button');
    if (buttons.length > 1) {
      await buttons[buttons.length - 1].click();
    }
    
    await delay(2000);
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Setup form
    console.log('Setting up form...');
    await page.select('#corp-select', '1');
    await delay(300);
    await page.select('#facility-select', '1');
    await delay(300);
    await page.type('input[name="staff_name"]', 'テスト太郎');
    await delay(200);
    await page.click('input[value="生活支援員"]');
    await delay(500);

    console.log('Testing time input auto-focus...');
    
    // Get the first hour input field
    const hourFieldHandle = await page.$('input[placeholder="HH"]');
    
    // Directly set value and trigger events
    await page.evaluate((element) => {
      element.value = '0';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, hourFieldHandle);
    
    await delay(200);
    
    await page.evaluate((element) => {
      element.value = '09';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, hourFieldHandle);
    
    await delay(500);

    // Check which element is focused
    const focusedInfo = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        id: focused.id,
        placeholder: focused.placeholder,
        tag: focused.tagName
      };
    });
    
    console.log('Focused element:', focusedInfo);
    
    if (focusedInfo.placeholder === 'MM') {
      console.log('\n✓✓✓ AUTO-FOCUS TO MM FIELD WORKS ✓✓✓');
      console.log('Successfully auto-focused from HH to MM field when value reached 2 characters');
    } else {
      console.log('WARNING: Focus not on MM field');
      console.log('Focused on:', focusedInfo);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
