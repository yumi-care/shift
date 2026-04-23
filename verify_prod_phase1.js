const puppeteer = require('puppeteer');
const timestamp = Date.now();
const testCorpName = `テスト法人_${timestamp}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    console.log(`\n🔍 Testing Phase 1 Production Registration\n`);
    console.log(`Test Corp Name: ${testCorpName}\n`);
    
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Capture errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ BROWSER ERROR:', msg.text());
      }
    });

    // Navigate to production
    await page.goto('https://shift-one-tawny.vercel.app/phase1', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✓ Page loaded');

    await sleep(2000);

    // Fill corporation name
    await page.type('input[name="corp_name"]', testCorpName, { delay: 30 });
    console.log('✓ Corp name typed');

    // Click create button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('新しい法人を作成'));
      if (btn) btn.click();
    });
    console.log('✓ Create button clicked');

    await sleep(1500);

    // Click confirm
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = buttons.find(b => b.textContent.includes('登録'));
      if (confirmBtn) confirmBtn.click();
    });
    console.log('✓ Confirm button clicked');

    await sleep(3000);

    // Check page result
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasSuccess = pageText.includes('法人を登録しました');
    console.log(`UI Result: ${hasSuccess ? '✅ Success message shown' : '❌ No success message'}\n`);

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    if (browser) await browser.close();
    
    // Now verify in database
    console.log(`\n🔍 Checking Supabase for: ${testCorpName}\n`);
    
    const curl = require('child_process').execSync;
    try {
      const result = curl(`curl -s -X GET 'https://ohdndxzjjhiqievsjdit.supabase.co/rest/v1/corporations?select=*' -H "apikey: sb_publishable_43JaYhrkv86IzyqBWfBSEQ_eoxYNuoB"`).toString();
      const corps = JSON.parse(result);
      const found = corps.find(c => c.corp_name === testCorpName);
      
      if (found) {
        console.log(`✅ Data FOUND in Supabase!`);
        console.log(`   ID: ${found.corp_id}`);
        console.log(`   Name: ${found.corp_name}`);
        console.log(`   Created: ${found.created_at}`);
      } else {
        console.log(`❌ Data NOT found in Supabase after creation`);
        console.log(`\nLatest corporations in database:`);
        corps.slice(0, 5).forEach(c => {
          console.log(`   - ${c.corp_name} (ID: ${c.corp_id})`);
        });
      }
    } catch (err) {
      console.log('❌ Database verification failed:', err.message);
    }
  }
})();
