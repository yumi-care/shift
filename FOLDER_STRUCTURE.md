# フォルダ構造説明

```
shift/
│
├── backend/                      ← サーバー側のコード
│   ├── src/
│   │   ├── core/                 ← 全フェーズで共有する基盤
│   │   │   ├── auth.py           （ログイン機能）
│   │   │   ├── database.py       （データベース接続）
│   │   │   ├── models.py         （テーブル定義）
│   │   │   └── errors.py         （エラー処理）
│   │   │
│   │   ├── phase1/               ← Phase 1：法人・事業所・拠点の登録
│   │   │   ├── routes.py         （API エンドポイント）
│   │   │   ├── schemas.py        （入出力データ）
│   │   │   └── services.py       （ビジネスロジック）
│   │   │
│   │   ├── phase2/               ← Phase 2：職員の登録
│   │   ├── phase3/               ← Phase 3：職員がシフト希望を出す
│   │   ├── phase4/               ← Phase 4：システムがシフト表を作成
│   │   ├── phase5/               ← Phase 5：勤怠システムから実績取得
│   │   ├── phase6/               ← Phase 6：勤務体制表を自動作成
│   │   │
│   │   └── utils/                ← 全フェーズで共通で使う関数
│   │       ├── calculations.py   （常勤換算など）
│   │       └── helpers.py        （補助関数）
│   │
│   ├── tests/                    ← テストコード
│   │   ├── test_phase1.py
│   │   ├── test_phase2.py
│   │   ├── test_phase3.py
│   │   ├── test_phase4.py
│   │   ├── test_phase5.py
│   │   └── test_phase6.py
│   │
│   ├── main.py                   ← アプリケーション起動
│   └── requirements.txt           ← Python の依存パッケージ
│
├── frontend/                     ← Web画面側のコード
│   ├── src/
│   │   ├── pages/
│   │   │   ├── phase1/           ← Phase 1 の画面（法人・事業所・拠点登録）
│   │   │   ├── phase2/           ← Phase 2 の画面（職員登録）
│   │   │   ├── phase3/           ← Phase 3 の画面（シフト希望入力）
│   │   │   ├── phase4/           ← Phase 4 の画面（シフト表確認）
│   │   │   ├── phase5/           ← Phase 5 の画面（勤怠データ表示）
│   │   │   └── phase6/           ← Phase 6 の画面（勤務体制表表示）
│   │   │
│   │   ├── components/           ← 全フェーズで共有するコンポーネント
│   │   │   ├── LoginForm.jsx     （ログインフォーム）
│   │   │   ├── Header.jsx        （ヘッダー）
│   │   │   ├── ConfirmScreen.jsx （確認画面）
│   │   │   └── ...
│   │   │
│   │   ├── services/
│   │   │   └── api.js            ← バックエンドを呼び出すコード
│   │   │
│   │   ├── App.jsx
│   │   └── index.jsx
│   │
│   ├── package.json              ← npm の依存パッケージ
│   └── vite.config.js            ← ビルド設定
│
├── database/                     ← データベース設計
│   └── schema.sql                ← テーブル定義（全フェーズで共有）
│
├── docs/                         ← ドキュメント
│   └── TECH_STACK.md             （技術スタック）
│
├── SPECIFICATIONS.md             ← 仕様書
├── DEVELOPMENT_RULES.md          ← 開発ルール
├── PHASE_STRUCTURE.md            ← フェーズ説明
└── FOLDER_STRUCTURE.md           ← このファイル
```

---

## フェーズ間のデータの流れ

```
Phase 1：法人・事業所・拠点を登録
   ↓（保存）
core/models.py に Corporation, Facility, Location テーブルが定義
   ↓
Phase 2：職員を登録（Phase 1 で登録した拠点を参照）
   ↓（保存）
core/models.py に Staff テーブルが追加定義
   ↓
Phase 3：職員がシフト希望を出す（Phase 1, 2 のデータを参照）
   ↓（保存）
phase3/models.py に ShiftSubmission テーブルが定義
   ↓
Phase 4：シフト表を作成（Phase 1, 2, 3 のデータを参照）
   ↓（保存）
phase4/models.py に ShiftSchedule テーブルが定義
   ↓
Phase 5：勤怠システムから実績を取得（Phase 1, 2 のデータを参照）
   ↓（保存）
phase5/models.py に AttendanceData テーブルが定義
   ↓
Phase 6：勤務体制表を作成（全フェーズのデータを参照）
   ↓（生成）
DutyRoster テーブルが定義
```

---

## 開発の進め方

### Phase 1 開発時
1. backend/src/core/models.py に Corporation, Facility, Location テーブルを定義
2. backend/src/phase1/ に API を実装
3. frontend/src/pages/phase1/ に登録画面を実装
4. backend/tests/test_phase1.py にテストを書く
5. 動作確認

### Phase 2 開発時
1. core/models.py に Staff テーブルを追加定義
2. backend/src/phase2/ に API を実装
3. frontend/src/pages/phase2/ に登録画面を実装
4. backend/tests/test_phase2.py にテストを書く
5. Phase 1 のテストが壊れていないか確認
6. 動作確認

### 以降も同様

---

## Phase ごとのテスト

```
test_phase1.py
  → Phase 1 が正しく動いているか
  → 法人・事業所・拠点がきちんと登録されるか

test_phase2.py
  → Phase 2 が正しく動いているか
  → Phase 1 で登録した拠点が参照できるか
  → Phase 1 が壊れていないか

test_phase3.py
  → Phase 3 が正しく動いているか
  → Phase 1, 2 のデータが参照できるか
  → Phase 1, 2 が壊れていないか

... 以降も同様
```

---

## 共有部分（core/ と utils/）

### core/ フォルダ
- 全フェーズで共有するデータベース接続
- 認証機能
- テーブル定義（models.py）
- エラー処理

### utils/ フォルダ
- 常勤換算数の計算（全フェーズで必要）
- 人員基準チェック（全フェーズで必要）
- その他の共通関数

---

## ファイル作成の流れ

**Phase 1 開発時：**

```
1. backend/src/core/models.py ← Corporation, Facility, Location テーブルを定義
2. backend/src/core/auth.py ← ログイン機能（既存）
3. backend/src/phase1/schemas.py ← 入出力データ定義
4. backend/src/phase1/services.py ← ビジネスロジック
5. backend/src/phase1/routes.py ← API エンドポイント
6. frontend/src/pages/phase1/index.jsx ← 登録画面
7. backend/tests/test_phase1.py ← テスト
8. database/schema.sql ← テーブルのSQL定義
```

---

## 確認

このフォルダ構造でいいですか？

または、修正が必要ですか？
