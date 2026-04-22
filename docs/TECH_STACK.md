# 技術スタック確定版

**状態：** ⏳ ユーザーの確認待ち  
**版：** v1.0 | 2026-04-15

---

## 決定プロセス

1. このドキュメントをユーザーが確認
2. 各レイヤーで「案① or 案②」を選択 → 確認返答
3. 確定後、開発を開始

---

## バックエンド言語・フレームワーク

### 候補① Python + FastAPI

| 項目 | 評価 |
|------|------|
| **学習曲線** | 低い（Python は学びやすい） |
| **非同期対応** | ✅ 優れている（async/await） |
| **API 開発速度** | ✅ 高速（自動ドキュメント生成） |
| **マルチテナント対応** | ✅ 可能 |
| **外部 API 連携** | ✅ 優れている（requests, httpx） |
| **チーム規模** | 大きなコミュニティ |
| **デプロイ** | ✅ 容易（Gunicorn, Docker） |

**FastAPI の特徴**
```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/corporations/")
async def get_corporations(corp_id: int):
    # 自動バリデーション、自動ドキュメント生成
    pass
```

### 候補② Node.js + Nest.js

| 項目 | 評価 |
|------|------|
| **学習曲線** | 中程度（JavaScript/TypeScript） |
| **非同期対応** | ✅ 優れている（Promise, async/await） |
| **API 開発速度** | ✅ 高速（フレームワーク充実） |
| **マルチテナント対応** | ✅ 可能 |
| **外部 API 連携** | ✅ 優れている（axios, fetch） |
| **チーム規模** | 大きなコミュニティ |
| **デプロイ** | ✅ 容易（Docker） |

**Nest.js の特徴**
```typescript
@Controller('corporations')
export class CorporationController {
  @Get()
  getCorporations(@Query('corp_id') corpId: number) {
    // TypeScript による型安全性
  }
}
```

### 推奨：**Python + FastAPI** ✅

**理由：**
- 非同期処理が簡潔
- 自動ドキュメント生成（Swagger UI）
- チームの Python スキルを活かせる
- 法務計算式（常勤換算等）の実装が明確

**決定待ち：** ユーザーの確認お願いします

---

## フロントエンドフレームワーク

### 候補① React

| 項目 | 評価 |
|------|------|
| **学習曲線** | 中程度 |
| **コンポーネント設計** | ✅ 優れている |
| **状態管理** | Redux, Zustand 等で対応可能 |
| **UI ライブラリ** | ✅ 充実（Material-UI, Ant Design 等） |
| **デプロイ** | ✅ 容易（Vercel, Netlify 等） |

### 候補② Vue.js

| 項目 | 評価 |
|------|------|
| **学習曲線** | 低い（テンプレート記法が直感的） |
| **コンポーネント設計** | ✅ 優れている |
| **状態管理** | Pinia で対応可能 |
| **UI ライブラリ** | ✅ 充実（Vuetify, Element Plus 等） |
| **デプロイ** | ✅ 容易 |

### 候補③ Next.js（React ベース）

| 項目 | 評価 |
|------|------|
| **SSR/SSG対応** | ✅ 標準装備 |
| **ルーティング** | ✅ ファイルベース（シンプル） |
| **API ルート** | ✅ バックエンド不要（初期段階） |
| **デプロイ** | ✅ Vercel で超簡単 |

### 推奨：**React + Vite** ✅

**理由：**
- コンポーネント設計が明確
- カレンダー UI（Phase 4 で必須）の実装例が豊富
- 状態管理ツールが充実
- モダンな開発環境（Vite で高速）

