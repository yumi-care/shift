const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('========== フルフロー検証：テストさん登録～Phase3確認 ==========\n');
    
    // ログイン
    console.log('【1】ログイン');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('is_logged_in', 'true');
    });
    console.log('✓ ログイン設定完了\n');
    
    // Phase 2でテストさん登録
    console.log('【2】Phase 2 - テストさん登録');
    await page.goto('http://localhost:5173/phase2');
    await new Promise(r => setTimeout(r, 2000));
    
    // 法人選択
    const corps = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return null;
      const opts = Array.from(select.options).filter(opt => opt.value);
      return opts.length > 0 ? opts[0].value : null;
    });
    
    if (!corps) {
      console.log('❌ 法人が見つかりません');
      await browser.close();
      return;
    }
    
    await page.select('select:first-of-type', corps);
    await new Promise(r => setTimeout(r, 800));
    console.log(`✓ 法人選択: ${corps}`);
    
    // 事業所選択
    const facilities = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      if (selects.length < 2) return null;
      const opts = Array.from(selects[1].options).filter(opt => opt.value);
      return opts.length > 0 ? opts[0].value : null;
    });
    
    if (!facilities) {
      console.log('❌ 事業所が見つかりません');
      await browser.close();
      return;
    }
    
    await page.evaluate((fId) => {
      const selects = document.querySelectorAll('select');
      selects[1].value = fId;
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, facilities);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`✓ 事業所選択: ${facilities}`);
    
    // フォーム記入
    await page.type('input[name="staff_name"]', 'テストさん', { delay: 50 });
    console.log('✓ 名前入力: "テストさん"');
    
    // 職種選択
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    console.log('✓ 職種選択');
    
    // 登録
    let alertMsg = '';
    page.on('dialog', async dialog => {
      alertMsg = dialog.message();
      await dialog.accept();
    });
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('スタッフを追加')) {
          btn.click();
          break;
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    console.log(`✓ 登録: "${alertMsg}"\n`);
    
    // localStorage確認
    const staffs = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem(`staffs_${2}`) || '[]');
    });
    console.log(`✓ localStorage確認: staffs_2 に ${staffs.length} 名`);
    staffs.forEach((s, i) => {
      console.log(`  [${i+1}] "${s.staff_name}" (ID=${s.staff_id})`);
    });
    
    const hasTestsan = staffs.some(s => s.staff_name === 'テストさん');
    if (!hasTestsan) {
      console.log('\n⚠️ 警告：テストさんがlocalStorageに保存されていません');
      console.log('登録処理が失敗した可能性があります\n');
      await browser.close();
      return;
    }
    console.log('');
    
    // Phase 3確認
    console.log('【3】Phase 3 - スタッフドロップダウン確認');
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const link = `http://localhost:5173/phase3?corp_id=${corps}&facility_id=${facilities}&year=${year}&month=${month}`;
    
    await page.goto(link);
    await new Promise(r => setTimeout(r, 2000));
    
    // 期限チェック
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[id="deadline-confirm"]');
      if (checkbox) checkbox.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log('✓ 期限確認完了');
    
    // ドロップダウン確認
    const dropdown = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return null;
      return Array.from(select.options).map(opt => opt.textContent.trim());
    });
    
    if (!dropdown) {
      console.log('❌ スタッフドロップダウンが見つかりません');
      await browser.close();
      return;
    }
    
    console.log(`✓ ドロップダウン内容 (${dropdown.length}個):`);
    dropdown.forEach((opt, i) => {
      console.log(`  [${i}] ${opt}`);
    });
    
    const testsan_visible = dropdown.some(opt => opt.includes('テストさん'));
    console.log(`\n【最終結果】`);
    if (testsan_visible) {
      console.log('✓ ✓ ✓ テストさんが Phase 3 に表示されています！');
    } else {
      console.log('❌ テストさんが Phase 3 に表示されていません');
      console.log('\nlocalStorageにはテストさんが保存されているのに、');
      console.log('Phase 3では表示されていません。');
      console.log('これはバグです。');
    }
    
  } catch (error) {
    console.error('\nエラー:', error.message);
  } finally {
    await browser.close();
  }
})();
