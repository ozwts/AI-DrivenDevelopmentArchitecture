# 環境設計

## 核心原則

環境は**独立したエントリーポイントで完全分離**され、構造は統一し、差異は**パラメータのみ**で表現する。

## 実施すること

1. **tfstate分離**: 環境ごとに独立したバックエンド
2. **構造の統一**: 全環境で同一のモジュール構成
3. **パラメータで差異表現**: 保護設定・スケールのみ変数で調整
4. **ブランチ環境**: 開発環境で並行デプロイを実現

## 実施しないこと

1. **モジュール内での環境判定** → エントリーポイントで変数化
2. **環境固有のモジュール** → 全環境で同一構成を維持

## ディレクトリ構造

```
environments/
└── {env}/
    ├── main.tf         # モジュール呼び出し
    ├── variables.tf    # 環境パラメータ
    ├── providers.tf    # バックエンド設定
    └── .trivyignore    # 環境固有の例外
```

## ブランチ環境

開発環境で複数AIの並行デプロイを実現：

```hcl
variable "branch_suffix" {
  description = "ブランチ環境用サフィックス（空の場合は共有環境）"
  type        = string
  default     = ""
}

locals {
  resource_prefix = "${var.project}${var.branch_suffix != "" ? "-${var.branch_suffix}" : ""}"
}
```

- tfstate: `terraform/{env}-{suffix}.tfstate`として分離
- リソース名: `{prefix}-{identifier}-{suffix}`形式

## Do / Don't

### Good: 構造を統一し、パラメータで差異を表現

```hcl
# dev環境
module "db" {
  source              = "../../modules/aws/db"
  deletion_protection = false  # 開発: ライフサイクル制御優先
}

# prd環境
module "db" {
  source              = "../../modules/aws/db"
  deletion_protection = true   # 本番: データ保護優先
}
```

### Bad: モジュール内で環境判定

```hcl
resource "aws_dynamodb_table" "main" {
  deletion_protection_enabled = var.env == "prd" ? true : false
}
```

**理由**: 環境判定ロジックがモジュール内に絡み合い、構造の単純さが失われる。

### Good: 環境間の差分がないように維持

```hcl
# dev/main.tf に新しいモジュールを追加したら
module "new_feature" {
  source = "../../modules/aws/new-feature"
}

# stg/main.tf, prd/main.tf にも同時に追加
module "new_feature" {
  source = "../../modules/aws/new-feature"
}
```

### Bad: 一部の環境だけに変更を適用

```hcl
# dev/main.tf にのみ追加し、stg/prdへの反映を忘れる
module "new_feature" { ... }
```

**理由**: 環境間で構造が乖離すると、上位環境へのデプロイ時に予期せぬ差分が発生する。

**注**: 環境自体が未構築（`.gitkeep`のみ）の場合、整合性チェックはスキップする。
