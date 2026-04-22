const puppeteer = require('puppeteer');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║      フル機能テスト - 全フロー確認               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Step 1: ログイン
    console.log('【Step 1】ログイン');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await wait(2000);

    const loginClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('デモでログイン')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (loginClicked) {
      console.log('✓ デモログイン\n');
      await wait(3000);
    } else {
      console.log('✗ ログインボタン見つからず\n');
    }

    // Step 2: Phase 2 でスタッフを登録
    console.log('【Step 2】Phase 2 でスタッフ登録');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await wait(2000);

    // 企業を作成
    console.log('  • 企業を作成');
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');
      if (inputs[0]) {
        inputs[0].value = 'テスト企業';
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(500);

    // 企業作成ボタンを探してクリック
    const corpCreated = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('追加') || btn.textContent.includes('作成')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    await wait(2000);

    // 事業所を作成
    console.log('  • 事業所を作成');
    const facilityCreated = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('拠点追加') || btn.textContent.includes('事業所') && btn.textContent.includes('追加')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    await wait(2000);

    // スタッフを登録
    console.log('  • スタッフを登録');
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length >= 2) {
        inputs[1].value = 'テストさん';
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(500);

    // 勤務曜日を選択
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(500);

    // スタッフ保存ボタン
    const staffCreated = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('スタッフ') && (btn.textContent.includes('追加') || btn.textContent.includes('登録'))) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    await wait(2000);
    console.log('✓ Phase 2 完了\n');

    // Step 3: 登録情報を確認
    console.log('【Step 3】登録情報確認');
    const regData = await page.evaluate(() => {
      return {
        corps: localStorage.getItem('corporations'),
        staffs: Object.keys(localStorage).filter(k => k.startsWith('staffs_')).map(k => ({
          key: k,
          data: localStorage.getItem(k)
        }))
      };
    });

    console.log('  • corporations:', regData.corps ? '✓ 存在' : '✗ 未登録');
    regData.staffs.forEach(s => {
      console.log(`  • ${s.key}: ✓ 存在`);
    });
    console.log('');

    if (!regData.corps || regData.staffs.length === 0) {
      console.log('❌ スタッフが登録されていません\n');
      await wait(60000);
      await browser.close();
      return;
    }

    // Step 4: Phase 3 にアクセス
    console.log('【Step 4】Phase 3 アクセス');
    const corps = JSON.parse(regData.corps);
    const staffKey = regData.staffs[0].key;
    const facilityId = staffKey.replace('staffs_', '');
    const corpId = corps[0].corp_id;

    const phase3Link = `http://localhost:5173/phase3?corp_id=${corpId}&facility_id=${facilityId}&year=2026&month=4`;
    console.log(`  URL: ${phase3Link}\n`);

    await page.goto(phase3Link, { waitUntil: 'networkidle2' });
    await wait(2000);

    // Step 5: 期限確認 + スタッフ選択
    console.log('【Step 5】スタッフ選択');
    await page.evaluate(() => {
      const cb = document.querySelector('#deadline-confirm');
      if (cb) cb.click();
    });
    await wait(1000);

    const staffFound = await page.evaluate(() => {
      const select = document.querySelector('#staff-select');
      return select ? Array.from(select.options).length : 0;
    });

    if (staffFound > 1) {
      console.log(`✓ スタッフドロップダウン: ${staffFound}個のオプション\n`);

      // スタッフを選択
      await page.evaluate(() => {
        const select = document.querySelector('#staff-select');
        if (select) {
          select.value = select.options[1].value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await wait(1000);

      // Step 6: 日付選択
      console.log('【Step 6】日付選択');
      const dateSelected = await page.evaluate(() => {
        const days = document.querySelectorAll('.calendar-day.active');
        if (days.length > 0) {
          days[0].click();
          return true;
        }
        return false;
      });

      if (dateSelected) {
        console.log('✓ 日付選択\n');
        await wait(1000);

        // Step 7: 拠点選択
        console.log('【Step 7】拠点選択');
        const locationSelected = await page.evaluate(() => {
          const selects = document.querySelectorAll('select[class="form-input location-select"]');
          if (selects.length > 0) {
            selects[0].value = selects[0].options[1]?.value || '1';
            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        });

        if (locationSelected) {
          console.log('✓ 拠点選択\n');
          await wait(500);

          // Step 8: 申告送信
          console.log('【Step 8】申告送信');
          const confirmClicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('確認画面へ')) {
                btn.click();
                return true;
              }
            }
            return false;
          });

          if (confirmClicked) {
            await wait(2000);

            const sendClicked = await page.evaluate(() => {
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                if (btn.textContent.includes('送信')) {
                  btn.click();
                  return true;
                }
              }
              return false;
            });

            if (sendClicked) {
              await wait(2000);

              const completed = await page.evaluate(() => {
                return document.body.innerText.includes('申告完了');
              });

              if (completed) {
                console.log('✓ 申告完了\n');

                console.log('╔════════════════════════════════════════════════════╗');
                console.log('║       ✅ SUCCESS! 全フロー完全動作確認済み ✅     ║');
                console.log('║                                                    ║');
                console.log('║  ✓ ログイン                                       ║');
                console.log('║  ✓ Phase 2 スタッフ登録                           ║');
                console.log('║  ✓ Phase 3 スタッフ取得                           ║');
                console.log('║  ✓ 日付選択                                       ║');
                console.log('║  ✓ 拠点選択                                       ║');
                console.log('║  ✓ 申告送信 完了                                  ║');
                console.log('╚════════════════════════════════════════════════════╝\n');
              } else {
                console.log('❌ 申告完了画面が表示されていません\n');
              }
            } else {
              console.log('❌ 送信ボタンが見つかりません\n');
            }
          } else {
            console.log('❌ 確認画面へボタンが見つかりません\n');
          }
        } else {
          console.log('❌ 拠点選択できていません\n');
        }
      } else {
        console.log('❌ 日付選択できていません\n');
      }
    } else {
      console.log(`❌ スタッフドロップダウンが空です (${staffFound}個)\n`);
    }

    await wait(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
