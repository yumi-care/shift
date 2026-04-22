const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Phase 2 page...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });

    console.log('Waiting for page to load...');
    await delay(1000);

    // Select corporation
    console.log('Selecting corporation...');
    await page.select('#corp-select', '1');
    await delay(500);

    // Select facility
    console.log('Selecting facility...');
    await page.select('#facility-select', '1');
    await delay(500);

    // Enter staff name
    console.log('Entering staff name...');
    await page.type('input[name="staff_name"]', 'テスト太郎');
    await delay(300);

    // Select position (生活支援員)
    console.log('Selecting position...');
    const positionCheckboxes = await page.$$('input[type="checkbox"]');
    if (positionCheckboxes.length > 0) {
      await page.click('input[value="生活支援員"]');
      await delay(500);
    }

    // Find the start time hour field
    console.log('Finding start time hour field...');
    const hourFields = await page.$$('input[placeholder="HH"]');
    if (hourFields.length === 0) {
      console.log('ERROR: No hour fields found');
      process.exit(1);
    }

    const firstHourField = hourFields[0];
    console.log('Typing "09" in start hour field...');
    await firstHourField.click();
    await page.keyboard.type('09');

    // Check if focus moved to minutes field
    console.log('Waiting for focus to move to minutes field...');
    await delay(500);

    const focusedElement = await page.evaluate(() => document.activeElement.placeholder);
    console.log('Currently focused field placeholder:', focusedElement);

    if (focusedElement === 'MM') {
      console.log('✓ Focus successfully moved to minutes field!');

      // Type minutes
      await page.keyboard.type('30');
      await delay(300);

      // Get the time value
      const timeValues = await page.evaluate(() => {
        const hourFields = document.querySelectorAll('input[placeholder="HH"]');
        const minuteFields = document.querySelectorAll('input[placeholder="MM"]');
        return {
          hour: hourFields[0]?.value || '',
          minute: minuteFields[0]?.value || ''
        };
      });

      console.log('✓ Time values - Hour:', timeValues.hour, 'Minute:', timeValues.minute);
      console.log('\n✓✓✓ TIME INPUT TEST PASSED ✓✓✓');
    } else {
      console.log('ERROR: Focus did not move to minutes field');
      console.log('Currently focused element:', focusedElement);
    }

    await delay(2000);
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();
