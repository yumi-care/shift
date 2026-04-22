# 開発ルール & ガイドライン

**最終更新：** 2026-04-15  
**ステータス：** 🔒 ロック（修正は慎重に、理由を記載）

---

## ★ 最重要ルール：「削除・上書き防止」

### 1. 絶対に削除・変更してはいけない部分

#### ✅ コア機能（IMMUTABLE）

| 機能 | 理由 | 管理者以上の確認が必須 |
|------|------|--------|
| **マルチテナント分離** | SaaS の安全性 | ⚠️ 必須 |
| **認証・権限チェック** | セキュリティ | ⚠️ 必須 |
| **常勤換算計算ロジック** | 法務・法規制対応 | ⚠️ 必須 |
| **人員基準チェック** | 行政への説明責任 | ⚠️ 必須 |
| **拠点→事業所の集計** | 勤務体制表の正確性 | ⚠️ 必須 |
| **タッチオンタイム API 連携** | 実勤怠の正確性 | ⚠️ 必須 |
| **勤務形態コード（A/B/C/D）** | 様式統一 | ⚠️ 必須 |

#### ✅ テーブル・カラム（PROTECTED）

```
corporations.corp_id ⚠️
corporations.created_at ⚠️
corporations.tenant_isolation_key ⚠️

facilities.facility_id ⚠️
facilities.corp_id ⚠️

locations.location_id ⚠️
locations.facility_id ⚠️

staff.staff_id ⚠️
staff.corp_id ⚠️
staff.touch_on_time_id ⚠️  （連携 ID）

shift_templates.template_id ⚠️
shift_templates.required_qualifications ⚠️  （資格要件）

attendance_sync.sync_id ⚠️
attendance_sync.touch_on_time_source ⚠️  （外部連携） 

duty_roster.roster_id ⚠️
duty_roster.calculated_fulltime_equivalent ⚠️  （常勤換算）
```

#### ✅ ビジネスロジック（CRITICAL）

```python
# ❌ 絶対に削除するな
def calculate_fulltime_equivalent(staff_hours, required_hours):
    """
    常勤換算数計算（法定義務）
    IMMUTABLE: 法務・労基対応
    """
    return staff_hours / required_hours

# ❌ 削除厳禁
def check_staffing_requirement(location, roster_data):
    """
    人員基準充足確認（法定義務）
    例：3:1 配置基準のチェック
    IMMUTABLE: 行政への説明責任
    """
    pass

# ❌ 削除厳禁
def isolate_by_tenant(query, corp_id):
    """
    マルチテナント分離フィルタ（SaaS 基盤）
    IMMUTABLE: セキュリティ重要度 = 最高
    """
    return query.filter(corporation_id=corp_id)
```

---

### 2. 修正時のチェックリスト

**コード修正・追加の前に必ず確認：**

- [ ] 既存テスト（unit / integration）が全て通るか
- [ ] マルチテナント分離（WHERE corp_id = xxx）が壊れていないか
- [ ] 認証・権限チェック（is_admin, is_manager等）が削除されていないか
- [ ] 常勤換算・人員基準計算式が正確か（数値の検証）
- [ ] 拠点→事業所の集計ロジックが壊れていないか
- [ ] タッチオンタイム API 呼び出し部分は変更されていないか
- [ ] スタッフ登録時の拠点配置ロジック（1拠点 vs 複数拠点）が壊れていないか
- [ ] 勤務形態コード（A/B/C/D）の定義が変わっていないか

**修正に問題が見つかった場合：**

```
❌ 修正を取り消す（git revert or 修正を巻き戻す）
✅ ユーザーに報告し、修正方法を相談
✅ テスト を追加して再実装
```

---

### 3. ファイル・ディレクトリ構成（厳密）

