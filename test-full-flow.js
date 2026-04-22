const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('\n=== FULL FLOW TEST WITH REAL DATA ===\n');

    // Step 1: Login with demo account
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    console.log('2. Clicking デモでログイン (Demo Login)...');
    const demoBtn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (demoBtn) {
      console.log('   ✓ Demo login clicked');
      await wait(3000);
    } else {
      console.log('   ✗ Demo button not found');
    }

    // Check if logged in
    const loggedIn = await page.evaluate(() => {
      return localStorage.getItem('is_logged_in');
    });
    console.log('   Logged in:', loggedIn ? 'YES' : 'NO');

    // Step 2: Navigate to Phase 2 and check if corp/facility exist
    console.log('\n3. Navigating to Phase 2...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await wait(2000);

    const corps = await page.evaluate(() => {
      const data = localStorage.getItem('corporations');
      return data ? JSON.parse(data) : null;
    });

    console.log('   Corporations found:', corps ? corps.length : 0);
    if (corps && corps.length > 0) {
      console.log(`   - ${corps[0].corp_name} (id: ${corps[0].corp_id})`);
    }

    // Step 3: Check facilities
    const facilities = await page.evaluate(() => {
      if (!localStorage.getItem('corporations')) return null;
      const corps = JSON.parse(localStorage.getItem('corporations'));
      const corpId = corps[0].corp_id;
      const data = localStorage.getItem(`facilities_${corpId}`);
      return data ? JSON.parse(data) : null;
    });

    console.log('   Facilities found:', facilities ? facilities.length : 0);
    let corpId = null, facilityId = null;
    if (facilities && facilities.length > 0) {
      console.log(`   - ${facilities[0].facility_name} (id: ${facilities[0].facility_id})`);
      corpId = facilities[0].corp_id;
      facilityId = facilities[0].facility_id;
    }

    // Step 4: Check if staff already registered
    const staffs = await page.evaluate((fId) => {
      const data = localStorage.getItem(`staffs_${fId}`);
      return data ? JSON.parse(data) : null;
    }, facilityId);

    console.log('\n4. Checking registered staff...');
    console.log('   Staff registered:', staffs && staffs.length > 0 ? staffs.length : 0);
    
    if (staffs && staffs.length > 0) {
      console.log('   Existing staff:');
      staffs.forEach(s => {
        console.log(`     - ${s.staff_name} (${s.position})`);
      });
    }

    // Step 5: Navigate to Phase 3
    if (corpId && facilityId) {
      console.log('\n5. Navigating to Phase 3...');
      await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2' });
      await wait(2000);

      // Step 6: Generate staff link
      console.log('6. Generating staff submission link...');
      
      // Select corporation
      const hasCorpSelect = await page.$('#admin-corp-select') !== null;
      console.log('   Corp select exists:', hasCorpSelect);

      if (hasCorpSelect) {
        await page.select('#admin-corp-select', corpId.toString());
        await wait(1000);

        // Select facility
        const hasFacSelect = await page.$('#admin-facility-select') !== null;
        if (hasFacSelect) {
          await page.select('#admin-facility-select', facilityId.toString());
          await wait(1000);
        }

        // Look for generate button and click
        const generateBtn = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes('生成')) {
              return btn.textContent;
            }
          }
          return null;
        });

        console.log('   Generate button found:', generateBtn ? 'YES' : 'NO');

        // Step 7: Access staff mode link directly
        console.log('\n7. Accessing Phase 3 staff mode link directly...');
        const staffLink = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=${facilityId}&year=2026&month=4`;
        console.log(`   URL: ${staffLink}`);
        
        await page.goto(staffLink, { waitUntil: 'networkidle2' });
        await wait(2000);

        // Step 8: Check dropdown
        console.log('\n8. Checking staff dropdown...');
        
        // First, confirm deadline
        const deadlineCheckboxExists = await page.$('#deadline-confirm') !== null;
        console.log('   Deadline checkbox exists:', deadlineCheckboxExists);

        if (deadlineCheckboxExists) {
          await page.click('#deadline-confirm');
          await wait(1000);
        }

        // Check dropdown
        const dropdownExists = await page.$('#staff-select') !== null;
        console.log('   Staff dropdown exists AFTER confirming deadline:', dropdownExists);

        if (dropdownExists) {
          const options = await page.$$eval('#staff-select option', opts =>
            opts.map(o => o.textContent.trim())
          );
          console.log(`   Dropdown options (${options.length}):`, options);

          if (options.length > 1) {
            console.log('\n   ✓✓✓ SUCCESS! Staff dropdown is populated!');
          } else {
            console.log('\n   ✗ Dropdown is empty');
          }
        } else {
          console.log('   ✗ Dropdown not found');
          const errorText = await page.evaluate(() => document.body.innerText);
          if (errorText.includes('スタッフが登録されていません')) {
            console.log('   Error: Shows "スタッフが登録されていません"');
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n✓ Browser will stay open for 30 seconds. Inspect the page manually if needed.');
    await wait(30000);
    await browser.close();
  }
}

run();
