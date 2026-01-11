# インフラ変更（Terraform）

## 対象スコープ

- `infra/terraform/` 配下のTerraformコード

---

## ステップ 0: 要件定義と設計方針の確認

**読むもの:**

- `guardrails/policy/infra/terraform/` - Terraformポリシー

---

## ステップ 1: 実装

**ポリシー:** `guardrails/policy/infra/terraform/`

**実装先:** `infra/terraform/`

**完了条件:** 静的解析パス、定性レビューパス、コミット

---

## ステップ 2: デプロイ

### 差分確認（Plan）

```
mcp__guardrails__procedure_deploy_dev(
  action='diff',
  useBranchEnv=true
)
```

### 適用（Apply）

```
mcp__guardrails__procedure_deploy_dev(
  action='deploy',
  useBranchEnv=true,
  target='all'
)
```

### 削除（Destroy）

依存関係の確認のため、destroyも実行して正常に削除できることを確認する:

```
mcp__guardrails__procedure_deploy_dev(
  action='destroy',
  useBranchEnv=true
)
```

**完了条件:** Plan成功、Apply成功、Destroy成功

---

## ステップ 3: 最終検証

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='all'
)
mcp__guardrails__procedure_fix(workspace='infra')
```

今回実装した箇所に関わる全ての観点で定性レビューを実施する（並列実行可能）。

**完了条件:** 全レビューパス

---

## ステップ 4: フェーズ完了チェックポイント

このフェーズで得られた知見を踏まえ、後続タスクの計画を見直す。

**確認すること:**

1. インフラ変更がE2Eテストに与える影響
2. 環境固有の設定変更
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

- 静的解析（format, lint, security）通過
- ポリシーレビュー通過
- Plan で意図した変更のみ表示
- Apply 成功
- Destroy 成功
