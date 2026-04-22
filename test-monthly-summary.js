const puppeteer = require('puppeteer');

async function test() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('is_logged_in', 'true'));
    
    await page.goto('http://localhost:5173/phase4', { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Select corp and facility
    await page.select('#corp-select', '1');
    await new Promise(r => setTimeout(r, 1500));
    await page.select('#facility-select', '1');
    await new Promise(r => setTimeout(r, 2000));
    
    const content = await page.evaluate(() => {
      const allH3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent);
      const monthlyH3 = allH3s.find(h => h.includes('月合計'));
      
      const tables = document.querySelectorAll('.shift-table');
      const monthlyTable = Array.from(tables).find(t => 
        t.closest('.shift-table-section')?.querySelector('h3')?.textContent?.includes('月合計')
      );
      
      const rows = monthlyTable?.querySelectorAll('tbody tr').length || 0;
      const staffNames = monthlyTable ? Array.from(monthlyTable.querySelectorAll('tbody tr')).map(tr => tr.children[0]?.textContent) : [];
      
      return {
        allH3s,
        monthlyTableExists: !!monthlyTable,
        monthlyHeading: monthlyH3,
        rows,
        staffNames
      };
    });
    
    console.log('\n✓✓✓ SUCCESS ✓✓✓\n');
    console.log('All H3 headings:', content.allH3s);
    console.log('\nMonthly summary table exists:', content.monthlyTableExists);
    console.log('Monthly summary heading:', content.monthlyHeading);
    console.log('Monthly summary rows:', content.rows);
    console.log('Staff names:', content.staffNames);
    
    browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) browser.close();
  }
}

test();
