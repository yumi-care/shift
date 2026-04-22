const puppeteer = require('puppeteer');

async function check() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('error', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('is_logged_in', 'true'));
    
    await page.goto('http://localhost:5173/phase4', { waitUntil: 'networkidle0', timeout: 15000 });
    
    const rendered = await page.evaluate(() => ({
      phase4Container: !!document.querySelector('.phase4-container'),
      h2: document.querySelector('h2')?.textContent,
      hasSelects: document.querySelectorAll('select').length > 0,
      errors: Array.from(document.querySelectorAll('*')).filter(el => el.textContent.includes('Error')).map(el => el.textContent.substring(0, 100))
    }));
    
    console.log('✓ Phase 4 rendered:', rendered.phase4Container);
    console.log('✓ Heading:', rendered.h2);
    console.log('✓ Has selects:', rendered.hasSelects);
    if (rendered.errors.length) console.log('✗ Errors found:', rendered.errors);
    if (errors.length) console.log('✗ Console errors:', errors);
    
    browser.close();
  } catch (error) {
    console.error('Test error:', error.message);
    if (browser) browser.close();
  }
}

check();