```
shift/
├── SPECIFICATIONS.md          ← 仕様書（修正は慎重に）
├── DEVELOPMENT_RULES.md       ← このファイル（ルール変更は明示的に）
├── .claude/
│   └── CLAUDE.md              ← プロジェクト管理
│
├── backend/
│   ├── src/
│   │   ├── core/              🔒 認証・マルチテナント・エラーハンドリング
│   │   │   ├── auth.py        ⚠️ IMMUTABLE
│   │   │   ├── tenant.py      ⚠️ IMMUTABLE
│   │   │   └── errors.py      ⚠️
│   │   │
│   │   ├── models/            🔒 DB スキーマ（追加は OK、削除は NG）
│   │   │   ├── corporation.py
│   │   │   ├── facility.py
│   │   │   ├── location.py
│   │   │   ├── staff.py       ⚠️
│   │   │   └── ...
│   │   │
│   │   ├── phase1/            Phase 1：事業所登録（独立）
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   └── services.py
│   │   │
│   │   ├── phase2/            Phase 2：スタッフ登録（独立）
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   └── services.py
│   │   │
│   │   ├── phase3/            Phase 3：シフト提出（独立）
│   │   │   └── ...
│   │   │
│   │   ├── phase4/            Phase 4：シフト表作成（独立）
│   │   │   └── ...
│   │   │
│   │   ├── phase5/            Phase 5：勤怠連携（独立）
│   │   │   ├── touch_on_time/ ⚠️ IMMUTABLE
│   │   │   └── ...
│   │   │
│   │   ├── phase6/            Phase 6：勤務体制表（独立）
│   │   │   ├── duty_roster_generator.py ⚠️
│   │   │   └── ...
│   │   │
│   │   ├── utils/             汎用関数
│   │   │   ├── calculations.py ⚠️ 常勤換算・人員基準
│   │   │   └── ...
│   │   │
│   │   └── main.py            アプリケーション起動
│   │
│   ├── tests/                 テスト（削除禁止）
│   │   ├── test_phase1.py
│   │   ├── test_phase2.py
│   │   └── ...
│   │
│   ├── requirements.txt       依存関係
│   └── .env.example           環境変数テンプレート
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── phase1/
│   │   │   ├── phase2/
│   │   │   └── ...
│   │   │
│   │   ├── components/        共通コンポーネント
│   │   ├── hooks/             カスタムフック
│   │   ├── utils/             フロント汎用関数
│   │   └── App.jsx
│   │
│   └── package.json
│
└── docs/
    ├── api_specification.md   API 仕様書
    ├── database_schema.md     DB スキーマ設計
    └── ...
```

---

### 4. フェーズ依存関係

```
Phase 1 (事業所登録)
  ↓
Phase 2 (スタッフ登録)  ← Phase 1 に依存
  ↓
Phase 3 (シフト提出)    ← Phase 1, 2 に依存
  ↓
Phase 4 (シフト表作成)  ← Phase 1, 2, 3 に依存
  ↓
Phase 5 (勤怠連携)      ← Phase 1, 2 に依存（Phase 3, 4 とは独立）
  ↓
Phase 6 (勤務体制表)    ← 全フェーズに依存
```

**重要な約束：**
- Phase N の実装が Phase N-1 を壊してはいけない
- 後ろのフェーズは前のフェーズのテーブル構造を変えてはいけない

---

### 5. コード記述時のルール

#### 🔒 マルチテナント分離

```python
# ❌ ダメな例
@app.get("/staffs/")
def get_staffs():
    return Staff.query.all()  # 全企業のスタッフが見えてしまう


# ✅ 正しい例
@app.get("/staffs/")
def get_staffs(current_user: User = Depends(get_current_user)):
    corp_id = current_user.corp_id  # ユーザーの企業 ID を取得
    return Staff.query.filter(
        Staff.corp_id == corp_id  # 明示的にフィルタ
    ).all()
```

#### 🔒 IMMUTABLE な計算式

```python
# ❌ 変更厳禁な計算式には必ずコメントを
# ⚠️ IMMUTABLE: 法定義務（常勤換算数）
def calculate_fulltime_equivalent(monthly_hours: float, weekly_target: float) -> float:
    """
    常勤換算数 = 月間勤務時間 / (週間所定労働時間 × 4.3)
    根拠：厚生労働省通知
    変更は行政への説明責任が生じるため、ユーザーの明示的な確認が必須
    """
    return monthly_hours / (weekly_target * 4.3)

# 修正する場合の手順：
# 1. ユーザーに「この計算式を変更したい」旨を相談
# 2. 理由・根拠を確認
# 3. 法務/行政への影響を確認
# 4. テストケースを追加
# 5. 修正内容をコミットメッセージに詳しく記載
```

#### 認証・権限チェック

```python
# ❌ 削除厳禁
def require_admin(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user.is_admin:
            raise PermissionDenied("Admin only")
        return func(*args, **kwargs)
    return wrapper

# ✅ こう使う
@app.delete("/corporations/{corp_id}/")
@require_admin
def delete_corporation(corp_id: int):
    # 管理者のみ実行可能
    pass
```

#### テスト追加の義務

```python
# コード変更時は必ずテストを追加 or 修正
import pytest

def test_fulltime_equivalent_calculation():
    """常勤換算数の計算が正確か"""
    result = calculate_fulltime_equivalent(160, 40)
    assert abs(result - 0.93) < 0.01  # 月160h ÷ (40h × 4.3週) ≈ 0.93

def test_multitenant_isolation():
    """Corp A のスタッフが Corp B に見えないか"""
    corp_a_staffs = get_staffs(current_user=User(corp_id=1))
    assert all(s.corp_id == 1 for s in corp_a_staffs)
    # Corp B のユーザーでもフィルタされるか
    corp_b_staffs = get_staffs(current_user=User(corp_id=2))
    assert all(s.corp_id == 2 for s in corp_b_staffs)
```

---

