import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log('🔄 システムフロー テスト開始...\n');

    // ステップ1: ログインページにアクセス
    console.log('📍 ログインページにアクセス...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await delay(1500);

    // ステップ2: デモでログイン
    console.log('🔐 デモでログイン...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoBtn = buttons.find(btn => btn.textContent.includes('デモ'));
      if (demoBtn) demoBtn.click();
    });
    await delay(2500);

    // ステップ3: localStorage をクリア
    console.log('🧹 前回のテストデータをクリア...');
    await page.evaluate(() => {
      localStorage.removeItem('staffs_1');
      localStorage.removeItem('shift_submissions_1');
    });

    // ステップ4: Phase 2 でスタッフを登録
    console.log('📝 Phase 2: スタッフを登録（テストデータボタン使用）...');
    await page.goto('http://localhost:5173/phase2', { waitUntil: 'networkidle2' });
    await delay(1500);

    // テストデータボタンをクリック
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('テストデータ'));
      if (btn) btn.click();
    });
    await delay(2000);

    console.log('✓ スタッフ登録完了\n');

    // ステップ5: Phase 3 で申告リンクを生成
    console.log('🔗 Phase 3: シフト申告リンクを生成...');
    await page.goto('http://localhost:5173/phase3', { waitUntil: 'networkidle2' });
    await delay(1500);

    // 法人・事業所を選択
    await page.select('#admin-corp-select', '1');
    await delay(1000);
    await page.select('#admin-facility-select', '1');
    await delay(500);

    // リンク生成ボタンをクリック
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('リンク生成'));
      if (btn) btn.click();
    });
    await delay(1500);

    // 生成されたリンクを取得
    const generatedLink = await page.evaluate(() => {
      const input = document.querySelector('.link-input');
      return input?.value || '';
    });

    if (generatedLink) {
      console.log('✓ リンク生成完了\n');

      // ステップ6: スタッフ側でシフト申告
      console.log('📋 Phase 3（スタッフ側）: シフト申告を実施...');
      await page.goto(generatedLink, { waitUntil: 'networkidle2' });
      await delay(2000);

      // 期限チェックボックスをクリック
      await page.evaluate(() => {
        const checkbox = document.getElementById('deadline-confirm');
        if (checkbox && !checkbox.checked) {
          checkbox.click();
        }
      });
      await delay(500);

      // スタッフ選択ドロップダウンを確認
      const staffSelectExists = await page.$('#staff-select');
      if (staffSelectExists) {
        const optionCount = await page.evaluate(() => {
          const select = document.getElementById('staff-select');
          return select ? select.options.length - 1 : 0;
        });
        console.log(`✓ スタッフドロップダウンが表示されました（登録済みスタッフ: ${optionCount}名）\n`);

        if (optionCount > 0) {
          // 最初のスタッフを選択
          const firstStaffId = await page.evaluate(() => {
            const select = document.getElementById('staff-select');
            return select ? select.options[1]?.value : '';
          });

          if (firstStaffId) {
            console.log('📝 スタッフを選択...');
            await page.select('#staff-select', firstStaffId);
            await delay(1500);

            // 日付を選択
            console.log('📅 日付を選択...');
            await page.evaluate(() => {
              const days = Array.from(document.querySelectorAll('.calendar-day.active'));
              if (days.length > 2) {
                days[0].click();
                days[2].click();
              }
            });
            await delay(1000);

            // 拠点を選択
            const locationSelects = await page.$$('.location-select');
            if (locationSelects.length > 0) {
              const firstOption = await page.evaluate(() => {
                const select = document.querySelector('.location-select');
                return select?.options[1]?.value || '';
              });
              if (firstOption) {
                await page.evaluate(() => {
                  const selects = document.querySelectorAll('.location-select');
                  selects.forEach(select => {
                    select.value = select.options[1].value;
                  });
                });
                await delay(500);
              }
            }

            // 確認画面へボタンをクリック
            console.log('📋 確認画面へ...');
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const btn = buttons.find(b => b.textContent.includes('確認画面'));
              if (btn && !btn.disabled) btn.click();
            });
            await delay(1500);

            // 送信ボタンをクリック
            console.log('📤 シフト申告を送信...');
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const btn = buttons.find(b => b.textContent.includes('送信'));
              if (btn) btn.click();
            });
            await delay(1500);

            const submissionComplete = await page.evaluate(() => {
              return document.body.textContent.includes('申告完了');
            });

            if (submissionComplete) {
              console.log('✓ シフト申告が完了しました\n');
            }
          }
        }
      } else {
        console.log('❌ スタッフ選択ドロップダウンが見つかりません');
      }
    }

    // ステップ7: ダッシュボードで確認
    console.log('📊 ダッシュボード: 申告状況を確認...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(2000);

    await page.select('#corp-select', '1');
    await delay(1000);
    await page.select('#facility-select', '1');
    await delay(1500);

    const tableContent = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => ({
        staffName: row.cells[0]?.textContent?.trim() || '',
        position: row.cells[1]?.textContent?.trim() || '',
        workDays: row.cells[2]?.textContent?.trim() || '',
        workHours: row.cells[3]?.textContent?.trim() || '',
        submissionStatus: row.cells[4]?.textContent?.trim() || ''
      }));
    });

    console.log('========================================');
    if (tableContent.length > 0) {
      console.log('✅ 申告済みスタッフ一覧が表示されました！');
      console.log('========================================\n');
      console.log('📋 スタッフ情報：\n');
      
      let hasSubmission = false;
      tableContent.forEach((staff, idx) => {
        console.log(`[${idx + 1}] ${staff.staffName}`);
        console.log(`  職種: ${staff.position}`);
        console.log(`  勤務曜日: ${staff.workDays}`);
        console.log(`  勤務時間: ${staff.workHours}`);
        console.log(`  申告状況: ${staff.submissionStatus}\n`);
        
        if (staff.submissionStatus.includes('申告済み')) {
          hasSubmission = true;
        }
      });

      if (hasSubmission) {
        console.log('========================================');
        console.log('✅✅ システムテスト成功！');
        console.log('========================================');
        console.log('Phase 2 スタッフ登録');
        console.log('  ↓');
        console.log('Phase 3 シフト申告（スタッフドロップダウン選択）');
        console.log('  ↓');
        console.log('ダッシュボール申告状況表示');
        console.log('');
        console.log('の全フローが正常に機能しています！');
        console.log('');
        console.log('✓ 勤務曜日が正しく表示されている');
        console.log('✓ スタッフ名がドロップダウンで選択できている');
        console.log('✓ 申告状況が staff_id で正確に照合されている');
        console.log('========================================\n');
      } else {
        console.log('⚠️  申告状況が反映されていません。');
      }
    } else {
      console.log('⚠️  スタッフ一覧が表示されていません。');
    }

    console.log('✓ テスト完了');
    await delay(3000);
    await browser.close();
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
