# API 仕様書（マルチテナント SaaS）

## 全体構成

### ベースURL
```
テスト環境: http://localhost:8000/api
本番環境: https://api.shift.supabase.co/api
```

### 認証
- **方式**: JWT（Bearer Token）
- **ヘッダー**: `Authorization: Bearer {token}`
- **トークン取得**: `/auth/login` エンドポイント

### マルチテナント対応
- **識別方法**: リクエストの `corp_id` パラメータ + JWT内の `corp_id`
- **ルール**: JWT内の `corp_id` とリクエストの `corp_id` が一致すること
- **データ分離**: すべてのテーブルに `corp_id` カラムを含める

---

## Phase 1 API：法人・事業所・拠点管理

### 法人（Corporation）

#### 1.1 法人一覧取得
```
GET /phase1/corporations
```
**パラメータ**: なし

**レスポンス (200)**:
```json
[
  {
    "corp_id": 1,
    "corp_name": "ゆうみ株式会社",
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
]
```

---

#### 1.2 法人作成
```
POST /phase1/corporations
Authorization: Bearer {token}
```

**リクエストボディ**:
```json
{
  "corp_name": "新規法人"
}
```

**レスポンス (201)**:
```json
{
  "corp_id": 2,
  "corp_name": "新規法人",
  "created_at": "2026-04-20T10:00:00Z",
  "updated_at": "2026-04-20T10:00:00Z"
}
```

**エラー (400)**:
```json
{
  "error": "corp_name is required"
}
```

---

#### 1.3 法人削除
```
DELETE /phase1/corporations/{corp_id}
Authorization: Bearer {token}
```

**レスポンス (200)**:
```json
{
  "message": "Corporation deleted"
}
```

**エラー (403)**:
```json
{
  "error": "Unauthorized: corp_id mismatch"
}
```

---

### 事業所（Facility）

#### 1.4 事業所一覧取得
```
GET /phase1/corporations/{corp_id}/facilities
```

**レスポンス (200)**:
```json
[
  {
    "facility_id": 1,
    "corp_id": 1,
    "facility_name": "ゆうみのいえ",
    "created_at": "2026-04-01T10:00:00Z"
  }
]
```

---

#### 1.5 事業所作成
```
POST /phase1/corporations/{corp_id}/facilities
Authorization: Bearer {token}
```

**リクエストボディ**:
```json
{
  "facility_name": "新規事業所"
}
```

**レスポンス (201)**:
```json
{
  "facility_id": 2,
  "corp_id": 1,
  "facility_name": "新規事業所",
  "created_at": "2026-04-20T10:00:00Z"
}
```

---

#### 1.6 事業所削除
```
DELETE /phase1/facilities/{facility_id}
Authorization: Bearer {token}
```

**クエリパラメータ**:
- `corp_id` (必須): マルチテナント確認用

**レスポンス (200)**:
```json
{
  "message": "Facility deleted"
}
```

---

### 拠点（Location）

#### 1.7 拠点一覧取得
```
GET /phase1/facilities/{facility_id}/locations
```

**レスポンス (200)**:
```json
[
  {
    "location_id": 1,
    "facility_id": 1,
    "location_name": "三本木",
    "address": "",
    "business_hours_start": null,
    "business_hours_end": null,
    "created_at": "2026-04-01T10:00:00Z"
  }
]
```

---

#### 1.8 拠点作成
```
POST /phase1/facilities/{facility_id}/locations
Authorization: Bearer {token}
```

**リクエストボディ**:
```json
{
  "location_name": "新拠点",
  "address": "〒xxx-xxxx",
  "business_hours_start": "09:00",
  "business_hours_end": "18:00"
}
```

**レスポンス (201)**:
```json
{
  "location_id": 4,
  "facility_id": 1,
  "location_name": "新拠点",
  "address": "〒xxx-xxxx",
  "business_hours_start": "09:00",
  "business_hours_end": "18:00",
  "created_at": "2026-04-20T10:00:00Z"
}
```

---

#### 1.9 拠点削除
```
DELETE /phase1/locations/{location_id}
Authorization: Bearer {token}
```

**レスポンス (200)**:
```json
{
  "message": "Location deleted"
}
```

---

## Phase 2 API：スタッフ管理

#### 2.1 スタッフ一覧取得
```
GET /phase2/facilities/{facility_id}/staffs
```

**レスポンス (200)**:
```json
[
  {
    "staff_id": 1,
    "facility_id": 1,
    "corp_id": 1,
    "staff_name": "田中太郎",
    "position": "サービス提供責任者",
    "work_days": "月火水木金",
    "work_hours_start": "09:00",
    "work_hours_end": "18:00",
    "created_at": "2026-04-01T10:00:00Z"
  },
  {
    "staff_id": 2,
    "facility_id": 1,
    "corp_id": 1,
    "staff_name": "佐藤花子",
    "position": "ヘルパー",
    "work_days": "",
    "work_hours_start": "",
    "work_hours_end": "",
    "created_at": "2026-04-02T10:00:00Z"
  }
]
```

