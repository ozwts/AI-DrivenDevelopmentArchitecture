# 保護戦略概要

## 核心原則

ステートフルリソース（データを保持するリソース）は**本番環境で削除保護**され、**Trivy カスタムポリシー（Rego）**で強制する。

## 技術スタック

- **Trivy**: セキュリティスキャン
- **Rego**: カスタムポリシー言語（`terraform-raw` スキーマ）
- **.trivyignore**: 環境別の例外設定

## ポリシー構成

| ファイル | 責務 |
|----------|------|
| `10-protection-overview.md` | 保護戦略、カスタムポリシー |

## ステートフルリソース

| リソース種別 | 保護属性 | 保護値 |
|-------------|---------|--------|
| データベース | `deletion_protection_enabled` | `true` |
| ストレージ | `force_destroy` | `false` |
| 認証基盤 | `deletion_protection` | `"ACTIVE"` |

## 環境別ポリシー

| 環境 | カスタムポリシー | 理由 |
|-----|-----------------|------|
| dev | ignore | 開発効率優先、頻繁な作り直し |
| stg | 強制 | 本番相当の検証 |
| prd | 強制 | データ保護最優先 |

## カスタムポリシー実装

```rego
# METADATA
# title: {Resource} protection must be enabled
# schemas:
#   - input: schema["terraform-raw"]
# custom:
#   id: CUSTOM-AWS-XXXX
#   severity: HIGH
package custom.{resource}.protection

import rego.v1

deny contains res if {
    some block in input.modules[_].blocks
    block.kind == "resource"
    block.type == "{aws_resource_type}"
    attr := block.attributes.{protection_attribute}
    attr.value == {unprotected_value}
    res := result.new("{error_message}", attr)
}
```

## Do / Don't

### ✅ Good: 環境別の保護設定

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

### ❌ Bad: 本番環境で保護なし

```hcl
# prd環境
module "db" {
  source              = "../../modules/aws/db"
  deletion_protection = false  # ❌ 本番でデータ損失リスク
}
```

**理由**: 本番データの誤削除は復旧不可能。カスタムポリシーで検出・ブロックする。

## 関連ドキュメント

- `../validation/10-validation-overview.md`: 検証戦略
- `../environment/10-environment-overview.md`: 環境設計
