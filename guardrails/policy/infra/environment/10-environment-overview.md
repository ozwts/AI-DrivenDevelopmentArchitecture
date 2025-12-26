# 環境設計概要

## 核心原則

環境（dev/stg/prd）は**エントリーポイントで完全分離**され、差異は**パラメータのみ**で表現する。モジュール内での環境判定は禁止。

## 技術スタック

- **Terraform**: Infrastructure as Code
- **tfstate分離**: 環境ごとに独立したステート管理

## ポリシー構成

| ファイル | 責務 |
|----------|------|
| `10-environment-overview.md` | 環境分離、パラメータ制御 |

## 全体構造

```
environments/
├── dev/
│   ├── main.tf         # モジュール呼び出し
│   ├── variables.tf    # 環境固有変数
│   ├── outputs.tf      # 出力定義
│   ├── providers.tf    # プロバイダー設定
│   └── data.tf         # データソース
├── stg/
└── prd/
```

## 環境別パラメータ

| パラメータ | dev | stg | prd | 理由 |
|-----------|-----|-----|-----|------|
| `deletion_protection` | false | true | true | 開発効率 vs データ保護 |
| `point_in_time_recovery` | false | true | true | コスト vs 復旧性 |
| `force_destroy` | true | false | false | 開発効率 vs データ保護 |

## Do / Don't

### ✅ Good: パラメータで環境差異を表現

```hcl
# dev環境
module "db" {
  source              = "../../modules/aws/db"
  deletion_protection = false  # dev: 開発効率優先
}

# prd環境
module "db" {
  source              = "../../modules/aws/db"
  deletion_protection = true   # prd: データ保護必須
}
```

### ❌ Bad: モジュール内で環境判定

```hcl
resource "aws_dynamodb_table" "main" {
  # ❌ モジュール内で環境名による分岐
  deletion_protection_enabled = var.env == "prd" ? true : false
}
```

**理由**: 環境判定ロジックがモジュール内に散在し、設定の見通しが悪化する。

## 関連ドキュメント

- `../module/10-module-overview.md`: モジュール設計
- `../protection/10-protection-overview.md`: 保護戦略