### 6. 修正リクエストの書き方

**ユーザーから修正を依頼される場合、以下の情報を整理する：**

```markdown
【修正依頼】
- **フェーズ：** Phase X
- **対象ファイル：** backend/src/phase4/services.py:120-130
- **修正内容：** シフト自動割当の条件を変更したい
- **現在の挙動：** 資格が 100% 一致する場合のみ割当
- **望ましい挙動：** 必須資格を持っていれば割当可能に
- **影響範囲：**
  - [ ] テーブル構造は変わらないか
  - [ ] 他のフェーズは壊れないか
  - [ ] テストが通るか
- **理由・背景：** 現場からの要望で、実務的には必須資格があれば OK とのこと
- **検証方法：** 修正後、以下のケースでテスト：
  - ケース 1：必須資格 ✅、推奨資格 ❌ → 割当可能か
  - ケース 2：必須資格 ❌、推奨資格 ✅ → 割当不可か
```

---

### 7. Git コミットメッセージの形式

```
【修正内容の種類】 フェーズ: 簡潔な説明

詳しい説明（複数行可）

修正内容：
- 変更したファイル
- 変更したロジック
- なぜ変更したのか

影響範囲：
- どのテーブル・機能が影響を受けるか
- テストは通るか

IMMUTABLE な部分は変更していないか：
- [ ] マルチテナント分離ロジック
- [ ] 認証・権限チェック
- [ ] 常勤換算・人員基準計算
- [ ] タッチオンタイム連携
```

**例：**

```
fix(Phase 4): シフト自動割当の資格要件ロジックを修正

必須資格判定を厳しくしすぎていた問題を修正。
現場からの要望で、必須資格を持っていれば推奨資格がなくても割当可能にしたい。

修正内容：
- backend/src/phase4/services.py の match_staff_to_shift() 関数を変更
- 必須資格チェックのみ厳密に、推奨資格はオプション判定に

影響範囲：
- shift_assignments テーブル：変更なし
- test_phase4.py：新しいテストケースを追加

確認：
- [x] マルチテナント分離は壊れていない
- [x] 他のフェーズへの影響なし
- [x] 全テストが通った
```

---

### 8. Phase 完成時の確認チェック

各フェーズが完成したら、以下をチェック：

```
Phase 1 完成チェックリスト：
  [ ] 法人・事業所・拠点の登録が機能するか
  [ ] DB テーブルが正しく作成されているか
  [ ] マルチテナント分離が機能するか（Corp A が Corp B を見えないか）
  [ ] テストが全て通るか
  [ ] 実際にブラウザで操作して UI/UX を確認
  [ ] 修正が必要な箇所を整理してユーザーに報告

Phase 2 完成チェックリスト：
  [ ] スタッフ登録が機能するか
  [ ] 拠点配置（1拠点専任 vs 複数拠点）ロジックが正確か
  [ ] 資格登録が正確か
  [ ] Phase 1 のテーブルが壊れていないか
  [ ] テストが全て通るか
  [ ] ブラウザで操作確認

... Phase 3, 4, 5, 6 も同様
```

---

### 9. 禁止事項

| 禁止項目 | 理由 |
|---------|------|
| 🚫 `DROP TABLE`, `TRUNCATE` （本番） | データ喪失の危険 |
| 🚫 `DELETE FROM ... WHERE ...` （確認なし） | 意図しないデータ削除 |
| 🚫 マルチテナント分離フィルタの削除 | セキュリティ違反 |
| 🚫 認証チェックのスキップ（`--no-auth` 等） | セキュリティ違反 |
| 🚫 常勤換算式の無断変更 | 法務違反 |
| 🚫 人員基準チェックロジックの削除 | 行政対応不可 |
| 🚫 タッチオンタイム連携のキャンセル | 二重管理になる |
| 🚫 API キー・シークレット のコミット | 流出リスク |
| 🚫 `.env` ファイル（本物）のコミット | 流出リスク |

---

### 10. 変更管理ログ

**このファイル・仕様書を変更した場合は必ず記録：**

| 日時 | 変更内容 | 理由 | 承認者 |
|------|---------|------|--------|
| 2026-04-15 | 初版作成 | プロジェクト開始 | ユーザー |
| | | | |

---

## まとめ

### 「削除・上書き防止」のための 5 つの約束

1. ✅ **IMMUTABLE なコード** → コメント `⚠️ IMMUTABLE` を付与
2. ✅ **マルチテナント分離** → 全ての SELECT/UPDATE/DELETE に `corp_id` フィルタ
3. ✅ **テスト優先** → コード変更 → テスト追加 → コミット
4. ✅ **修正時の根拠説明** → 「何を、なぜ、どう」を明示
5. ✅ **定期確認** → 各フェーズ完成時にチェックリスト実施

**これにより、プロジェクトが「削除・上書き」の危険から守られます。**
