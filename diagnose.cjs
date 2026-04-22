const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== 自動診断開始 ===\n');

    // ログイン
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await wait(2000);

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモ')) {
          btn.click();
          break;
        }
      }
    });

    await wait(3000);
    console.log('✓ ログイン完了\n');

    // Phase 2 へ
    console.log('【Phase 2 スタッフ登録】');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await wait(2000);

    // 現在の画面内容を確認
    const phase2Content = await page.evaluate(() => {
      return {
        title: document.querySelector('h2')?.textContent || 'なし',
        pageText: document.body.innerText.substring(0, 500),
        inputFields: Array.from(document.querySelectorAll('input[type="text"]')).length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 30)
      };
    });

    console.log('ページ:', phase2Content.title);
    console.log('入力フィールド数:', phase2Content.inputFields);
    console.log('ボタン:', phase2Content.buttons.slice(0, 10));
    console.log('');

    // ユーザーが手動で操作するまで待機
    console.log('📍 Phase 2 でスタッフを登録してください');
    console.log('   企業・事業所・拠点・スタッフを登録後、ターミナルに戻ってください\n');
    console.log('   30秒間自動で待機します...\n');

    await wait(30000);

    // 登録後のデータ確認
    console.log('【登録データ確認】\n');

    const storageData = await page.evaluate(() => {
      const allKeys = Object.keys(localStorage);
      return {
        corporations: localStorage.getItem('corporations'),
        facilities: allKeys.filter(k => k.startsWith('facilities_')).map(k => ({ key: k, value: localStorage.getItem(k) })),
        staffs: allKeys.filter(k => k.startsWith('staffs_')).map(k => ({ key: k, value: localStorage.getItem(k) })),
        locations: allKeys.filter(k => k.startsWith('locations_')).map(k => ({ key: k, value: localStorage.getItem(k) }))
      };
    });

    console.log('corporations:', storageData.corporations ? '✓' : '✗');
    if (storageData.corporations) {
      const corps = JSON.parse(storageData.corporations);
      console.log(`  ID: ${corps[0]?.corp_id}, 名前: ${corps[0]?.corp_name}\n`);
    }

    console.log('facilities:');
    storageData.facilities.forEach(f => {
      const data = JSON.parse(f.value);
      console.log(`  ${f.key}: ${data[0]?.facility_name} (ID: ${data[0]?.facility_id})`);
    });
    console.log('');

    console.log('staffs:');
    storageData.staffs.forEach(s => {
      const data = JSON.parse(s.value);
      console.log(`  ${s.key}:`);
      data.forEach(staff => {
        console.log(`    • ${staff.staff_name} (ID: ${staff.staff_id})`);
      });
    });
    console.log('');

    // Phase 3 へ
    if (storageData.corporations && storageData.staffs.length > 0) {
      const corps = JSON.parse(storageData.corporations);
      const corpId = corps[0].corp_id;
      const staffKey = storageData.staffs[0].key;
      const facilityId = staffKey.replace('staffs_', '');

      console.log('【Phase 3 テスト】\n');
      const phase3Link = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=${facilityId}&year=2026&month=4`;
      console.log(`リンク: ${phase3Link}\n`);

      await page.goto(phase3Link, { waitUntil: 'networkidle2' });
      await wait(2000);

      // 期限確認
      await page.evaluate(() => {
        const cb = document.querySelector('#deadline-confirm');
        if (cb) cb.click();
      });
      await wait(1000);

      // スタッフドロップダウンを確認
      const dropdownInfo = await page.evaluate(() => {
        const select = document.querySelector('#staff-select');
        if (!select) {
          return {
            found: false,
            errorMsg: document.body.innerText.includes('スタッフが登録') ? 'エラー表示あり' : 'ドロップダウンなし'
          };
        }

        const options = Array.from(select.options).map(o => o.textContent.trim());
        return {
          found: true,
          optionCount: options.length,
          options: options
        };
      });

      console.log('ドロップダウン状態:');
      if (dropdownInfo.found) {
        console.log(`  ✓ 見つかった (${dropdownInfo.optionCount}個のオプション)`);
        dropdownInfo.options.forEach(opt => {
          console.log(`    • ${opt}`);
        });

        if (dropdownInfo.optionCount > 1) {
          console.log('\n✅ スタッフが表示されています！');
        } else {
          console.log('\n❌ スタッフが表示されていません');
          console.log('\n【問題の原因】');
          console.log('  staff_id が localStorage キーと一致していない可能性があります');
        }
      } else {
        console.log(`  ✗ ${dropdownInfo.errorMsg}`);
      }
    } else {
      console.log('❌ スタッフデータが保存されていません');
    }

    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
