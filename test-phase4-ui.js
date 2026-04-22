const puppeteer = require('puppeteer');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPhase4() {
  let browser;
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    await page.setViewport({ width: 1400, height: 900 });
    
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);
    
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    
    await page.goto('http://localhost:5173/phase4', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);
    
    const content = await page.evaluate(() => ({
      hasPhase4Container: !!document.querySelector('.phase4-container'),
      h2Text: document.querySelector('h2')?.textContent,
      selectsExist: document.querySelectorAll('select').length > 0
    }));
    
    console.log('Page loaded successfully:', content);
    console.log('Console errors:', consoleLogs.filter(l => l.type === 'error').map(l => l.text));
    
    // Now select corp and facility
    if (content.selectsExist) {
      await page.select('#corp-select', '1');
      await sleep(1500);
      await page.select('#facility-select', '1');
      await sleep(2000);
      
      const monthlyTable = await page.evaluate(() => {
        const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent);
        const hasMonthly = h3s.some(h => h.includes('月合計'));
        const tableRows = document.querySelectorAll('.shift-table-section:last-child tbody tr')?.length || 0;
        return { headings: h3s, monthlyTableExists: hasMonthly, monthlyRows: tableRows };
      });
      
      console.log('\nAfter selection:');
      console.log('Headings:', monthlyTable.headings);
      console.log('Monthly table exists:', monthlyTable.monthlyTableExists);
      console.log('Monthly table rows:', monthlyTable.monthlyRows);
    }
    
    browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPhase4();
