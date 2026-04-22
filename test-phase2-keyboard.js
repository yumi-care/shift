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

    await page.select('#corp-select', '1');
    await delay(300);
    await page.select('#facility-select', '1');
    await delay(300);
    await page.type('input[name="staff_name"]', 'テスト太郎');
    await delay(200);
    await page.click('input[value="生活支援員"]');
    await delay(500);

    console.log('Getting hour field handle...');
    const hourFieldHandle = await page.$('input[placeholder="HH"]');
    
    console.log('Clicking on hour field...');
    await hourFieldHandle.click();
    await delay(200);
    
    console.log('Typing "09" using page.type()...');
    await page.type('input[placeholder="HH"]', '09');
    await delay(800);
    
    const focusedInfo = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        placeholder: focused.placeholder,
        id: focused.id,
        value: focused.value
      };
    });
    
    console.log('Focused element after typing:', focusedInfo);
    
    if (focusedInfo.placeholder === 'MM') {
      console.log('\n✓✓✓ TIME INPUT AUTO-FOCUS TEST PASSED ✓✓✓');
    } else {
      console.log('Auto-focus did not work as expected');
      console.log('Expected placeholder: MM');
      console.log('Actual placeholder:', focusedInfo.placeholder);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
