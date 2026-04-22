const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Setting up test data...');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('staffs_20', JSON.stringify([
        { staff_id: 401, staff_name: '固定', position: 'R', work_days: '月火水', work_hours_start: '9:00', work_hours_end: '17:00' },
        { staff_id: 402, staff_name: 'シフト', position: 'K', work_days: '', work_hours_start: '', work_hours_end: '' }
      ]));
    });

    console.log('\nNavigating to Phase 3 staff mode...');
    const url = 'http://localhost:5173/phase3?corp_id=1&facility_id=20&year=2026&month=4';
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await sleep(3000);

    // Debug: What's on the page?
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        h1: document.querySelector('h1')?.textContent || 'NO H1',
        h2: document.querySelector('h2')?.textContent || 'NO H2',
        h3: document.querySelector('h3')?.textContent || 'NO H3',
        selectCount: document.querySelectorAll('select').length,
        selectElements: Array.from(document.querySelectorAll('select')).map(s => ({
          optionCount: s.querySelectorAll('option').length,
          optionValues: Array.from(s.querySelectorAll('option')).map(o => o.value)
        })),
        hasCalendar: !!document.querySelector('.calendar-section'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });

    console.log('\nPage Debug Info:');
    console.log(`  Title: ${pageContent.title}`);
    console.log(`  URL: ${pageContent.url}`);
    console.log(`  H1: ${pageContent.h1}`);
    console.log(`  H2: ${pageContent.h2}`);
    console.log(`  H3: ${pageContent.h3}`);
    console.log(`  Select elements: ${pageContent.selectCount}`);
    if (pageContent.selectElements.length > 0) {
      pageContent.selectElements.forEach((sel, i) => {
        console.log(`    Select ${i}: ${sel.optionCount} options, values: ${sel.optionValues.slice(0, 3)}`);
      });
    }
    console.log(`  Has calendar: ${pageContent.hasCalendar}`);
    console.log(`\nFirst 500 chars of body text:`);
    console.log(pageContent.bodyText);

    // Check React state
    const reactState = await page.evaluate(() => {
      const appElement = document.querySelector('#root');
      return {
        rootExists: !!appElement,
        rootHasChildren: appElement ? appElement.children.length : 0,
        windowKeys: typeof window !== 'undefined' ? Object.keys(window).length : 0
      };
    });

    console.log('\nReact/DOM State:');
    console.log(`  Root element exists: ${reactState.rootExists}`);
    console.log(`  Root has children: ${reactState.rootHasChildren}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
