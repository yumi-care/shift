---
name: テスト環境セットアップ
description: 開発・テスト環境の初期化、データ永続化、起動手順
type: specification
---

# テスト環境セットアップガイド

## 目的

バックエンド再起動後も **データが保持される** テスト環境を構築する。

---

## 現在の問題

| 項目 | 現状 | 問題 |
|------|------|------|
| バックエンド DB | インメモリ | 再起動で消滅 |
| フロント | localStorage → 削除済み | API ベースに統一 |
| テストデータ | なし | 毎回手入力必須 |

---

## 解決策

### **A. JSON ファイルベース DB（推奨・短期）**

**概要：** インメモリ DB にバックアップ・復元機能を追加

**実装手順：**

1. **`/backend/data/db.json` を作成**
```json
{
  "corporations": [
    { "corp_id": 1, "corp_name": "ゆうみ株式会社" }
  ],
  "facilities": {
    "1": [
      { "facility_id": 1, "corp_id": 1, "facility_name": "ゆうみのいえ" }
    ]
  },
  "locations": {
    "1": [
      { "location_id": 1, "facility_id": 1, "location_name": "三本木" },
      { "location_id": 2, "facility_id": 1, "location_name": "江島" },
      { "location_id": 3, "facility_id": 1, "location_name": "牛川" }
    ]
  },
  "staffs": {
    "1": [
      {
        "staff_id": 1,
        "facility_id": 1,
        "corp_id": 1,
        "staff_name": "田中太郎",
        "positions": [
          { "position": "管理者", "work_hours_start": "09:00", "work_hours_end": "18:00" }
        ],
        "work_days": "月火水木金",
        "break_start": "12:00",
        "break_end": "13:00"
      },
      {
        "staff_id": 2,
        "facility_id": 1,
        "corp_id": 1,
        "staff_name": "佐藤花子",
        "positions": [
          { "position": "介護職", "work_hours_start": "09:00", "work_hours_end": "18:00" }
        ],
        "work_days": "",
        "break_start": "12:00",
        "break_end": "13:00"
      }
    ]
  },
  "submissions": {
    "1": []
  }
}
```

2. **`/backend/server.js` を修正**

```javascript
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// DB を読み込み
function loadDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.warn('DB ファイルが見つかりません。デフォルト DB を使用します。');
    return getDefaultDB(); // デフォルト DB を返す
  }
}

// DB を保存
function saveDB(database) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');
}

// サーバー起動時
let db = loadDB();

// すべての データ更新後に saveDB(db) を呼び出し
app.post('/api/phase1/corporations/', (req, res) => {
  const { corp_name } = req.body;
  // ... (既存コード)
  
  saveDB(db); // DB を保存
  res.status(201).json(corp);
});
```

**利点：**
- ✅ 簡単（ファイル I/O だけ）
- ✅ 再起動後もデータ保持
- ✅ git で管理可能（初期テストデータ）

---

### **B. Supabase 連携（推奨・長期）**

**概要：** PostgreSQL ベースの Supabase を使用（本番環境と同じ）

**実装手順：** Phase 4 完成後に実施

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Phase 1 API の例
app.get('/api/phase1/corporations/', async (req, res) => {
  const { data, error } = await supabase
    .from('corporations')
    .select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});
```

**利点：**
- ✅ 本番環境と同じ
- ✅ バックアップ自動
- ✅ マルチテナント対応が簡単
- ✅ 権限管理（RLS）が可能

**タイミング：** Phase 4 シフト表作成機能が動作確認後

---

## テスト環境の起動手順

### **ステップ 1：依存関係インストール**

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

### **ステップ 2：テストデータの初期化**

```bash
# Option A: JSON ファイルから復元
node scripts/restore-db.js

# Option B: デフォルト DB をリセット
node scripts/reset-db.js
```

### **ステップ 3：バックエンド起動**

```bash
cd backend
node server.js
```

**出力例：**
```
========== バックエンドサーバー起動 ==========
✓ API Server running on http://localhost:8000
✓ Database loaded from /backend/data/db.json
✓ Test data initialized
```

### **ステップ 4：フロントエンド起動（新しいターミナル）**

```bash
cd frontend
npm run dev
```

**出力例：**
```
  VITE v5.4.21  ready in 106 ms

  ➜  Local:   http://localhost:5173/
```

### **ステップ 5：ブラウザで確認**

```
http://localhost:5173 → Dashboard
```

---

## テストフロー

### **テストシナリオ 1：フル フロー（Phase 1 → Phase 3 → Dashboard）**

**前提条件：** テストデータが初期化されている

**手順：**

1. **ダッシュボード確認**
   - ✓ 初期テストデータ（法人・事業所・拠点）が表示されるか

2. **Phase 2：スタッフ確認**
   - ✓ 初期テストスタッフが表示されるか
   - ✓ 勤務曜日ありのスタッフ：田中太郎
   - ✓ 勤務曜日なしのスタッフ：佐藤花子

3. **Phase 3：シフト申告**
   - ✓ 管理者がリンクを生成できるか
   - ✓ スタッフがリンクをクリックして申告できるか
   - ✓ 固定勤務は自動申告されているか
   - ✓ シフト申告制は手入力できるか

4. **Dashboard：申告確認・編集**
   - ✓ 申告済みスタッフが表示されるか
   - ✓ 「詳細」で申告内容が表示されるか
   - ✓ **削除ボタンが動作するか**
   - ✓ **編集ボタンが動作するか（手動申告のみ）**

5. **バックエンド再起動後**
   - ✓ データが消えていないか（JSON ファイル保存を確認）

---

## 初期テストデータ

### **企業情報**
- **法人名：** ゆうみ株式会社（corp_id = 1）
- **事業所：** ゆうみのいえ（facility_id = 1）
- **拠点：** 三本木、江島、牛川（location_id = 1, 2, 3）

### **スタッフ情報**
- **スタッフ 1：** 田中太郎（固定勤務 = 月火水木金）
- **スタッフ 2：** 佐藤花子（シフト申告制 = 勤務曜日なし）

### **申告データ（初期）**
- なし（テスト時に追加）

---

## トラブルシューティング

### **Q: バックエンド起動後、データが消えている**

**原因：** JSON ファイルが保存されていない

**対応：**
```bash
# DB を初期化
node backend/scripts/reset-db.js

# サーバーを再起動
node backend/server.js
```

### **Q: フロントエンドで「サーバーに接続できない」エラー**

**原因：** バックエンド（localhost:8000）が起動していない

**対応：**
```bash
# バックエンドが起動しているか確認
lsof -i :8000

# 起動していなければ開始
cd backend && node server.js
```

### **Q: Phase 3 のリンクが生成されない**

**原因：** 法人・事業所が登録されていない

**対応：**
1. Phase 1 で法人・事業所を登録
2. または初期テストデータを読み込む

---

## 環境変数（本番向け）

`.env.local` を作成：

```env
# フロントエンド
VITE_API_BASE_URL=http://localhost:8000/api

# バックエンド
NODE_ENV=development
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