**フォルダ構成：**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── phase1/
│   │   ├── phase2/
│   │   └── ...
│   ├── components/
│   │   ├── LoginForm.jsx
│   │   ├── ConfirmationScreen.jsx
│   │   ├── CalendarShift.jsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useFacility.js
│   │   └── ...
│   ├── services/
│   │   ├── api.js  （バックエンド API 呼び出し）
│   │   └── ...
│   └── App.jsx
├── vite.config.js
└── package.json
```

**決定待ち：** ユーザーの確認お願いします

---

## データベース

### 確定：**PostgreSQL** ✅

**理由：**
- マルチテナント対応に最適
- JSON 型で柔軟なデータ構造に対応
- ACID 準拠で信頼性が高い
- 常勤換算等の計算式を SQL で実装可能

**バージョン：** PostgreSQL 14 以上

**初期スキーマ（Phase 1）：**
```sql
CREATE TABLE corporations (
    corp_id SERIAL PRIMARY KEY,
    corp_name VARCHAR(255) NOT NULL,
    corp_number VARCHAR(13) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facilities (
    facility_id SERIAL PRIMARY KEY,
    corp_id INT NOT NULL REFERENCES corporations(corp_id),
    facility_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(50),
    capacity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    facility_id INT NOT NULL REFERENCES facilities(facility_id),
    location_name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 認証・セッション管理

### Phase 1-2（MVP）
```
✅ 簡易認証
   - ユーザー名 + パスワード
   - テスト用：admin / admin123
   - DB にハードコード可
```

### Phase 3-4
```
✅ JWT（JSON Web Token）
   - HTTP ヘッダに Bearer token を含める
   - 有効期限：24時間
   - リフレッシュトークン：7日
```

### Phase 5-6
```
⏳ OAuth2 検討
   - 自社のみ利用する場合：不要
   - 外部企業に販売する場合：検討
```

---

## 外部 API 連携

### タッチオンタイム（Touch on Time）

**連携方式：** REST API

**取得エンドポイント（例）：**
```
GET /api/v1/employees/{employee_id}/attendance?month=2026-04
GET /api/v1/punches?start_date=2026-04-01&end_date=2026-04-30
```

**認証方式：** API キー or OAuth2（要確認）

**取得データ：**
- 出退勤時刻
- 欠勤区分
- 実労働時間

**連携スケジュール（MVP）：**
```
✅ 日次バッチ（毎日 00:05 に実行）
   - 前日の勤怠データを取得
   - DB に保存
❌ リアルタイム同期（後から）
❌ Webhook（後から）
```

---

## キャッシング・パフォーマンス

### MVP（初期段階）
```
❌ Redis（不要）
❌ CDN（不要）
✅ DB クエリ最適化
```

### Phase 4 以降
```
✅ Redis 導入（セッション管理、キャッシング）
✅ クエリ最適化（インデックス）
```

---

## テスト戦略

### Unit テスト
```
ツール：pytest（Python）/ Jest（JavaScript）
対象：
  ✅ 常勤換算計算（utilities）
  ✅ マルチテナント分離ロジック
  ✅ シフト割当ロジック
  ✅ 人員基準チェック

カバレッジ目標：80% 以上
```

### 統合テスト
```
対象：
  ✅ API エンドポイント
  ✅ DB との連携
  ✅ 外部 API（タッチオンタイム）との連携
```

### E2E テスト
```
ツール：Cypress / Playwright
対象：
  ✅ ログイン → 事業所登録 → 確認 → 完了
  ✅ シフト提出フロー全体
  ✅ 修正フロー

実施タイミング：Phase ごと
```

---

## デプロイ・環境管理

### 開発環境
```
OS：Windows / macOS
DB：PostgreSQL ローカル
バックエンド起動：python -m uvicorn main:app --reload
フロント起動：npm run dev
```

### 本番環境（将来）
```
🚀 Docker + Docker Compose
   - バックエンド：Gunicorn + FastAPI
   - フロントエンド：Nginx

🚀 クラウド（AWS / GCP / Azure）
   - RDS（PostgreSQL）
   - App Engine or EC2

🚀 CI/CD：GitHub Actions
   - テスト実行
   - デプロイ自動化
```

---

## 環境変数管理

### `.env.example`（コミット対象）
```
DATABASE_URL=postgresql://user:password@localhost/shift_db
TOUCH_ON_TIME_API_KEY=xxx
TOUCH_ON_TIME_API_URL=https://api.touchontime.com
JWT_SECRET=your-secret-key-here
```

### `.env`（ローカルのみ、コミット対象外）
```
（実際の値を記入）
```

---

## ドキュメント・ナレッジベース

### 必須
```
✅ API 仕様書（Swagger/OpenAPI）
✅ DB スキーマドキュメント
✅ コンポーネント設計ドキュメント
✅ デプロイガイド
```

### あると便利
```
✅ アーキテクチャ図
✅ シーケンス図
✅ トラブルシューティングガイド
```

---

## 決定チェックリスト

ユーザーに以下を確認します：

- [ ] バックエンド：Python + FastAPI でいい？
- [ ] フロントエンド：React + Vite でいい？
- [ ] DB：PostgreSQL でいい？
- [ ] 認証：Phase 1-2 は簡易認証、Phase 3-4 は JWT でいい？
- [ ] テスト戦略は OK？
- [ ] デプロイ方針は OK？

---

## 次のステップ

1. ユーザーが技術スタックを確認
2. 確定後、以下を作成
   - `backend/requirements.txt`（Python 依存関係）
   - `frontend/package.json`（npm 依存関係）
   - `docker-compose.yml`（開発環境）
3. Phase 1 開発開始

---

**確認待ち中...**  
📧 ユーザーからの返答で正式確定します