---

#### 2.2 スタッフ作成
```
POST /phase2/facilities/{facility_id}/staffs
```

**リクエストボディ**:
```json
{
  "staff_name": "新規スタッフ",
  "positions": [
    {
      "position": "ケアワーカー",
      "work_hours_start": "09:00",
      "work_hours_end": "18:00"
    },
    {
      "position": "サ責",
      "work_hours_start": "18:00",
      "work_hours_end": "21:00"
    }
  ],
  "work_days": "月火水木金"
}
```

**レスポンス (201)**:
```json
{
  "staff_id": 3,
  "facility_id": 1,
  "corp_id": 1,
  "staff_name": "新規スタッフ",
  "positions": [
    {
      "position": "ケアワーカー",
      "work_hours_start": "09:00",
      "work_hours_end": "18:00"
    },
    {
      "position": "サ責",
      "work_hours_start": "18:00",
      "work_hours_end": "21:00"
    }
  ],
  "work_days": "月火水木金",
  "created_at": "2026-04-20T10:00:00Z"
}
```

---

#### 2.3 スタッフ更新
```
PUT /phase2/staffs/{staff_id}
```

**リクエストボディ**:
```json
{
  "staff_name": "更新後の名前",
  "positions": [
    {
      "position": "更新後の職種",
      "work_hours_start": "10:00",
      "work_hours_end": "17:00"
    }
  ],
  "work_days": "月水金"
}
```

**レスポンス (200)**:
```json
{
  "staff_id": 1,
  "facility_id": 1,
  "corp_id": 1,
  "staff_name": "更新後の名前",
  "positions": [
    {
      "position": "更新後の職種",
      "work_hours_start": "10:00",
      "work_hours_end": "17:00"
    }
  ],
  "work_days": "月水金",
  "updated_at": "2026-04-20T11:00:00Z"
}
```

---

#### 2.4 スタッフ削除
```
DELETE /phase2/staffs/{staff_id}
Authorization: Bearer {token}
```

**レスポンス (200)**:
```json
{
  "message": "Staff deleted"
}
```

---

## Phase 3 API：シフト申告

#### 3.1 シフト申告（固定勤務：自動生成）
```
POST /phase3/shift-submissions/auto
Authorization: Bearer {token}
```

**リクエストボディ**:
```json
{
  "staff_id": 1,
  "facility_id": 1,
  "year": 2026,
  "month": 4
}
```

**処理内容**:
- スタッフの `work_days` から申告対象月の全日付を自動生成
- 例：`work_days: "月火水木金"` → 2026年4月の月火水木金をすべて申告済みに

**レスポンス (201)**:
```json
{
  "message": "Auto-submission created",
  "submission_count": 22,
  "staff_id": 1,
  "staff_name": "田中太郎",
  "year": 2026,
  "month": 4,
  "submitted_dates": ["2026-04-01", "2026-04-02", ..., "2026-04-30"]
}
```

---

#### 3.2 シフト申告（シフト申告制：手動入力）
```
POST /phase3/shift-submissions/manual
Authorization: Bearer {token}
```

**リクエストボディ**:
```json
{
  "staff_id": 2,
  "facility_id": 1,
  "submissions": [
    {
      "date": "2026-04-05",
      "location_id": 1
    },
    {
      "date": "2026-04-10",
      "location_id": 2
    }
  ]
}
```

**レスポンス (201)**:
```json
{
  "message": "Manual submission created",
  "staff_id": 2,
  "staff_name": "佐藤花子",
  "submission_count": 2,
  "submissions": [
    {
      "submission_id": 101,
      "date": "2026-04-05",
      "location_id": 1,
      "location_name": "三本木",
      "submitted_at": "2026-04-20T10:00:00Z"
    },
    {
      "submission_id": 102,
      "date": "2026-04-10",
      "location_id": 2,
      "location_name": "江島",
      "submitted_at": "2026-04-20T10:00:00Z"
    }
  ]
}
```

---

#### 3.3 申告一覧取得
```
GET /phase3/facilities/{facility_id}/submissions?year=2026&month=4
```

**レスポンス (200)**:
```json
{
  "year": 2026,
  "month": 4,
  "submissions": [
    {
      "submission_id": 1,
      "staff_id": 1,
      "date": "2026-04-01",
      "location_id": null,
      "location_name": "（勤務曜日により自動申告）",
      "submitted_at": "2026-04-20T10:00:00Z",
      "type": "auto"
    },
    {
      "submission_id": 101,
      "staff_id": 2,
      "date": "2026-04-05",
      "location_id": 1,
      "location_name": "三本木",
      "submitted_at": "2026-04-20T10:00:00Z",
      "type": "manual"
    }
  ]
}
```

