const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== 実際の動作確認 ===\n');

    // Phase 1 - ダッシュボードで登録データを確認
    console.log('【ステップ 1】Phase 1 ダッシュボードを確認');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await wait(3000);

    const dashboardData = await page.evaluate(() => {
      const corps = localStorage.getItem('corporations');
      const page = document.body.innerText;
      
      return {
        localStorage_corps: corps ? JSON.parse(corps) : null,
        pageText: page.substring(0, 800)
      };
    });

    console.log('localStorage corporations:', dashboardData.localStorage_corps);
    console.log('\nダッシュボード画面:');
    console.log(dashboardData.pageText);

    // 登録されている事業所を確認
    const corpData = dashboardData.localStorage_corps;
    if (!corpData || corpData.length === 0) {
      console.log('\n❌ データがありません。Phase 2 で登録してください。');
      await wait(30000);
      await browser.close();
      return;
    }

    const corpId = corpData[0].corp_id;
    console.log(`\n【ステップ 2】企業 ID: ${corpId} の事業所を確認`);

    // 事業所を確認
    const facilitiesKey = `facilities_${corpId}`;
    const facilitiesData = await page.evaluate((key) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }, facilitiesKey);

    console.log('登録済み事業所:', facilitiesData);

    if (!facilitiesData || facilitiesData.length === 0) {
      console.log('❌ 事業所がありません');
      await wait(30000);
      await browser.close();
      return;
    }

    const facilityId = facilitiesData[0].facility_id;
    const facilityName = facilitiesData[0].facility_name;

    // スタッフを確認
    const staffKey = `staffs_${facilityId}`;
    const staffData = await page.evaluate((key) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }, staffKey);

    console.log(`\n【ステップ 3】事業所「${facilityName}」 (ID: ${facilityId}) のスタッフ:`);
    if (staffData && staffData.length > 0) {
      staffData.forEach(s => {
        console.log(`  • ${s.staff_name} (ID: ${s.staff_id}, 職種: ${s.position})`);
      });
    } else {
      console.log('  ⚠️ スタッフが登録されていません');
    }

    // Phase 3 にアクセス
    console.log(`\n【ステップ 4】Phase 3 にアクセス`);
    const phase3Link = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=${facilityId}&year=2026&month=4`;
    console.log(`URL: ${phase3Link}\n`);

    await page.goto(phase3Link, { waitUntil: 'networkidle2' });
    await wait(2000);

    // 期限確認後の表示を確認
    console.log('【ステップ 5】期限確認チェック');
    await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb && !cb.checked) cb.click();
    });
    await wait(1000);

    // スタッフドロップダウンを確認
    const staffDropdown = await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      if (!select) {
        return {
          found: false,
          error: document.body.innerText.includes('スタッフが登録されていません') ? 'エラー表示' : '見つからない'
        };
      }

      const options = Array.from(select.options).map(o => ({
        value: o.value,
        text: o.textContent.trim()
      }));

      return {
        found: true,
        options: options
      };
    });

    console.log(`ドロップダウン found: ${staffDropdown.found}`);
    
    if (staffDropdown.found) {
      console.log('オプション:');
      staffDropdown.options.forEach(opt => {
        console.log(`  • ${opt.text}`);
      });

      // スタッフを選択
      if (staffDropdown.options.length > 1) {
        console.log(`\n【ステップ 6】スタッフを選択`);
        await page.select('#staff-select', staffDropdown.options[1].value);
        await wait(1000);

        // カレンダーが表示されたか確認
        const calendarShows = await page.evaluate(() => {
          return document.querySelector('.calendar-section') !== null;
        });

        if (calendarShows) {
          console.log('✅ カレンダー表示された');
          console.log('\n✅✅✅ 申告フロー完全動作確認 ✅✅✅');
        } else {
          console.log('❌ カレンダーが表示されない');
        }
      }
    } else {
      console.log(`❌ ${staffDropdown.error}`);
    }

    console.log('\n30秒後に閉じます...\n');
    await wait(30000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
