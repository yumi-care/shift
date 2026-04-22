const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.setDefaultTimeout(15000);

  try {
    console.log('\n========== PHASE 3 CORRECT FLOW TEST ==========\n');

    // Setup data
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('staffs_30', JSON.stringify([
        {
          staff_id: 501,
          staff_name: '阿部太郎',
          position: 'リーダー',
          work_days: '月火水木金',
          work_hours_start: '08:00',
          work_hours_end: '18:00'
        },
        {
          staff_id: 502,
          staff_name: '山田花子',
          position: 'ケアワーカー',
          work_days: '',
          work_hours_start: '',
          work_hours_end: ''
        }
      ]));
    });

    console.log('Setup: Created 2 staff in facility 30');
    console.log('  501: 阿部太郎 (work_days="月火水木金")');
    console.log('  502: 山田花子 (work_days="")');

    // Test 1: Fixed Staff
    console.log('\n--- TEST 1: Fixed Staff (with work_days) ---');
    const url = 'http://localhost:5173/phase3?corp_id=1&facility_id=30&year=2026&month=4';
    await page.goto(url, { waitUntil: 'networkidle0' });

    await sleep(2000);

    // First, check deadline checkbox
    console.log('✓ Checking deadline confirmation checkbox...');
    const deadlineCheckbox = await page.$('#deadline-confirm');
    if (deadlineCheckbox) {
      await deadlineCheckbox.click();
      console.log('✓ Deadline checkbox checked');
      await sleep(500);
    } else {
      console.log('✗ Deadline checkbox not found');
    }

    // Now the staff dropdown should appear
    const selectExists = await page.$('select#staff-select') !== null;
    if (!selectExists) {
      console.log('✗ Staff dropdown still not showing');
      const content = await page.evaluate(() => document.body.textContent.substring(0, 300));
      console.log('Page content:', content);
    } else {
      console.log('✓ Staff dropdown appeared');

      // Get available options
      const staffOptions = await page.$$eval('select#staff-select option', opts =>
        opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      console.log(`  Available: ${staffOptions.slice(1).map(o => o.text).join(', ')}`);

      // Select fixed staff
      await page.select('select#staff-select', '501');
      console.log('✓ Selected Staff 501 (固定勤務)');

      await sleep(1500);

      // Check for completion message
      const completionMsg = await page.evaluate(() => {
        const h4s = Array.from(document.querySelectorAll('h4'));
        const found = h4s.find(h => h.textContent.includes('申告完了'));
        return found ? found.textContent.trim() : null;
      });

      if (completionMsg) {
        console.log(`✓ Message: "${completionMsg}"`);
      }

      // Check localStorage
      const fixed501 = await page.evaluate(() => {
        const subs = JSON.parse(localStorage.getItem('shift_submissions_30') || '{}');
        if (!subs['501']) return { count: 0 };
        const keys = Object.keys(subs['501']);
        const sample = Object.values(subs['501'])[0];
        return {
          count: keys.length,
          firstDate: keys[0],
          location: sample?.location_name,
          staffId: sample?.staff_id
        };
      });

      console.log(`✓ Fixed staff: ${fixed501.count} dates auto-submitted`);
      if (fixed501.count > 0) {
        console.log(`  - Date: ${fixed501.firstDate}`);
        console.log(`  - Location: "${fixed501.location}"`);
        console.log(`  - Has staff_id: ${!!fixed501.staffId}`);
      }
    }

    // Test 2: Shift Submission Staff
    console.log('\n--- TEST 2: Shift Submission Staff (without work_days) ---');

    // Reload for fresh state
    await page.goto(url, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Check deadline again
    const deadlineCheckbox2 = await page.$('#deadline-confirm');
    if (deadlineCheckbox2) {
      await deadlineCheckbox2.click();
      await sleep(500);
    }

    // Select shift staff
    await page.select('select#staff-select', '502');
    console.log('✓ Selected Staff 502 (シフト申告制)');

    await sleep(1000);

    // Calendar should appear
    const hasCalendar = await page.$('.calendar-section') !== null;
    if (hasCalendar) {
      console.log('✓ Calendar displayed');

      // Click dates
      const days = await page.$$('.calendar-day.active');
      let clicked = [];

      for (let i = 0; i < days.length; i++) {
        const text = await days[i].evaluate(el => el.textContent.trim());
        const num = parseInt(text);
        if (num === 9 || num === 25) {
          await days[i].click();
          clicked.push(num);
        }
      }

      console.log(`✓ Selected ${clicked.length} dates (${clicked.join(', ')})`);

      await sleep(800);

      // Set locations using keyboard navigation
      const locSelects = await page.$$('select.location-select');
      for (let i = 0; i < locSelects.length; i++) {
        const select = locSelects[i];
        // Focus the select
        await select.focus();
        // Press down arrow to select next option (skips empty placeholder)
        await page.keyboard.press('ArrowDown');
        await sleep(200);
        // Press Enter to confirm
        await page.keyboard.press('Enter');
        await sleep(300);
      }
      console.log(`✓ Set locations for ${locSelects.length} dates`);

      // Debug: Check what's rendered  (proxy for React state)
      const debugState = await page.evaluate(() => {
        const selectedCards = document.querySelectorAll('.date-location-card');
        const staffSelect = document.querySelector('select#staff-select');
        const deadlineCheckbox = document.querySelector('#deadline-confirm');

        return {
          dateCardsCount: selectedCards.length,
          staffSelectValue: staffSelect?.value,
          deadlineChecked: deadlineCheckbox?.checked,
          buttonDisabled: document.querySelector('button.btn-confirm')?.disabled,
          selects: Array.from(document.querySelectorAll('select.location-select')).map(s => ({
            value: s.value,
            options: Array.from(s.querySelectorAll('option')).filter(o => o.value).map(o => ({ value: o.value, text: o.textContent }))
          }))
        };
      });

      console.log(`  State check:`);
      console.log(`    - Staff selected: ${debugState.staffSelectValue}`);
      console.log(`    - Deadline confirmed: ${debugState.deadlineChecked}`);
      console.log(`    - Date cards: ${debugState.dateCardsCount}`);
      console.log(`    - Location selects: ${debugState.selects.length}`);
      if (debugState.selects.length > 0) {
        debugState.selects.forEach((sel, i) => {
          console.log(`      Select ${i}: value="${sel.value}", options=[${sel.options.map(o => o.value).join(',')}]`);
        });
      }

      // Check button state
      const btnState = await page.evaluate(() => {
        const btn = document.querySelector('button.btn-confirm');
        if (!btn) return { found: false };
        return {
          found: true,
          disabled: btn.disabled,
          text: btn.textContent
        };
      });

      if (btnState.found) {
        console.log(`✓ Submit button found (disabled=${btnState.disabled}, text="${btnState.text}")`);
        if (!btnState.disabled) {
          const btn = await page.$('button.btn-confirm');
          await btn.click();
          console.log('✓ Submitted');
          await sleep(800);
        } else {
          console.log('✗ Submit button is disabled');
        }
      } else {
        console.log('✗ Submit button not found');
      }
    }

    // Check localStorage
    const shift502 = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_30') || '{}');
      if (!subs['502']) return { count: 0 };
      const keys = Object.keys(subs['502']);
      const sample = Object.values(subs['502'])[0];
      return {
        count: keys.length,
        firstDate: keys[0],
        location: sample?.location_name,
        staffId: sample?.staff_id
      };
    });

    console.log(`✓ Shift staff: ${shift502.count} dates submitted`);
    if (shift502.count > 0) {
      console.log(`  - Date: ${shift502.firstDate}`);
      console.log(`  - Location: "${shift502.location}"`);
      console.log(`  - Has staff_id: ${!!shift502.staffId}`);
    }

    // Final summary
    console.log('\n========== FINAL RESULT ==========');

    const allData = await page.evaluate(() => {
      const subs = JSON.parse(localStorage.getItem('shift_submissions_30') || '{}');
      return {
        staff501: subs['501'] ? Object.keys(subs['501']).length : 0,
        staff502: subs['502'] ? Object.keys(subs['502']).length : 0,
        keys: Object.keys(subs)
      };
    });

    console.log(`\n✓ Staff 501: ${allData.staff501} dates`);
    console.log(`✓ Staff 502: ${allData.staff502} dates`);
    console.log(`✓ Keys in localStorage: [${allData.keys}] (numeric = staff_id-based)`);

    if (allData.staff501 > 10 && allData.staff502 > 0) {
      console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓\n');
    } else {
      console.log('\n✗ Some tests need attention\n');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
