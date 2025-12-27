# 保護戦略

## 核心原則

ステートフルリソースは**Trivyカスタムポリシーで保護を強制**し、例外は**CODEOWNERSによるレビュー**で統制する。

## 実施すること

1. **カスタムポリシー**: ステートフルリソースの保護をRegoで定義
2. **環境別trivyignore**: 開発環境のみ保護を緩和
3. **CODEOWNERSレビュー**: trivyignore変更は人間のレビュー必須

## 実施しないこと

1. **本番環境での保護無効化** → カスタムポリシーでブロック
2. **trivyignoreへの無断追加** → CODEOWNERSで強制レビュー

## ステートフルリソースの保護

| リソース | 保護属性 | 開発 | 本番 |
|---------|---------|-----|------|
| DynamoDB | `deletion_protection_enabled` | false | true |
| S3 | `force_destroy` | true | false |
| Cognito | `deletion_protection` | INACTIVE | ACTIVE |

## カスタムポリシー

```rego
# METADATA
# custom:
#   id: CUSTOM-AWS-0001
#   severity: HIGH
package custom.dynamodb.deletion_protection

deny contains res if {
    block.type == "aws_dynamodb_table"
    block.attributes.deletion_protection_enabled.value == false
    res := result.new("Deletion protection must be enabled", block)
}
```

## trivyignore

```
# 開発環境: ライフサイクル制御のため保護を緩和
# CODEOWNERSによるレビュー必須

CUSTOM-AWS-0001  # DynamoDB削除保護
CUSTOM-AWS-0002  # S3 force_destroy
```

## Do / Don't

### Good: 環境別の保護設定

```hcl
# 開発: ライフサイクル制御優先
deletion_protection = false

# 本番: データ保護優先
deletion_protection = true
```

### Bad: 本番で保護なし

```hcl
# prd環境
deletion_protection = false
```

**理由**: 本番データの誤削除は復旧不可能。カスタムポリシーでブロックする。
