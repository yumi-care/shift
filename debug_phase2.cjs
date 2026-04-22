const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Sleep
    await new Promise(r => setTimeout(r, 2000));

    // Get page content
    const content = await page.evaluate(() => {
      return {
        selectCount: document.querySelectorAll('select').length,
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length,
        bodyLength: document.body.innerHTML.length,
        visibleText: document.body.textContent.substring(0, 200)
      };
    });

    console.log('Page state:', content);

    const title = await page.title();
    console.log('Page title:', title);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
