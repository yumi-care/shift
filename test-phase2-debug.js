const puppeteer = require('puppeteer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Phase 2 page...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(2000);

    // Screenshot
    await page.screenshot({ path: '/tmp/phase2-screenshot.png' });
    console.log('✓ Screenshot saved to /tmp/phase2-screenshot.png');

    // Get page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== Page Content ===');
    console.log(bodyText.substring(0, 500));

    // Check for error or loading state
    const h2s = await page.evaluate(() => {
      const elements = document.querySelectorAll('h2, h1, p');
      return Array.from(elements).map(e => e.textContent).slice(0, 10);
    });
    console.log('\n=== Headers/Text Found ===');
    h2s.forEach(text => console.log('  -', text));

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
