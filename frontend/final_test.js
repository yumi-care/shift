const puppeteer = require('puppeteer');
const timestamp = Date.now();
const testName = `最終テスト_${timestamp}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log(`\n🎯 Final Production Test: ${testName}\n`);
    
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[ERROR]', msg.text());
    });

    console.log('1️⃣ Loading Phase 1...');
    await page.goto('https://shift-one-tawny.vercel.app/phase1', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await sleep(2000);
    console.log('✓ Page loaded\n');

    console.log('2️⃣ Entering corporation name...');
    await page.type('input[name="corp_name"]', testName);
    console.log('✓ Name entered\n');

    console.log('3️⃣ Clicking create button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(b => b.textContent.includes('新しい法人を作成'))?.click();
    });
    await sleep(1000);
    console.log('✓ Create button clicked\n');

    console.log('4️⃣ Clicking confirm...');
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(b => b.textContent.includes('登録'))?.click();
    });
    
    await sleep(2000);
    console.log(`✓ Confirm clicked - Alert: "${alertMessage}"\n`);

    // Check page step
    const step = await page.evaluate(() => {
      const steps = document.querySelectorAll('.step-label');
      return Array.from(steps).map(s => ({label: s.textContent, active: s.closest('.active') ? true : false}));
    });
    console.log('Current step:', step);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
    
    console.log('\n5️⃣ Verifying in Supabase...');
    const { execSync } = require('child_process');
    try {
      const result = JSON.parse(
        execSync(`curl -s -X GET 'https://ohdndxzjjhiqievsjdit.supabase.co/rest/v1/corporations?select=*&order=created_at.desc&limit=1' -H "apikey: sb_publishable_43JaYhrkv86IzyqBWfBSEQ_eoxYNuoB"`).toString()
      );
      
      if (result[0]?.corp_name === testName) {
        console.log(`✅ SUCCESS: Data saved\n`);
        console.log(`   ID: ${result[0].corp_id}`);
        console.log(`   Name: ${result[0].corp_name}`);
        console.log(`   Created: ${result[0].created_at}\n`);
        console.log('🎉 Phase 1 is fully operational!\n');
      } else {
        console.log(`❌ FAILED: Data not in database`);
        console.log(`Latest: ${result[0].corp_name}`);
      }
    } catch (err) {
      console.log('❌ Verification failed:', err.message);
    }
  }
})();
