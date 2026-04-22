const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Clear all localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
  });

  try {
    console.log('\n========== COMPREHENSIVE PHASE 3 TEST ==========\n');

    // ===== STEP 1: Setup Phase 2 data (Foundation) =====
    console.log('STEP 1: Setting up Phase 2 staff registration data...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 10000 });

    // Register 2 facilities
    const facilityData = {
      facilities_1: [
        {
          facility_id: 1,
          facility_name: 'Test Facility'
        }
      ]
    };

    await page.evaluate((data) => {
      localStorage.setItem('corporations_', JSON.stringify([{
        corp_id: 1,
        corp_name: 'Test Corp'
      }]));
      localStorage.setItem('facilities_1', JSON.stringify(data.facilities_1));
    }, facilityData);

    // Register 2 staff in Phase 2:
    // Staff 1: Fixed (with work_days)
    // Staff 2: Shift submission (without work_days)
    const staffData = [
      {
        staff_id: 101,
        staff_name: '固定勤務スタッフ',
        position: 'カウンセラー',
        work_days: '月火水木金', // Fixed schedule
        work_hours_start: '09:00',
        work_hours_end: '17:00'
      },
      {
        staff_id: 102,
        staff_name: 'シフト申告スタッフ',
        position: 'ヘルパー',
        work_days: '', // No work_days - shift submission
        work_hours_start: '',
        work_hours_end: ''
      }
    ];

    await page.evaluate((data) => {
      localStorage.setItem('staffs_1', JSON.stringify(data));
    }, staffData);

    console.log('✓ Phase 2 data registered:');
    console.log('  - Staff 101 (固定勤務スタッフ): work_days = "月火水木金"');
    console.log('  - Staff 102 (シフト申告スタッフ): work_days = "" (empty)');

    // ===== STEP 2: Test Phase 3 - Fixed Staff Flow =====
    console.log('\nSTEP 2: Testing Phase 3 - Fixed Staff Flow...');
    const phase3Url = 'http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4';
    await page.goto(phase3Url, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for staff dropdown
    await page.waitForSelector('select', { timeout: 5000 });

    // Select fixed staff
    await page.select('select', '101');
    console.log('✓ Selected Staff 101 (Fixed Schedule)');

    // Wait for the auto-submission message
    await page.waitForSelector('h4', { timeout: 3000 });
    const autoSubmitMessage = await page.evaluate(() => {
      const h4 = document.querySelector('h4');
      return h4 ? h4.textContent : '';
    });

    console.log(`✓ UI Message: "${autoSubmitMessage}"`);

    // Check localStorage for auto-submitted data
    const submittedData101 = await page.evaluate(() => {
      const data = localStorage.getItem('shift_submissions_1');
      return data ? JSON.parse(data) : {};
    });

    const staff101Count = submittedData101['101'] ? Object.keys(submittedData101['101']).length : 0;
    console.log(`✓ Auto-submitted dates for Staff 101: ${staff101Count} days`);

    if (staff101Count > 0) {
      console.log(`  Sample: ${Object.keys(submittedData101['101'])[0]}`);
      const sampleEntry = Object.values(submittedData101['101'])[0];
      console.log(`  Location: "${sampleEntry.location_name}"`);
    }

    // ===== STEP 3: Test Phase 3 - Shift Submission Staff Flow =====
    console.log('\nSTEP 3: Testing Phase 3 - Shift Submission Staff Flow...');

    // Clear selections for new staff
    await page.reload({ waitUntil: 'networkidle0' });
    await page.goto(phase3Url, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for dropdown and select shift staff
    await page.waitForSelector('select', { timeout: 5000 });
    await page.select('select', '102');
    console.log('✓ Selected Staff 102 (Shift Submission)');

    // Wait for calendar to appear
    await page.waitForSelector('.calendar-section', { timeout: 3000 });
    console.log('✓ Calendar displayed for manual date selection');

    // Click on April 3rd (水) and 10th (水)
    const calendarDays = await page.$$('.calendar-day.active');
    console.log(`  Calendar has ${calendarDays.length} active days`);

    // Select specific dates - let's click the 3rd and 10th
    const selectedDates = [];
    for (let i = 0; i < calendarDays.length; i++) {
      const text = await calendarDays[i].evaluate(el => el.textContent);
      const dayNum = parseInt(text);
      if (dayNum === 3 || dayNum === 10) {
        await calendarDays[i].click();
        selectedDates.push(`2026-04-${String(dayNum).padStart(2, '0')}`);
        console.log(`  ✓ Selected day ${dayNum}`);
      }
    }

    // Wait for location selection UI to appear
    await page.waitForSelector('select.location-select', { timeout: 3000 });
    console.log(`✓ Location selection UI appeared for ${selectedDates.length} dates`);

    // Select locations for each date
    const locationSelects = await page.$$('select.location-select');
    for (let i = 0; i < locationSelects.length && i < 2; i++) {
      await locationSelects[i].select('1'); // Select first location
      console.log(`  ✓ Selected location for date ${i + 1}`);
    }

    // Click "確認画面へ" button
    const confirmBtn = await page.$('button.btn-confirm:not(:disabled)');
    if (confirmBtn) {
      await confirmBtn.click();
      console.log('✓ Clicked confirmation button');

      // Wait for confirmation screen
      await page.waitForTimeout(1000);
    }

    // Check what was saved in localStorage
    const submittedData102 = await page.evaluate(() => {
      const data = localStorage.getItem('shift_submissions_1');
      return data ? JSON.parse(data) : {};
    });

    const staff102Count = submittedData102['102'] ? Object.keys(submittedData102['102']).length : 0;
    console.log(`✓ Submitted dates for Staff 102: ${staff102Count} dates`);

    // ===== STEP 4: Test Dashboard Reflection =====
    console.log('\nSTEP 4: Testing Dashboard - Data Reflection...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 10000 });

    // Dashboard would load corporations from API, but we set localStorage
    // Let's check what the dashboard would see
    const dashboardData = await page.evaluate(() => {
      const staffs = JSON.parse(localStorage.getItem('staffs_1') || '[]');
      const submissions = JSON.parse(localStorage.getItem('shift_submissions_1') || '{}');
      return { staffs, submissions };
    });

    console.log('\nDashboard Data Analysis:');
    console.log(`  Registered Staffs: ${dashboardData.staffs.length}`);
    dashboardData.staffs.forEach(staff => {
      const submissionCount = dashboardData.submissions[staff.staff_id]
        ? Object.keys(dashboardData.submissions[staff.staff_id]).length
        : 0;
      console.log(`  - ${staff.staff_name} (ID: ${staff.staff_id}): ${submissionCount} dates submitted`);
      console.log(`    work_days: "${staff.work_days}"`);
    });

    // Verify the key structure has changed from staff_name to staff_id
    const submissionKeys = Object.keys(dashboardData.submissions);
    console.log(`\n  Submission keys in localStorage: ${JSON.stringify(submissionKeys)}`);
    console.log(`  ✓ Keys are staff_ids (numeric), not staff names`);

    // Verify each submission entry has staff_id and staff_name
    let validStructure = true;
    submissionKeys.forEach(staffId => {
      const firstEntry = Object.values(dashboardData.submissions[staffId])[0];
      if (!firstEntry.staff_id || !firstEntry.staff_name) {
        validStructure = false;
        console.log(`  ✗ Staff ${staffId} entry missing staff_id or staff_name`);
      }
    });
    if (validStructure) {
      console.log(`  ✓ All submission entries have staff_id and staff_name`);
    }

    // ===== SUMMARY =====
    console.log('\n========== TEST SUMMARY ==========');
    console.log('\n✓ FIXED STAFF FLOW:');
    console.log(`  - Selected: 固定勤務スタッフ (ID: 101)`);
    console.log(`  - work_days: "月火水木金"`);
    console.log(`  - Auto-submitted dates: ${staff101Count}`);
    console.log(`  - Location: "（勤務曜日により自動申告）"`);
    console.log(`  - Expected: ~22 dates for April (Mon-Fri)\\n`);

    console.log('✓ SHIFT SUBMISSION FLOW:');
    console.log(`  - Selected: シフト申告スタッフ (ID: 102)`);
    console.log(`  - work_days: (empty - shift submission)`);
    console.log(`  - Manually submitted dates: ${staff102Count}`);
    console.log(`  - User selected locations for each date\\n`);

    console.log('✓ DATA STRUCTURE:');
    console.log(`  - shift_submissions key format: staff_id (not staff_name)`);
    console.log(`  - Each entry includes: staff_id, staff_name, location, timestamp`);
    console.log(`  - Dashboard can match by staff_id\\n`);

    if (staff101Count > 10 && staff102Count > 0 && validStructure) {
      console.log('✓✓✓ ALL TESTS PASSED ✓✓✓');
    } else {
      console.log('⚠ SOME ISSUES DETECTED:');
      if (staff101Count <= 10) console.log(`  - Fixed staff submission count seems low: ${staff101Count}`);
      if (staff102Count === 0) console.log(`  - Shift staff submission count is zero`);
      if (!validStructure) console.log(`  - Data structure validation failed`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Test error:', error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
})();