---

## ダッシュボード API：申告状況集計

#### 4.1 申告状況サマリー
```
GET /dashboard/summary?facility_id={facility_id}&year={year}&month={month}
Authorization: Bearer {token}
```

**レスポンス (200)**:
```json
{
  "facility_id": 1,
  "facility_name": "ゆうみのいえ",
  "year": 2026,
  "month": 4,
  "staffs": [
    {
      "staff_id": 1,
      "staff_name": "田中太郎",
      "position": "サービス提供責任者",
      "work_days": "月火水木金",
      "work_hours_start": "09:00",
      "work_hours_end": "18:00",
      "submission_status": "submitted",
      "submission_count": 22,
      "submission_dates": ["2026-04-01", "2026-04-02", ..., "2026-04-30"]
    },
    {
      "staff_id": 2,
      "staff_name": "佐藤花子",
      "position": "ヘルパー",
      "work_days": "-",
      "work_hours_start": "-",
      "work_hours_end": "-",
      "submission_status": "submitted",
      "submission_count": 2,
      "submission_dates": ["2026-04-05", "2026-04-10"]
    },
    {
      "staff_id": 3,
      "staff_name": "鈴木次郎",
      "position": "ケアワーカー",
      "work_days": "-",
      "work_hours_start": "-",
      "work_hours_end": "-",
      "submission_status": "not_submitted",
      "submission_count": 0,
      "submission_dates": []
    }
  ]
}
```

**重要**：
- **fixed staff（勤務曜日あり）**: 自動申告 → `submission_status: "submitted"`
- **shift staff（勤務曜日なし）**: 手動申告があれば `submission_status: "submitted"`, なければ `"not_submitted"`
- **ダッシュボード表示**: Phase 2 で登録されたすべてのスタッフを表示

---

## エラーハンドリング

### 共通エラーコード

| ステータス | エラー | 説明 |
|-----------|-------|------|
| 400 | Bad Request | リクエストボディが不正 |
| 401 | Unauthorized | 認証トークンがない/無効 |
| 403 | Forbidden | マルチテナント制御エラー（corp_id不一致） |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバーエラー |

### エラーレスポンス例
```json
{
  "error": "Unauthorized: corp_id mismatch",
  "code": 403,
  "message": "Request corp_id does not match JWT corp_id"
}
```

---

## マルチテナント対応ルール

### 1. リクエスト検証
```
すべてのリクエストで：
1. JWT トークンから corp_id を抽出
2. リクエストの corp_id と比較
3. 不一致 → 403 Forbidden を返す
```

### 2. データベースクエリ
```
すべてのクエリに WHERE corp_id = ? を追加
→ 他テナントのデータは絶対に見えない
```

### 3. 例：スタッフ一覧取得
```
GET /phase2/facilities/1/staffs

バックエンド処理：
1. JWT から corp_id = 1 を取得
2. リクエストの facility_id=1 が corp_id=1 に属するか確認
3. SELECT * FROM staffs 
   WHERE facility_id = 1 AND corp_id = 1
```

---

## テスト環境での初期データ

### API エンドポイント実装完了時に設定

```json
{
  "corporations": [
    { "corp_id": 1, "corp_name": "ゆうみ株式会社" }
  ],
  "facilities": [
    { "facility_id": 1, "corp_id": 1, "facility_name": "ゆうみのいえ" }
  ],
  "locations": [
    { "location_id": 1, "facility_id": 1, "location_name": "三本木" },
    { "location_id": 2, "facility_id": 1, "location_name": "江島" },
    { "location_id": 3, "facility_id": 1, "location_name": "牛川" }
  ],
  "staffs": [
    {
      "staff_id": 1,
      "facility_id": 1,
      "corp_id": 1,
      "staff_name": "田中太郎",
      "positions": [
        { "position": "サ責", "work_hours_start": "09:00", "work_hours_end": "18:00" }
      ],
      "work_days": "月火水木金"
    },
    {
      "staff_id": 2,
      "facility_id": 1,
      "corp_id": 1,
      "staff_name": "佐藤花子",
      "positions": [
        { "position": "ヘルパー", "work_hours_start": "", "work_hours_end": "" }
      ],
      "work_days": ""
    }
  ]
}
```

---

## 実装優先度

1. ✅ **Phase 1 API** - 法人・事業所・拠点（既に部分実装）
2. ⬜ **Phase 2 API** - スタッフ管理（これから）
3. ⬜ **Phase 3 API** - シフト申告（これから）
4. ⬜ **Dashboard API** - 申告集計（これから）
5. ⬜ **認証 API** - JWT発行（要実装）
