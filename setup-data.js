// ブラウザのコンソールで実行するデータセットアップスクリプト

console.log('=== テストデータセットアップ ===\n');

const testData = {
  corp: {
    corp_id: 1,
    corp_name: 'ゆうみ株式会社'
  },
  facility: {
    facility_id: 1,
    facility_name: 'ゆうみのいえ',
    corp_id: 1,
    department: '介護',
    service_type: '障害福祉',
    capacity: 50
  },
  location: {
    location_id: 1,
    location_name: '三本木',
    facility_id: 1,
    address: '青森県三戸郡三本木',
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    staff_capacity: 10
  },
  staffs: [
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
  ]
};

// LocalStorage に保存
localStorage.setItem('corporations', JSON.stringify([testData.corp]));
localStorage.setItem('facilities_1', JSON.stringify([testData.facility]));
localStorage.setItem('locations_1', JSON.stringify([testData.location]));
localStorage.setItem('staffs_1', JSON.stringify(testData.staffs));

console.log('✓ 法人：', testData.corp.corp_name);
console.log('✓ 事業所：', testData.facility.facility_name);
console.log('✓ 拠点：', testData.location.location_name);
console.log('✓ スタッフ：', testData.staffs.length + '名');
console.log('\n✅ セットアップ完了！');
console.log('\n次のURLにアクセスしてください:');
console.log('http://localhost:5173/phase3?corp_id=1&facility_id=1&year=2026&month=4');

