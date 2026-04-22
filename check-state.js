const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Phase 2 にアクセス
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
      return {
        corporations: localStorage.getItem('corporations'),
        staffs_1: localStorage.getItem('staffs_1'),
        isLoggedIn: localStorage.getItem('is_logged_in'),
        pageTitle: document.title,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('=== Current LocalStorage State ===\n');
    console.log('is_logged_in:', data.isLoggedIn);
    console.log('\ncorporations:', data.corporations ? JSON.parse(data.corporations).length + ' corp(s)' : 'null');
    if (data.corporations) {
      console.log(JSON.stringify(JSON.parse(data.corporations), null, 2));
    }
    
    console.log('\nstaffs_1:', data.staffs_1 ? JSON.parse(data.staffs_1).length + ' staff(s)' : 'null');
    if (data.staffs_1) {
      const staffs = JSON.parse(data.staffs_1);
      staffs.forEach(s => {
        console.log(`  - ${s.staff_name} (${s.position})`);
      });
    }

    console.log('\n=== Page Status ===');
    console.log('Title:', data.pageTitle);
    console.log('Body text (first 300 chars):\n', data.bodyText.substring(0, 300));

  } finally {
    await browser.close();
  }
}

run();
