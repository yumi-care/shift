---
name: UI/UX フロー仕様
description: 各フェーズのユーザーフロー、画面遷移、データ連携
type: specification
---

# UI/UX フロー仕様

## Phase 1：事業所登録（管理者）

```
ログイン
  ↓
Dashboard
  ↓
ハンバーガーメニュー → Phase 1
  ↓
【入力画面】法人・事業所・拠点を登録
  ├─ 法人登録フォーム（法人名）
  ├─ 事業所登録フォーム（事業所名 per 法人）
  └─ 拠点登録フォーム（拠点名 per 事業所）
  ↓
API POST → インメモリ DB 保存
  ↓
登録完了 → 一覧表示
```

**データ フロー：**
- 入力 → API POST → DB 保存 → 一覧表示（API GET）

---

## Phase 2：スタッフ登録（管理者）

```
ログイン
  ↓
Dashboard
  ↓
ハンバーガーメニュー → Phase 2
  ↓
【セレクタ】法人・事業所 選択
  ↓
【スタッフ登録フォーム】
  ├─ スタッフ名（必須）
  ├─ 拠点配置（複数選択可）
  ├─ 職種（複数登録可）
  ├─ 勤務曜日（月火水木金... / 空白でシフト申告制）
  ├─ 勤務時間（職種ごとの開始・終了時刻）
  ├─ 休憩時間（start / end）
  └─ 登録ボタン
  ↓
API POST /api/phase2/facilities/:facilityId/staffs
  ↓
DB 保存（facility_id 単位で管理）
  ↓
スタッフ一覧表示
```

**スタッフ分類（重要）：**

| 分類 | work_days | Phase 3 の導線 |
|------|-----------|---------------|
| 固定勤務 | 「月火水木金」など | 自動申告済み（手動入力不要） |
| シフト申告制 | 空白 | 日付・拠点を手入力 |

**データ フロー：**
- 入力 → API POST → DB 保存 → スタッフ一覧表示（API GET）

---

## Phase 3：シフト申告

### 3-1. 管理者側（リンク生成）

```
ログイン
  ↓
Dashboard
  ↓
ハンバーガーメニュー → Phase 3
  ↓
【リンク生成画面】
  ├─ 法人・事業所 選択
  ├─ 申告年月（yyyy/mm）選択
  └─ 「リンク生成」ボタン
  ↓
生成リンク：
  /phase3?corp_id=1&facility_id=2&year=2026&month=04
  ↓
リンク をコピー → スタッフに配布（メール等）
```

### 3-2. スタッフ側（シフト申告）

```
メール内のリンク をクリック
  ↓
/phase3?corp_id=1&facility_id=2&year=2026&month=04
  ↓
【スタッフ識別】
  ├─ corp_id, facility_id から登録済みスタッフリストを取得（API GET）
  └─ スタッフ自身を選択（ドロップダウン）
  ↓
【勤務曜日の有無で分岐】

┌─────────────────────────────────────────┐
│ work_days あり = 固定勤務                 │
├─────────────────────────────────────────┤
│ 【表示内容】                              │
│ ✓ 申告済み（自動）                        │
│   月火水木金 → 該当曜日を自動計算         │
│   例：2026-04 の月火水木金 = 13日         │
│                                         │
│ 【操作】                                  │
│ 「確認」ボタン → 送信                     │
│   ↓                                      │
│ API POST /api/phase3/shift-submissions/auto
│   {                                      │
│     staff_id, facility_id, year, month    │
│   }                                      │
│   ↓                                      │
│ DB に auto 申告を保存                     │
│ （location_name = "（勤務曜日により自動申告）"） │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ work_days なし = シフト申告制              │
├─────────────────────────────────────────┤
│ 【入力フロー】                            │
│ ① カレンダー表示（yyyy-mm）               │
│ ② スタッフが日付をクリック（複数選択可）  │
│ ③ 各日付に拠点を選択（ドロップダウン）    │
│ ④ 「送信」ボタン                         │
│   ↓                                      │
│ API POST /api/phase3/shift-submissions/manual
│   {                                      │
│     staff_id, facility_id,               │
│     submissions: [                       │
│       { date: "2026-04-01", location_id: 1 },
│       { date: "2026-04-02", location_id: 2 },
│       ...                                │
│     ]                                    │
│   }                                      │
│   ↓                                      │
│ DB に manual 申告を保存                   │
└─────────────────────────────────────────┘

【確認画面】
  申告済み日付と拠点を表示
  ↓
【送信】ボタン
  ↓
完了メッセージ
```

