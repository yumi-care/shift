const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   PHASE 3 STAFF DROPDOWN - REAL TEST     ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    // ステップ 1: ダッシュボードを開いてログイン
    console.log('【ステップ 1】ログイン');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      console.log('✓ デモアカウントでログイン');
      await wait(2000);
    }

    // ステップ 2: テストデータを登録（ブラウザ内で操作可能な状態にする）
    console.log('\n【ステップ 2】Phase 2 でスタッフを登録');
    console.log('📍 ブラウザで以下を実行してください：');
    console.log('  1. Phase 2 に移動');
    console.log('  2. 法人を作成（「ゆうみのいえ」など）');
    console.log('  3. 事業所を作成（「三本木」など）');
    console.log('  4. スタッフを1人登録（名前、職種、勤務曜日を入力）');
    console.log('\n⏰ 操作を完了したら、コンソールに戻してください。');
    console.log('30秒待ちます...\n');

    await wait(30000);

    // ステップ 3: Phase 3 にアクセス
    console.log('\n【ステップ 3】Phase 3 でスタッフ申告リンクを確認');
    console.log('📍 Phase 3 に移動します\n');

    await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2' });
    await wait(2000);

    // ステップ 4: 登録されたデータを確認
    const corpData = await page.evaluate(() => {
      return {
        corporations: localStorage.getItem('corporations'),
        staffs_1: localStorage.getItem('staffs_1')
      };
    });

    let corpId = null, facilityId = null, staffCount = 0;

    if (corpData.corporations) {
      const corps = JSON.parse(corpData.corporations);
      corpId = corps[0]?.corp_id;
      console.log(`✓ 企業が登録されました (id: ${corpId})`);
    }

    if (corpData.staffs_1) {
      const staffs = JSON.parse(corpData.staffs_1);
      staffCount = staffs.length;
      console.log(`✓ スタッフが登録されました (${staffCount}名)`);
      staffs.forEach(s => {
        console.log(`  • ${s.staff_name} (${s.position})`);
      });
    }

    if (!corpId || staffCount === 0) {
      console.log('\n⚠️ データが登録されていません。Phase 2 で登録を完了してください。');
      await wait(10000);
      await browser.close();
      return;
    }

    // ステップ 5: Phase 3 スタッフモードリンクにアクセス
    console.log('\n【ステップ 4】Phase 3 スタッフモードをテスト');
    const staffLink = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=1&year=2026&month=4`;
    console.log(`📍 スタッフモードリンクにアクセス:\n   ${staffLink}\n`);

    await page.goto(staffLink, { waitUntil: 'networkidle2' });
    await wait(2000);

    // ステップ 6: ドロップダウンを確認
    console.log('【ステップ 5】スタッフドロップダウンを確認');
    
    // まず、期限確認チェックボックスをクリック
    const checkboxClicked = await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb) {
        cb.click();
        return true;
      }
      return false;
    });

    if (checkboxClicked) {
      console.log('✓ 期限確認チェックボックスをクリック');
      await wait(1000);
    }

    // ドロップダウンを確認
    const dropdownInfo = await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      if (!select) {
        return {
          exists: false,
          options: [],
          errorMessage: document.body.innerText.includes('スタッフが登録されていません') ? 'error' : 'not_found'
        };
      }

      const options = Array.from(select.options).map(o => ({
        value: o.value,
        text: o.textContent.trim()
      }));

      return {
        exists: true,
        options: options,
        errorMessage: null
      };
    });

    console.log(`\n✓ ドロップダウン存在: ${dropdownInfo.exists ? 'YES' : 'NO'}`);
    
    if (dropdownInfo.exists) {
      console.log(`✓ オプション数: ${dropdownInfo.options.length}`);
      dropdownInfo.options.forEach((opt, idx) => {
        console.log(`  [${idx}] ${opt.text}`);
      });

      if (dropdownInfo.options.length > 1) {
        console.log('\n✅ SUCCESS! スタッフドロップダウンが表示されました！');
      } else {
        console.log('\n❌ ドロップダウンが空です');
      }
    } else {
      if (dropdownInfo.errorMessage === 'error') {
        console.log('❌ エラー: "スタッフが登録されていません"');
      } else {
        console.log('❌ ドロップダウンが見つかりません');
      }
    }

    console.log('\n✓ テスト完了。ブラウザを確認して、スタッフドロップダウンが表示されているか確認してください。\n');
    await wait(20000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
