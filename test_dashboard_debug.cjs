const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== Dashboard Data Debug ==========\n');
    
    // Prepare data
    console.log('1. Setting up test data...');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      // Phase 2 staff with work_days
      const staffData = [
        {
          "staff_id": 5001,
          "facility_id": "2",
          "location_ids": [],
          "staff_name": "テスト山田",
          "position": "管理者",
          "work_hours_start": "09:00",
          "work_hours_end": "18:00",
          "break_start": "12:00",
          "break_end": "13:00",
          "work_days": "月火水木金"
        }
      ];
      
      // Shift submissions in the correct format
      const submissionsData = {
        "5001": {
          "2026-04-01": {
            "staff_id": "5001",
            "staff_name": "テスト山田",
            "location_id": 1,
            "location_name": "三本木拠点",
            "submitted_at": "2026-04-17T00:00:00Z",
            "status": "submitted"
          },
          "2026-04-02": {
            "staff_id": "5001",
            "staff_name": "テスト山田",
            "location_id": 1,
            "location_name": "三本木拠点",
            "submitted_at": "2026-04-17T00:00:00Z",
            "status": "submitted"
          },
          "2026-04-03": {
            "staff_id": "5001",
            "staff_name": "テスト山田",
            "location_id": 2,
            "location_name": "田子拠点",
            "submitted_at": "2026-04-17T00:00:00Z",
            "status": "submitted"
          }
        }
      };
      
      localStorage.setItem('staffs_2', JSON.stringify(staffData));
      localStorage.setItem('shift_submissions_2', JSON.stringify(submissionsData));
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ staff data set');
    console.log('✓ submissions data set');
    
    // Go to dashboard
    console.log('\n2. Going to dashboard...');
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 2000));
    
    // Get corporations
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return [];
      return Array.from(select.options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log(`✓ corporations: ${corps.map(c => c.text).join(', ')}`);
    
    if (corps.length === 0) {
      console.log('No corporations found');
      await browser.close();
      return;
    }
    
    // Select first corp
    const corpId = corps[0].value;
    await page.select('select:first-of-type', corpId);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✓ corporation selected: ${corpId}`);
    
    // Get facilities
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return [];
      return Array.from(selects[1].options).filter(opt => opt.value).map(opt => ({ value: opt.value, text: opt.textContent }));
    });
    console.log(`✓ facilities: ${facilities.map(f => f.text).join(', ')}`);
    
    if (facilities.length === 0) {
      console.log('No facilities');
      await browser.close();
      return;
    }
    
    const facilityId = facilities[0].value;
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      if (selects.length >= 2) {
        selects[1].value = fId;
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, facilityId);
    console.log(`✓ facility selected: ${facilityId}`);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Select year/month
    console.log('\n3. Selecting year and month...');
    const selects = await page.$$('select');
    if (selects.length >= 4) {
      // Year is index 2, Month is index 3
      await selects[2].evaluate(select => {
        select.value = '2026';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      await selects[3].evaluate(select => {
        select.value = '04';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    
    await new Promise(r => setTimeout(r, 2000));
    console.log('✓ year/month selected (2026/04)');
    
    // Check what's displayed
    console.log('\n4. Checking dashboard content...');
    const content = await page.evaluate(() => {
      return {
        hasTable: document.querySelector('table.shift-table') !== null,
        tableHTML: document.querySelector('table.shift-table')?.innerHTML.substring(0, 500) || 'NO TABLE',
        hasStaffName: document.body.textContent.includes('テスト山田'),
        bodyText: document.body.textContent.substring(0, 600)
      };
    });
    
    console.log(`✓ table found: ${content.hasTable}`);
    console.log(`✓ staff name displayed: ${content.hasStaffName}`);
    
    if (content.hasTable) {
      console.log('\nTable HTML (first 500 chars):');
      console.log(content.tableHTML);
    } else {
      console.log('\nBody text (first 600 chars):');
      console.log(content.bodyText);
    }
    
    // Check the raw data
    console.log('\n5. Raw localStorage check...');
    const rawData = await page.evaluate(() => {
      return {
        staffs_2: JSON.parse(localStorage.getItem('staffs_2') || '[]'),
        submissions_2: JSON.parse(localStorage.getItem('shift_submissions_2') || '{}')
      };
    });
    
    console.log('staffs_2:', rawData.staffs_2.length, 'staff(s)');
    console.log('submissions_2:', Object.keys(rawData.submissions_2).length, 'staff(s) submitted');
    
    if (rawData.staffs_2.length > 0) {
      console.log('\nFirst staff:');
      console.log(JSON.stringify(rawData.staffs_2[0], null, 2));
    }
    
    if (Object.keys(rawData.submissions_2).length > 0) {
      console.log('\nFirst submission:');
      const firstKey = Object.keys(rawData.submissions_2)[0];
      console.log(`Key: ${firstKey}`);
      const firstSubmission = rawData.submissions_2[firstKey];
      console.log('Dates:', Object.keys(firstSubmission));
      console.log('First date entry:', JSON.stringify(Object.values(firstSubmission)[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
