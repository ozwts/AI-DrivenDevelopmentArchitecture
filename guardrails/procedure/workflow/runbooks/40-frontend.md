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

Playwright MCPで実際の画面を確認しながら、導線とUIをブラッシュアップする。

```
Task(
  subagent_type='designer',
  prompt='以下の画面の導線とデザインをブラッシュアップしてください: {追加・修正した画面のパス一覧}'
)
```

**チェック観点:**

- **導線（最優先）**: 到達可能性、一貫性、フィードバック、回復可能性
- `guardrails/constitution/user-first/user-first-principles.md`
- `guardrails/policy/web/design/`

---

## ステップ 9: コンポーネントテストの実装

**ポリシー:**

- `guardrails/policy/web/component/40-test-patterns.md`
- `guardrails/policy/web/route/40-test-patterns.md`
- `guardrails/policy/web/ui/50-test-pattern.md`

**実装先:** 各コンポーネントと同階層に `*.ct.test.tsx` を作成

```
mcp__guardrails__procedure_test(target='web-component')
```

---

## ステップ 10: スナップショットテストの実装

**ポリシー:**

- `guardrails/policy/web/component/40-test-patterns.md`
- `guardrails/policy/web/route/40-test-patterns.md`
- `guardrails/policy/web/ui/50-test-pattern.md`

**実装先:** ルートディレクトリ直下に `route.ss.test.ts` を作成

```
mcp__guardrails__procedure_snapshot(action='update', file='...')
```

**スナップショット確認:** 取得したスナップショットファイルを読み、想定通りの内容か確認すること。

- レイアウト崩れ、不要な要素、欠落がないか
- テストケース名と内容が一致しているか
- 問題があれば修正して再取得

---

## ステップ 11: 最終検証

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

## ステップ 12: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. 実装中に発見した契約変更の必要性
2. バックエンドAPI設計への影響
3. 追加で必要になったタスク
4. 不要になったタスク

**見直しが必要な場合:**

```
mcp__guardrails__procedure_workflow(action='list')  // 現在の状態を確認
mcp__guardrails__procedure_workflow(action='set', tasks=[
  // 完了済みタスクはdone: trueで保持
  { what: "完了済みタスク", ..., done: true },
  // 新しい計画
  { what: "新タスク", ... }
])
```

**見直し不要の場合:** そのまま次フェーズへ進む

---

## 完了条件

- コード生成完了
- UI実装完了
- テスト成功
- 静的解析通過
- ポリシーレビュー通過
