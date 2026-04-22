const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.setDefaultTimeout(15000);

  try {
    console.log('\n========== PHASE 3 VERIFICATION TEST ==========\n');

    // Step 1: Setup data
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.clear();

      const staffData = [
        {
          staff_id: 401,
          staff_name: '固定勤務スタッフA',
          position: 'リーダー',
          work_days: '月火水木金',
          work_hours_start: '08:00',
          work_hours_end: '17:00'
        },
        {
          staff_id: 402,
          staff_name: 'シフト申告スタッフB',
          position: 'ケアワーカー',
          work_days: '',
          work_hours_start: '',
          work_hours_end: ''
        }
      ];

      localStorage.setItem('staffs_20', JSON.stringify(staffData));
    });

    console.log('✓ Setup data:');
    console.log('  - Facility: 20');
    console.log('  - Staff 401: work_days="月火水木金" (固定勤務)');
    console.log('  - Staff 402: work_days="" (シフト申告)');

    // Step 2: Test Fixed Staff
    console.log('\n--- Test 1: Fixed Staff Flow ---');
    const url = 'http://localhost:5173/phase3?corp_id=1&facility_id=20&year=2026&month=4';
    await page.goto(url, { waitUntil: 'networkidle0' });

    await sleep(2000); // Wait for React to render

    // Check if dropdown exists
    const hasDropdown = await page.$('select') !== null;
    if (!hasDropdown) {
      console.log('✗ Dropdown not found, waiting more...');
      await sleep(3000);
    }

    // Get options
    const optionTexts = await page.$$eval('select option', opts =>
      opts.map(o => o.textContent)
    );
    console.log(`✓ Dropdown loaded with options: ${optionTexts.slice(1).join(', ')}`);

    // Select fixed staff
    await page.select('select', '401');
    console.log('✓ Selected Staff 401 (Fixed Schedule)');

    await sleep(1500);

    // Check for completion message
    const hasCompletionMsg = await page.evaluate(() => {
      const h4s = Array.from(document.querySelectorAll('h4'));
      return h4s.some(h => h.textContent.includes('申告完了'));
    });

    if (hasCompletionMsg) {
      console.log('✓ Auto-submission message displayed');
    }

    // Check localStorage
    const fixed401Data = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_20') || '{}');
      if (!subs['401']) return { count: 0 };
      const keys = Object.keys(subs['401']);
      const sample = Object.values(subs['401'])[0];
      return {
        count: keys.length,
        firstDate: keys[0],
        location: sample?.location_name,
        hasStaffId: !!sample?.staff_id
      };
    });

    console.log(`✓ Auto-submitted: ${fixed401Data.count} dates`);
    if (fixed401Data.count > 0) {
      console.log(`  - First date: ${fixed401Data.firstDate}`);
      console.log(`  - Location: "${fixed401Data.location}"`);
      console.log(`  - Has staff_id: ${fixed401Data.hasStaffId}`);
    }

    // Step 3: Test Shift Submission Staff
    console.log('\n--- Test 2: Shift Submission Staff Flow ---');
    await page.goto(url, { waitUntil: 'networkidle0' });
    await sleep(2000);

    await page.select('select', '402');
    console.log('✓ Selected Staff 402 (Shift Submission)');

    await sleep(1000);

    // Check for calendar
    const hasCalendar = await page.$('.calendar-section') !== null;
    if (hasCalendar) {
      console.log('✓ Calendar displayed');

      // Click some dates
      const days = await page.$$('.calendar-day.active');
      let clicked = 0;

      for (let i = 0; i < days.length; i++) {
        const text = await days[i].evaluate(el => el.textContent.trim());
        const num = parseInt(text);
        if (num === 6 || num === 18) {
          await days[i].click();
          clicked++;
        }
      }

      console.log(`✓ Selected ${clicked} dates manually`);

      await sleep(800);

      // Set locations
      const locSelects = await page.$$('select.location-select');
      for (let i = 0; i < locSelects.length; i++) {
        await locSelects[i].select('20');
      }
      console.log(`✓ Set locations for ${locSelects.length} dates`);

      // Submit
      const confirmBtn = await page.$('button.btn-confirm:not(:disabled)');
      if (confirmBtn) {
        await confirmBtn.click();
        console.log('✓ Submitted');
        await sleep(800);
      }
    }

    // Check submissions
    const shift402Data = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_20') || '{}');
      if (!subs['402']) return { count: 0 };
      const keys = Object.keys(subs['402']);
      const sample = Object.values(subs['402'])[0];
      return {
        count: keys.length,
        firstDate: keys[0],
        location: sample?.location_name,
        hasStaffId: !!sample?.staff_id
      };
    });

    console.log(`✓ Submitted: ${shift402Data.count} dates manually`);
    if (shift402Data.count > 0) {
      console.log(`  - First date: ${shift402Data.firstDate}`);
      console.log(`  - Location: "${shift402Data.location}"`);
      console.log(`  - Has staff_id: ${shift402Data.hasStaffId}`);
    }

    // Step 4: Verify data structure
    console.log('\n--- Verification: Data Structure ---');
    const dataCheck = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_20') || '{}');
      const keys = Object.keys(subs);
      let allValid = true;

      keys.forEach(k => {
        Object.values(subs[k]).forEach(entry => {
          if (!entry.staff_id || !entry.staff_name) {
            allValid = false;
          }
        });
      });

      return {
        keys: keys.sort(),
        allNumeric: keys.every(k => !isNaN(parseInt(k))),
        entriesValid: allValid
      };
    });

    console.log(`✓ Submission keys: [${dataCheck.keys}]`);
    console.log(`✓ Keys are numeric: ${dataCheck.allNumeric}`);
    console.log(`✓ Entries valid (have staff_id/staff_name): ${dataCheck.entriesValid}`);

    // Summary
    console.log('\n========== RESULT ==========');
    const success = fixed401Data.count > 10 && shift402Data.count > 0 && dataCheck.allNumeric;

    if (fixed401Data.count > 10) {
      console.log(`✓ Fixed staff: ${fixed401Data.count} dates (expected ~22)`);
    } else {
      console.log(`✗ Fixed staff: ${fixed401Data.count} dates`);
    }

    if (shift402Data.count > 0) {
      console.log(`✓ Shift staff: ${shift402Data.count} dates`);
    } else {
      console.log(`✗ Shift staff: 0 dates`);
    }

    if (success) {
      console.log(`\n✓✓✓ System is working correctly ✓✓✓\n`);
    } else {
      console.log(`\n✗ Issues detected\n`);
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
