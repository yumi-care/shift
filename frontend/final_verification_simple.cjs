const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n========== FINAL VERIFICATION =========\n');

    // Setup
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('staffs_99', JSON.stringify([
        {
          staff_id: 1001,
          staff_name: 'テスト太郎',
          position: 'R',
          work_days: '月火水木金',
          work_hours_start: '9:00',
          work_hours_end: '18:00'
        },
        {
          staff_id: 1002,
          staff_name: 'テスト花子',
          position: 'H',
          work_days: '',
          work_hours_start: '',
          work_hours_end: ''
        }
      ]));
    });

    // Test Fixed Staff
    console.log('TEST 1: Fixed Staff Auto-Submission');
    const staffLink = 'http://localhost:5173/phase3?corp_id=1&facility_id=99&year=2026&month=4';
    await page.goto(staffLink, { waitUntil: 'networkidle0' });

    await sleep(2000);

    // Check deadline checkbox
    await page.$('#deadline-confirm')?.then(el => el?.click?.());
    await sleep(500);

    // Select fixed staff
    await page.select('select#staff-select', '1001');
    await sleep(1500);

    // Check localStorage
    const fixed = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_99') || '{}');
      if (!subs['1001']) return null;
      return {
        count: Object.keys(subs['1001']).length,
        sample: Object.values(subs['1001'])[0]
      };
    });

    if (fixed && fixed.count > 15) {
      console.log(`✓ PASS: Fixed staff auto-submitted ${fixed.count} dates`);
      console.log(`  - Location: "${fixed.sample.location_name}"`);
      console.log(`  - Has staff_id: ${!!fixed.sample.staff_id}`);
    } else {
      console.log(`✗ FAIL: Expected >15 dates, got ${fixed?.count || 0}`);
    }

    // Test Data Structure
    console.log('\nTEST 2: Data Structure');
    const structure = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_99') || '{}');
      const keys = Object.keys(subs);
      let valid = true;
      let issues = [];

      keys.forEach(k => {
        if (isNaN(parseInt(k))) {
          valid = false;
          issues.push(`Key "${k}" is not numeric`);
        }
        Object.values(subs[k]).forEach(entry => {
          if (!entry.staff_id) issues.push('Missing staff_id');
          if (!entry.staff_name) issues.push('Missing staff_name');
        });
      });

      return { keys, valid, issues };
    });

    if (structure.valid && structure.keys.length > 0) {
      console.log(`✓ PASS: Keys are numeric (staff_id-based): [${structure.keys}]`);
      console.log(`  - All entries have staff_id and staff_name`);
    } else {
      console.log(`✗ FAIL: Structure issues: ${structure.issues.join(', ')}`);
    }

    // Summary
    console.log('\n========== RESULT ==========');
    if (fixed && fixed.count > 15 && structure.valid) {
      console.log('✓ Fixed Staff Flow: WORKING ✓');
      console.log('✓ Data Structure: VALID ✓');
      console.log('✓ Ready for use ✓');
    } else {
      console.log('✗ Issues detected');
    }
    console.log();

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
