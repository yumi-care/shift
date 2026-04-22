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

    console.log('\n=== Test 1: Direct focus on MM field ===');
    const success1 = await page.evaluate(() => {
      const mmField = document.getElementById('min-start-生活支援員-0');
      if (mmField) {
        mmField.focus();
        return true;
      }
      return false;
    });
    
    if (success1) {
      const focused1 = await page.evaluate(() => document.activeElement.placeholder);
      console.log('Successfully focused MM field. Placeholder:', focused1);
    } else {
      console.log('Could not find MM field');
    }

    await delay(500);

    console.log('\n=== Test 2: Simulate hour field input with onChange ===');
    const result = await page.evaluate(() => {
      const hourField = document.querySelector('input[placeholder="HH"]');
      if (!hourField) return 'No hour field found';
      
      hourField.focus();
      hourField.value = '09';
      
      // Trigger change event to simulate user input
      const event = new Event('change', { bubbles: true });
      hourField.dispatchEvent(event);
      
      // Give React time to update
      return 'Event dispatched';
    });
    
    console.log('Result:', result);
    
    await delay(500);
    
    const focused2 = await page.evaluate(() => {
      const elem = document.activeElement;
      return {
        placeholder: elem.placeholder,
        id: elem.id,
        value: elem.value
      };
    });
    console.log('Currently focused element:', focused2);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