**データ フロー：**
```
API GET /api/phase2/facilities/:facilityId/staffs
  → スタッフ一覧取得

API GET /api/phase1/facilities/:facilityId/locations/
  → 拠点一覧取得

API POST /api/phase3/shift-submissions/auto | manual
  → DB に申告保存
```

---

## Dashboard：申告状況確認・編集

```
ログイン
  ↓
Dashboard（デフォルト画面）
  ↓
【セレクタ】法人 → 事業所 → 年 → 月 選択
  ↓
API GET /api/dashboard/summary
  params: { facility_id, year, month }
  ↓
【申告済みスタッフ一覧】テーブル表示
  columns:
    | 事業所名 | 拠点 | スタッフ名 | 職種 | 勤務曜日 | 勤務時間 | 申告状況 |
  ↓
【詳細ボタン】クリック
  ↓
【モーダル】申告詳細表示
  ├─ スタッフ名
  ├─ 申告済み日付と拠点（一覧）
  │   ├─ 固定勤務（type=auto）
  │   │   └─ 削除ボタンのみ（編集不可）
  │   │
  │   └─ 手動申告（type=manual）
  │       ├─ 編集ボタン
  │       │   → 日付・拠点を変更 → 保存
  │       │   → API PUT /api/dashboard/submissions/:submissionId
  │       │
  │       └─ 削除ボタン
  │           → API DELETE /api/dashboard/submissions/:submissionId
  │
  └─ モーダルクローズ → ダッシュボード更新
```

**データ フロー：**
```
API GET /api/dashboard/summary
  → submission_details を取得：
    [
      {
        submission_id,
        date,
        location_id,
        location_name,
        type: "auto" | "manual"
      }
    ]

削除 / 更新時：
  API DELETE | PUT /api/dashboard/submissions/:submissionId
  ↓
  DB 更新
  ↓
  API GET /api/dashboard/summary（再取得）
  ↓
  画面更新
```

---

## Phase 4：シフト表作成・確認（未実装）

```
ダッシュボードで申告済みスタッフを確認
  ↓
Phase 4：シフト表画面
  ↓
申告データをもとにシフト表を生成・編集
  ↓
シフト表を確定
```

---

## Phase 5：実勤怠連携（未実装）

```
タッチオンタイム API と連携
  ↓
実勤怠データを取得
```

---

## Phase 6：勤務体制表生成（未実装）

```
申告データ + 実勤怠データ
  ↓
勤務体制表を自動生成
```

---

## 【重要：データソース一覧】

| フェーズ | データ | 保存先 | 取得元 |
|---------|--------|--------|--------|
| Phase 1 | 法人・事業所・拠点 | API DB | API GET |
| Phase 2 | スタッフ | API DB | API GET |
| Phase 3 | 申告（auto/manual） | API DB | API POST |
| Dashboard | 申告状況 | API DB | API GET /dashboard/summary |
| Dashboard 編集 | 申告（削除/更新） | API DB | API DELETE/PUT |

**重要：ローカルストレージは使わない（全て API DB）**

---

## 【テスト環境での初期データ】

バックエンド再起動後もデータが保持されるため、以下の対応が必要：

- JSON ファイルベースで DB をバックアップ
- または初期テストデータを自動ロード
- または Supabase に接続（本番向け）

