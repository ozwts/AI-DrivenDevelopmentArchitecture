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

- `10-terraform-overview.md` - 全体方針
- `20-environment.md` - 環境分離
- `30-module.md` - モジュール設計
- `40-protection.md` - 保護戦略
- `50-validation.md` - 検証パイプライン

**実装先:** `infra/terraform/`

→ ポリシーに則って実装

---

## ステップ 2: 静的解析

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='all'
)
```

---

## ステップ 3: ポリシーレビュー

```
mcp__guardrails__review_qualitative(
  policyId='infra/terraform',
  targetDirectories=['infra/terraform/']
)
```

---

## ステップ 4: 自動修正

```
mcp__guardrails__procedure_fix(workspace='infra')
```

---

## ステップ 5: デプロイ

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

---

## 完了条件

- 静的解析（format, lint, security）を通過
- ポリシーレビューを通過
- Plan で意図した変更のみ表示
- Apply が成功
- Destroy が成功
