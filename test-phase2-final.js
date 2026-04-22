const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening login page...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Click demo login
    const buttons = await page.$$('button');
    if (buttons.length > 1) {
      await buttons[buttons.length - 1].click();
      console.log('✓ Clicked demo login');
    }
    
    await delay(2000);

    // Navigate to phase2
    console.log('Navigating to /phase2...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Check if on phase2
    const h3 = await page.$('h3');
    if (h3) {
      const title = await h3.evaluate(el => el.textContent);
      console.log('Page title:', title);
    }

    // Select corporation and facility
    console.log('Selecting corporation...');
    const corpSelect = await page.$('#corp-select');
    if (corpSelect) {
      await page.select('#corp-select', '1');
      await delay(500);
      await page.select('#facility-select', '1');
      await delay(500);
      
      // Type staff name
      const staffInput = await page.$('input[name="staff_name"]');
      if (staffInput) {
        await page.type('input[name="staff_name"]', 'テスト太郎');
        await delay(300);
        
        // Check position checkbox
        await page.click('input[value="生活支援員"]');
        await delay(500);
        
        // Find hour fields
        const hourFields = await page.$$('input[placeholder="HH"]');
        console.log('Found', hourFields.length, 'hour input fields');
        
        if (hourFields.length > 0) {
          const firstHourField = hourFields[0];
          await firstHourField.click();
          console.log('Typing "09" in hour field...');
          await page.keyboard.type('09');
          
          await delay(300);
          
          const focusedId = await page.evaluate(() => document.activeElement.id);
          const focusedPlaceholder = await page.evaluate(() => document.activeElement.placeholder);
          console.log('Focused element ID:', focusedId);
          console.log('Focused element placeholder:', focusedPlaceholder);
          
          if (focusedPlaceholder === 'MM') {
            console.log('\n✓✓✓ TIME INPUT AUTO-FOCUS TEST PASSED ✓✓✓');
            console.log('Successfully auto-focused from HH to MM field');
          } else {
            console.log('ERROR: Focus not moved to MM field');
          }
        }
      }
    } else {
      console.log('ERROR: Could not find corp-select on page');
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
