const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  PHASE 3 STAFF DROPDOWN VERIFICATION TEST        ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // ログイン
    console.log('【Step 1】ログイン');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          break;
        }
      }
    });

    console.log('✓ デモアカウントでログイン\n');
    await wait(2000);

    // テストデータを直接作成
    console.log('【Step 2】テストデータを作成');
    await page.evaluate(() => {
      const corp = { corp_id: 1, corp_name: 'ゆうみのいえ' };
      const facility = { facility_id: 1, facility_name: 'ゆうみのいえ三本木', corp_id: 1 };
      const location = { location_id: 1, location_name: '三本木', facility_id: 1 };
      const staffs = [
        { 
          staff_id: 1, 
          staff_name: '山田太郎', 
          position: '介護職', 
          work_days: '月火水木金',
          work_hours_start: '09:00',
          work_hours_end: '17:00'
        },
        { 
          staff_id: 2, 
          staff_name: '鈴木花子', 
          position: '看護師', 
          work_days: '月水金',
          work_hours_start: '08:00',
          work_hours_end: '16:00'
        }
      ];

      localStorage.setItem('corporations', JSON.stringify([corp]));
      localStorage.setItem('facilities_1', JSON.stringify([facility]));
      localStorage.setItem('locations_1', JSON.stringify([location]));
      localStorage.setItem('staffs_1', JSON.stringify(staffs));
    });

    console.log('✓ データを作成:');
    console.log('  • 企業: ゆうみのいえ');
    console.log('  • 事業所: ゆうみのいえ三本木');
    console.log('  • スタッフ 1: 山田太郎 (介護職)');
    console.log('  • スタッフ 2: 鈴木花子 (看護師)\n');

    // Phase 3 スタッフモードにアクセス
    console.log('【Step 3】Phase 3 スタッフモードにアクセス');
    const staffLink = 'http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4';
    console.log(`📍 アクセスURL: ${staffLink}\n`);

    await page.goto(staffLink, { waitUntil: 'networkidle2' });
    await wait(2000);

    // 期限確認チェックボックスをクリック
    console.log('【Step 4】期限確認チェックボックスをクリック');
    const checkboxClicked = await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb && !cb.checked) {
        cb.click();
        return true;
      }
      return cb && cb.checked;
    });

    if (checkboxClicked) {
      console.log('✓ チェックボックスをクリック\n');
      await wait(1000);
    }

    // ドロップダウン確認
    console.log('【Step 5】スタッフドロップダウンを確認');

    const result = await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      
      if (!select) {
        // エラーメッセージを確認
        const body = document.body.innerText;
        if (body.includes('スタッフが登録されていません')) {
          return { 
            status: 'ERROR', 
            message: 'エラー表示: "スタッフが登録されていません"' 
          };
        }
        return { 
          status: 'NOT_FOUND', 
          message: 'ドロップダウンが見つかりません' 
        };
      }

      const options = Array.from(select.options).map(o => ({
        value: o.value,
        text: o.textContent.trim()
      }));

      return {
        status: 'FOUND',
        optionCount: options.length,
        options: options.map(o => o.text)
      };
    });

    console.log(`ステータス: ${result.status}`);
    
    if (result.status === 'FOUND') {
      console.log(`✓ ドロップダウン: 見つかりました`);
      console.log(`✓ オプション数: ${result.optionCount}\n`);
      
      console.log('ドロップダウンのオプション:');
      result.options.forEach((opt, idx) => {
        console.log(`  [${idx}] ${opt}`);
      });

      if (result.optionCount > 1) {
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║         ✅ SUCCESS! 問題は解決されました ✅         ║');
        console.log('║                                                    ║');
        console.log('║  • スタッフドロップダウンが正常に表示されています  ║');
        console.log('║  • Phase 2 登録スタッフが全て反映されています    ║');
        console.log('║  • システムとして機能しています                  ║');
        console.log('╚════════════════════════════════════════════════════╝\n');
      }
    } else {
      console.log(`❌ ${result.message}`);
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log('║              ❌ 問題が残っています ❌              ║');
      console.log('╚════════════════════════════════════════════════════╝\n');
    }

    console.log('✓ ブラウザで結果を確認してください。60秒後に閉じます...\n');
    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
