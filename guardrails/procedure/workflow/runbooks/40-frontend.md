# フロントエンド実装ワークフロー

## 対象スコープ

- `web/src/` 配下のフロントエンドコード

## 開発モード

```
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `contracts/business/` - ビジネス契約
- `server/src/domain/model/` - ドメインモデル
- `guardrails/policy/web/` - フロントエンドポリシー

---

## ステップ 1: コード生成

```
mcp__guardrails__procedure_codegen(workspace='web')
```

---

## ステップ 2: 影響範囲の検証

```
mcp__guardrails__review_static_analysis(
  workspace='web',
  targetDirectories=['web/src/'],
  analysisType='type-check'
)
```

---

## ステップ 3: モックデータの実装

**ポリシー:** `guardrails/policy/web/mock/`

**実装先:** `web/src/mocks/`

---

## ステップ 4: ルート実装

**ポリシー:**

- `guardrails/policy/web/route/`
- `guardrails/policy/web/component/`
- `guardrails/policy/web/design/`

**実装先:** `web/src/app/routes/`

---

## ステップ 5: Feature抽出（必要な場合）

**ポリシー:**

- `guardrails/policy/web/feature/`
- `guardrails/policy/web/hooks/`

**実装先:** `web/src/app/features/`

---

## ステップ 6: 共有UIコンポーネント（必要な場合）

**ポリシー:** `guardrails/policy/web/ui/`

**実装先:** `web/src/app/lib/ui/`

---

## ステップ 6b: 基盤（lib）などの追加・修正（必要な場合）

**ポリシー:** `guardrails/policy/web/lib/`

**実装先:** `web/src/app/lib/`など

ポリシーが存在しない新概念は、先にポリシーを起草し人間のレビューを受けること。

---

## ステップ 7: レビュー

→ `10-development-overview.md` の「レビューと修正」を参照

### 7-1: 静的解析

```
mcp__guardrails__review_static_analysis(
  workspace='web',
  targetDirectories=['{実装先ディレクトリ}']
)
```

### 7-2: 定性レビュー

修正内容に応じた観点でポリシーレビューを実施する。

```
mcp__guardrails__review_qualitative(
  policyId='{修正内容に応じたポリシーID}',
  targetDirectories=['{実装先ディレクトリ}']
)
```

---

## ステップ 8: デザインブラッシュアップ

**サブエージェント:** `designer`

Playwright MCPで実際の画面を確認しながら、UIをブラッシュアップする。

**チェック観点:**

- `guardrails/constitution/user-first/user-first-principles.md` - ユーザーファースト原則
- `guardrails/policy/web/design/` - デザイン4原則（整列・近接・対比・反復）

**確認する画面状態:**

- 初期状態、入力中、エラー状態、成功状態、空状態

---

## ステップ 9: テストの実装

**ポリシー:**

- `guardrails/policy/web/component/40-test-patterns.md`
- `guardrails/policy/web/route/40-test-patterns.md`
- `guardrails/policy/web/ui/50-test-pattern.md`

```
mcp__guardrails__procedure_test(target='web-component')
mcp__guardrails__procedure_snapshot(action='update', file='...')
```

---

## ステップ 10: 最終検証

```
mcp__guardrails__review_static_analysis(workspace='web', targetDirectories=['web/src/'])
mcp__guardrails__review_unused_exports(workspace='web')
mcp__guardrails__procedure_fix(workspace='web')
mcp__guardrails__procedure_dev(action='start', mode='mock')
```

今回実装した箇所に関わる全ての観点で定性レビューと修正を実施する。
サブエージェントを使って並列実行を推奨。

---

## 契約変更が必要な場合

1. `contracts/api/` のOpenAPI仕様を修正
2. `contracts/business/` のビジネスルールを修正（必要な場合）
3. `mcp__guardrails__procedure_codegen(workspace='web')`
4. 影響箇所を修正して実装を継続

---

## 完了条件

- コード生成完了
- UI実装完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
