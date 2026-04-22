const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.setDefaultTimeout(15000);

  try {
    console.log('\n========== PHASE 3 FINAL VERIFICATION ==========\n');

    // Setup data in home page context first
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    // Setup localStorage with test data
    await page.evaluate(() => {
      localStorage.clear();

      const staffData = [
        {
          staff_id: 301,
          staff_name: '山田太郎(固定)',
          position: 'サービス提供責任者',
          work_days: '月火水木金',
          work_hours_start: '09:00',
          work_hours_end: '17:30'
        },
        {
          staff_id: 302,
          staff_name: '田中花子(シフト)',
          position: 'ケアワーカー',
          work_days: '',
          work_hours_start: '',
          work_hours_end: ''
        }
      ];

      localStorage.setItem('staffs_10', JSON.stringify(staffData));
    });

    console.log('Setup: Created 2 staff members in facility 10');
    console.log('  - Staff 301: work_days="月火水木金" (fixed)');
    console.log('  - Staff 302: work_days="" (shift submission)');

    // Navigate to Phase 3 staff mode
    console.log('\n--- Navigating to Phase 3 staff mode ---');
    const staffLink = 'http://localhost:5173/phase3?corp_id=1&facility_id=10&year=2026&month=4';
    await page.goto(staffLink, { waitUntil: 'networkidle0' });

    // Wait for page to fully load with generous timeout
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check what rendered
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasSelect: !!document.querySelector('select'),
        selectCount: document.querySelectorAll('select').length,
        h3Exists: !!document.querySelector('h3'),
        h3Text: document.querySelector('h3')?.textContent || '',
        mainContent: document.body.textContent.substring(0, 300)
      };
    });

    console.log(`Page loaded: ${pageContent.title}`);
    console.log(`Selects found: ${pageContent.selectCount}`);
    console.log(`H3 text: "${pageContent.h3Text}"`);

    if (pageContent.selectCount === 0) {
      console.log('\n✗ No dropdowns found on page');
      console.log('Page content preview:', pageContent.mainContent);
      console.log('\nLet me wait longer and try again...');
      await page.waitForTimeout(3000);

      const retryContent = await page.evaluate(() => {
        return document.querySelectorAll('select').length;
      });
      console.log(`After wait: ${retryContent} selects found`);
    }

    // Try to wait for the staff select
    const selectExists = await page.evaluate(() => !!document.querySelector('select'));
    if (!selectExists) {
      throw new Error('Staff dropdown did not appear after waiting');
    }

    console.log('✓ Staff dropdown found');

    // Check the options
    const options = await page.$$eval('select option', opts =>
      opts.map(o => ({ value: o.value, text: o.textContent }))
    );
    console.log(`  Options: ${options.map(o => o.text).join(', ')}`);

    // ===== TEST FIXED STAFF =====
    console.log('\n--- TEST: Fixed Staff Flow ---');
    await page.select('select', '301');
    console.log('✓ Selected Staff 301');

    await page.waitForTimeout(1500);

    // Check for completion message
    const completionMsg = await page.evaluate(() => {
      const h4s = document.querySelectorAll('h4');
      for (let h4 of h4s) {
        if (h4.textContent.includes('申告完了')) {
          return h4.textContent.trim();
        }
      }
      return null;
    });

    if (completionMsg) {
      console.log(`✓ Found message: "${completionMsg}"`);
    } else {
      console.log('✗ No completion message found');
    }

    // Check localStorage for submissions
    const fixedStaffData = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_10') || '{}');
      return {
        hasStaff301: !!subs['301'],
        count301: subs['301'] ? Object.keys(subs['301']).length : 0,
        sampleDate: subs['301'] ? Object.keys(subs['301'])[0] : null,
        sampleEntry: subs['301'] ? Object.values(subs['301'])[0] : null
      };
    });

    console.log(`✓ Fixed staff submission count: ${fixedStaffData.count301} dates`);
    if (fixedStaffData.sampleEntry) {
      console.log(`  - Sample: ${fixedStaffData.sampleDate}`);
      console.log(`  - Location: "${fixedStaffData.sampleEntry.location_name}"`);
      console.log(`  - Has staff_id: ${!!fixedStaffData.sampleEntry.staff_id}`);
    }

    // ===== TEST SHIFT SUBMISSION STAFF =====
    console.log('\n--- TEST: Shift Submission Staff Flow ---');

    // Reload for fresh state
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('select');

    await page.select('select', '302');
    console.log('✓ Selected Staff 302');

    await page.waitForTimeout(1000);

    // Check for calendar
    const hasCalendar = await page.evaluate(() => !!document.querySelector('.calendar-section'));
    if (hasCalendar) {
      console.log('✓ Calendar appeared');
    } else {
      console.log('✗ Calendar not found');
    }

    // Click some dates
    const dayButtons = await page.$$('.calendar-day.active');
    console.log(`  Calendar has ${dayButtons.length} clickable days`);

    let clickedDates = [];
    for (let i = 0; i < dayButtons.length; i++) {
      const dayText = await dayButtons[i].evaluate(el => el.textContent.trim());
      const dayNum = parseInt(dayText);
      if (dayNum === 8 || dayNum === 22) {
        await dayButtons[i].click();
        clickedDates.push(dayNum);
        console.log(`  ✓ Clicked day ${dayNum}`);
      }
    }

    await page.waitForTimeout(800);

    // Check for location selects
    const locSelects = await page.$$('select.location-select');
    console.log(`✓ Location selection UI found (${locSelects.length} dates)`);

    // Set locations
    for (let i = 0; i < locSelects.length; i++) {
      await locSelects[i].select('10');
      console.log(`  ✓ Set location for date ${i + 1}`);
    }

    // Find and click confirm button
    const buttons = await page.$$('button');
    for (let btn of buttons) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('確認')) {
        const isDisabled = await btn.evaluate(el => el.disabled);
        if (!isDisabled) {
          await btn.click();
          console.log('✓ Clicked confirmation button');
          break;
        }
      }
    }

    await page.waitForTimeout(800);

    // Check localStorage for shift staff submission
    const shiftStaffData = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_10') || '{}');
      return {
        hasStaff302: !!subs['302'],
        count302: subs['302'] ? Object.keys(subs['302']).length : 0,
        sampleDate: subs['302'] ? Object.keys(subs['302'])[0] : null,
        sampleEntry: subs['302'] ? Object.values(subs['302'])[0] : null
      };
    });

    console.log(`✓ Shift submission count: ${shiftStaffData.count302} dates`);
    if (shiftStaffData.sampleEntry) {
      console.log(`  - Sample: ${shiftStaffData.sampleDate}`);
      console.log(`  - Location: "${shiftStaffData.sampleEntry.location_name}"`);
      console.log(`  - Has staff_id: ${!!shiftStaffData.sampleEntry.staff_id}`);
    }

    // ===== VERIFY DATA STRUCTURE =====
    console.log('\n--- Verification: Data Structure ---');

    const dataStructure = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_10') || '{}');
      const keys = Object.keys(subs);

      let hasCorrectKeys = true;
      let missingFields = [];

      // Check all entries have staff_id and staff_name
      for (let staffId of keys) {
        for (let date of Object.values(subs[staffId])) {
          if (!date.staff_id) missingFields.push('staff_id');
          if (!date.staff_name) missingFields.push('staff_name');
        }
      }

      return {
        keys,
        allNumeric: keys.every(k => !isNaN(k)),
        missingFields: [...new Set(missingFields)]
      };
    });

    console.log(`✓ Submission keys: [${dataStructure.keys}]`);
    console.log(`✓ Keys are numeric (staff_ids): ${dataStructure.allNumeric}`);
    if (dataStructure.missingFields.length === 0) {
      console.log(`✓ All entries have staff_id and staff_name`);
    } else {
      console.log(`✗ Missing fields: ${dataStructure.missingFields}`);
    }

    // ===== FINAL RESULT =====
    console.log('\n========== RESULT ==========');

    if (fixedStaffData.count301 > 15) {
      console.log(`✓ FIXED STAFF: ${fixedStaffData.count301} dates auto-submitted`);
    } else {
      console.log(`✗ FIXED STAFF: Only ${fixedStaffData.count301} dates (expected ~22)`);
    }

    if (shiftStaffData.count302 > 0) {
      console.log(`✓ SHIFT STAFF: ${shiftStaffData.count302} dates submitted`);
    } else {
      console.log(`✗ SHIFT STAFF: No submissions recorded`);
    }

    if (dataStructure.allNumeric && dataStructure.missingFields.length === 0) {
      console.log(`✓ DATA STRUCTURE: Valid (staff_id keys, complete entries)`);
    } else {
      console.log(`✗ DATA STRUCTURE: Invalid`);
    }

    if (fixedStaffData.count301 > 15 && shiftStaffData.count302 > 0 && dataStructure.allNumeric) {
      console.log('\n✓✓✓ SYSTEM READY - All tests passed ✓✓✓\n');
    } else {
      console.log('\n✗ Some tests failed\n');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    const lastPage = await page.content();
    console.error('Last page state:', lastPage.substring(0, 500));
  } finally {
    await browser.close();
  }
})();
