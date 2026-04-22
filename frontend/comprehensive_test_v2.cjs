const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Setup initial data in localStorage first, BEFORE navigating
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Clear and setup data
  await page.evaluate(() => {
    localStorage.clear();

    // Phase 2 staff data
    const staffData = [
      {
        staff_id: 201,
        staff_name: '固定勤務スタッフA',
        position: 'カウンセラー',
        work_days: '月火水木金', // Fixed schedule
        work_hours_start: '09:00',
        work_hours_end: '17:00'
      },
      {
        staff_id: 202,
        staff_name: 'シフト制スタッフB',
        position: 'ヘルパー',
        work_days: '', // Shift submission
        work_hours_start: '',
        work_hours_end: ''
      }
    ];

    const facilities = [
      {
        facility_id: 5,
        facility_name: 'テスト事業所'
      }
    ];

    localStorage.setItem('staffs_5', JSON.stringify(staffData));
    localStorage.setItem('facilities_1', JSON.stringify(facilities));
    localStorage.setItem('corporations_', JSON.stringify([{
      corp_id: 1,
      corp_name: 'テスト法人'
    }]));
  });

  console.log('\n========== PHASE 3 END-TO-END TEST ==========\n');
  console.log('Initial Setup:');
  console.log('  - Facility ID: 5, Corp ID: 1');
  console.log('  - Staff 201: 固定勤務スタッフA (work_days: 月火水木金)');
  console.log('  - Staff 202: シフト制スタッフB (work_days: empty)');

  try {
    // ===== TEST 1: Fixed Staff Flow =====
    console.log('\n--- TEST 1: Fixed Staff (with work_days) ---');
    const phase3Url = 'http://localhost:5173/phase3?corp_id=1&facility_id=5&year=2026&month=4';
    await page.goto(phase3Url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for the staff selection dropdown
    try {
      await page.waitForSelector('select', { timeout: 5000 });
      console.log('✓ Staff dropdown appeared');
    } catch (e) {
      console.log('✗ Dropdown not found, checking page content...');
      const pageText = await page.evaluate(() => document.body.textContent);
      console.log('Page contains:', pageText.substring(0, 200));
      throw new Error('Dropdown missing');
    }

    // Select fixed staff
    const options = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log(`  Available options: ${options.map(o => `"${o.text}"`).join(', ')}`);

    await page.select('select', '201');
    console.log('✓ Selected Staff 201 (Fixed Schedule)');

    // Wait for message
    await page.waitForTimeout(1000);

    // Check for the "申告完了" message
    const autoMessage = await page.evaluate(() => {
      const h4 = document.querySelector('h4');
      return h4 ? h4.textContent.trim() : null;
    });
    console.log(`✓ Message: "${autoMessage}"`);

    // Check localStorage
    const submitted1 = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('shift_submissions_5') || '{}');
    });

    if (submitted1['201']) {
      const count = Object.keys(submitted1['201']).length;
      console.log(`✓ Staff 201 auto-submitted ${count} dates`);

      const firstDate = Object.keys(submitted1['201'])[0];
      const firstEntry = submitted1['201'][firstDate];
      console.log(`  - First date: ${firstDate}`);
      console.log(`  - Location: "${firstEntry.location_name}"`);
      console.log(`  - staff_id in entry: ${firstEntry.staff_id}`);
      console.log(`  - staff_name in entry: "${firstEntry.staff_name}"`);
    } else {
      console.log('✗ Staff 201 submission not found in localStorage');
    }

    // ===== TEST 2: Shift Submission Staff Flow =====
    console.log('\n--- TEST 2: Shift Submission Staff (without work_days) ---');

    // Reload page for fresh state
    await page.goto(phase3Url, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('select', { timeout: 5000 });

    // Select shift submission staff
    await page.select('select', '202');
    console.log('✓ Selected Staff 202 (Shift Submission)');

    // Wait for calendar
    await page.waitForSelector('.calendar-section', { timeout: 5000 });
    console.log('✓ Calendar appeared for date selection');

    // Get and click calendar days
    const dayElements = await page.$$('.calendar-day.active');
    console.log(`  Calendar has ${dayElements.length} selectable days`);

    // Click days 5 and 15
    let clickedCount = 0;
    for (let i = 0; i < dayElements.length; i++) {
      const text = await dayElements[i].evaluate(el => el.textContent.trim());
      const dayNum = parseInt(text);
      if (dayNum === 5 || dayNum === 15) {
        await dayElements[i].click();
        clickedCount++;
        console.log(`  ✓ Clicked day ${dayNum}`);
      }
    }

    // Wait for location selection UI
    await page.waitForSelector('select.location-select', { timeout: 5000 });
    console.log(`✓ Location selection appeared for ${clickedCount} dates`);

    // Select location for each date
    const locSelects = await page.$$('select.location-select');
    for (let i = 0; i < locSelects.length; i++) {
      await locSelects[i].select('5'); // Select facility as location
      console.log(`  ✓ Selected location for date ${i + 1}`);
    }

    // Submit
    const confirmBtn = await page.$('button:not(:disabled)');
    if (confirmBtn) {
      const btnText = await confirmBtn.evaluate(el => el.textContent);
      if (btnText.includes('確認')) {
        await confirmBtn.click();
        console.log('✓ Clicked confirmation button');
        await page.waitForTimeout(1000);
      }
    }

    // Check what was saved
    const submitted2 = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('shift_submissions_5') || '{}');
    });

    if (submitted2['202']) {
      const count = Object.keys(submitted2['202']).length;
      console.log(`✓ Staff 202 submitted ${count} dates manually`);

      const firstDate = Object.keys(submitted2['202'])[0];
      const firstEntry = submitted2['202'][firstDate];
      console.log(`  - First date: ${firstDate}`);
      console.log(`  - Location ID: "${firstEntry.location_id}"`);
      console.log(`  - staff_id in entry: ${firstEntry.staff_id}`);
      console.log(`  - staff_name in entry: "${firstEntry.staff_name}"`);
    } else {
      console.log('✗ Staff 202 submission not found');
    }

    // ===== TEST 3: Dashboard Data =====
    console.log('\n--- TEST 3: Dashboard Data Verification ---');

    const finalData = await page.evaluate(() => {
      const staffs = JSON.parse(localStorage.getItem('staffs_5') || '[]');
      const submissions = JSON.parse(localStorage.getItem('shift_submissions_5') || '{}');

      return {
        staffs,
        submissionKeys: Object.keys(submissions),
        staff201Count: submissions['201'] ? Object.keys(submissions['201']).length : 0,
        staff202Count: submissions['202'] ? Object.keys(submissions['202']).length : 0,
        firstEntry201: submissions['201'] ? Object.values(submissions['201'])[0] : null,
        firstEntry202: submissions['202'] ? Object.values(submissions['202'])[0] : null
      };
    });

    console.log('Final State:');
    console.log(`  - Submission keys: ${finalData.submissionKeys}`);
    console.log(`  - Staff 201: ${finalData.staff201Count} submissions (固定勤務)`);
    console.log(`  - Staff 202: ${finalData.staff202Count} submissions (シフト申告)`);

    // Verify data structure
    let hasCorrectStructure = true;
    [finalData.firstEntry201, finalData.firstEntry202].forEach((entry, i) => {
      if (entry) {
        if (!entry.staff_id || !entry.staff_name) {
          hasCorrectStructure = false;
          console.log(`  ✗ Entry ${i} missing staff_id or staff_name`);
        }
      }
    });

    if (hasCorrectStructure && finalData.staff201Count > 10 && finalData.staff202Count > 0) {
      console.log(`  ✓ Data structure valid (staff_id keys, staff_id in entries)`);
    }

    // ===== SUMMARY =====
    console.log('\n========== SUMMARY ==========');
    if (finalData.staff201Count > 10) {
      console.log(`✓ FIXED STAFF: ${finalData.staff201Count} dates auto-submitted (expected ~22 for April)`);
    } else {
      console.log(`✗ FIXED STAFF: Only ${finalData.staff201Count} dates (expected ~22)`);
    }

    if (finalData.staff202Count > 0) {
      console.log(`✓ SHIFT STAFF: ${finalData.staff202Count} dates manually submitted`);
    } else {
      console.log(`✗ SHIFT STAFF: ${finalData.staff202Count} dates submitted`);
    }

    if (hasCorrectStructure) {
      console.log(`✓ DATA STRUCTURE: Correct (staff_id keys, staff_id/staff_name in entries)`);
    } else {
      console.log(`✗ DATA STRUCTURE: Issues detected`);
    }

    console.log('\n');

  } catch (error) {
    console.error('\n✗ Test Error:', error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
})();
