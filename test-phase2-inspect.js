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
    await page.select('#corp-select', '1');
    await delay(300);
    await page.select('#facility-select', '1');
    await delay(300);
    await page.type('input[name="staff_name"]', 'テスト');
    await delay(200);
    await page.click('input[value="生活支援員"]');
    await delay(500);

    // Inspect the minute field IDs
    const minuteFields = await page.evaluate(() => {
      const fields = document.querySelectorAll('input[placeholder="MM"]');
      return Array.from(fields).map((f, i) => ({
        index: i,
        id: f.id,
        placeholder: f.placeholder
      }));
    });
    
    console.log('Minute fields found:');
    minuteFields.forEach(f => console.log(`  [${f.index}] id="${f.id}" placeholder="${f.placeholder}"`));

    // Get all HH fields
    const hourFields = await page.evaluate(() => {
      const fields = document.querySelectorAll('input[placeholder="HH"]');
      return Array.from(fields).map((f, i) => ({
        index: i,
        id: f.id,
        placeholder: f.placeholder
      }));
    });
    
    console.log('\nHour fields found:');
    hourFields.forEach(f => console.log(`  [${f.index}] id="${f.id}" placeholder="${f.placeholder}"`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
