const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Listen to console messages
  let consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
    console.log('PAGE LOG:', msg.text());
  });

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

    // Inject a logging wrapper
    console.log('\nInjecting onChange tracking...');
    await page.evaluate(() => {
      const hourField = document.querySelector('input[placeholder="HH"]');
      if (hourField) {
        const originalOnChange = hourField.onchange;
        hourField.addEventListener('change', (e) => {
          console.log('CHANGE EVENT FIRED. Value:', e.target.value, 'Length:', e.target.value.length);
        });
        hourField.addEventListener('input', (e) => {
          console.log('INPUT EVENT FIRED. Value:', e.target.value, 'Length:', e.target.value.length);
        });
      }
    });

    console.log('\nClicking and typing "09"...');
    const hourFieldHandle = await page.$('input[placeholder="HH"]');
    await hourFieldHandle.click();
    await page.type('input[placeholder="HH"]', '09');
    
    await delay(1000);
    
    console.log('\nConsole messages captured:', consoleMessages);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await delay(1000);
    await browser.close();
  }
})();
