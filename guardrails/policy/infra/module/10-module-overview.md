# モジュール設計概要

## 核心原則

モジュールは**単一責務**で**再利用可能**な単位であり、**変数・出力インターフェース**で環境と疎結合する。

## 技術スタック

- **Terraform Module**: 再利用可能なリソース定義
- **TFLint**: `terraform_standard_module_structure` ルールで構造を強制

## ポリシー構成

| ファイル | 責務 |
|----------|------|
| `10-module-overview.md` | モジュール設計、変数・出力 |

## 全体構造

```
modules/
└── {provider}/
    └── {resource}/
        ├── main.tf         # リソース定義
        ├── variables.tf    # 変数定義（description必須）
        └── outputs.tf      # 出力定義（description必須）
```

## 命名規則

| 対象 | パターン | 例 |
|------|----------|-----|
| モジュールディレクトリ | `{provider}/{resource}` | `aws/db`, `aws/auth` |
| 変数名 | `snake_case` | `deletion_protection` |
| 出力名 | `snake_case` | `table_name`, `user_pool_id` |

## 変数設計原則

| 原則 | 説明 | 例 |
|-----|------|-----|
| 安全なデフォルト | 保護系は `true` をデフォルト | `default = true` |
| description必須 | 全変数に説明を付与 | TFLintで強制 |
| 日本語で記述 | `description`、`error_message` は日本語 | チーム共通言語 |
| 型明示 | `type` を必ず指定 | `type = bool` |

## Do / Don't

### ✅ Good: パラメータで制御可能

```hcl
variable "deletion_protection" {
  description = "削除保護を有効にするか"
  type        = bool
  default     = true  # 安全側をデフォルト
}

resource "aws_dynamodb_table" "main" {
  name                        = "${var.project_name}-${var.identifier}-table"
  deletion_protection_enabled = var.deletion_protection
}
```

### ❌ Bad: ハードコード

```hcl
resource "aws_dynamodb_table" "main" {
  name                        = "my-app-table"  # ❌ ハードコード
  deletion_protection_enabled = false           # ❌ 常に無効
}
```

**理由**: 再利用性がなく、環境ごとの設定変更が不可能。

## 関連ドキュメント

- `../environment/10-environment-overview.md`: 環境設計
- `../protection/10-protection-overview.md`: 保護戦略
