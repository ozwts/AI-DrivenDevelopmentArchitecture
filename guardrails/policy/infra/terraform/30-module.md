# モジュール設計

## 核心原則

モジュールは**再利用可能な単位**であり、**パラメータで環境差異を吸収**し、環境に依存しない。

## 実施すること

1. **パラメータ化**: 環境差異は変数で制御
2. **安全なデフォルト**: 保護系は`true`をデフォルト
3. **description必須**: 全変数・出力に説明を付与

## 実施しないこと

1. **ハードコード** → 変数で制御可能にする
2. **環境判定ロジック** → 環境エントリーポイントでパラメータ化

## ディレクトリ構造

```
modules/
└── {provider}/{resource}/
    ├── main.tf         # リソース定義
    ├── variables.tf    # 変数定義
    └── outputs.tf      # 出力定義
```

## Do / Don't

### Good: パラメータで制御

```hcl
variable "deletion_protection" {
  description = "削除保護を有効にするか"
  type        = bool
  default     = true  # 安全側をデフォルト
}

resource "aws_dynamodb_table" "main" {
  name                        = var.table_name
  deletion_protection_enabled = var.deletion_protection
}
```

### Bad: ハードコード

```hcl
resource "aws_dynamodb_table" "main" {
  name                        = "my-table"
  deletion_protection_enabled = false
}
```

**理由**: 再利用性がなく、環境ごとの制御が不可能。
