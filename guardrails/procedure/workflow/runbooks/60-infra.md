# インフラ変更（Terraform）

Terraformによるインフラストラクチャ変更のワークフロー。

## 対象

- `infra/terraform/` 配下のTerraformコード
- AWS リソース（DynamoDB, Lambda, API Gateway, S3, CloudFront, Cognito）

---

## 変更が必要なケース

| 変更内容 | 対象ファイル |
|---------|-------------|
| DynamoDBテーブル追加・変更 | `modules/aws/db/tables.tf` |
| Lambda設定変更 | `modules/aws/server/lambda.tf` |
| API Gateway設定 | `modules/aws/server/api-gateway.tf` |
| S3バケット設定 | `modules/aws/static-site/`, `modules/aws/attachments/` |
| Cognito設定 | `modules/aws/auth/` |
| 環境変数追加 | `modules/aws/params/` |

---

## DynamoDBスキーマ変更

### 作業手順

1. **テスト用スキーマ更新**: `server/src/util/testing-util/dynamodb.ts`
2. **テスト実行**: `mcp__guardrails__procedure_test(target='server')`
3. **Terraformスキーマ更新**: `infra/terraform/modules/aws/db/tables.tf`

### 同期の確認ポイント

- テーブル名が一致
- 属性名が一致
- GSI名が一致
- キースキーマが一致

---

## 静的解析

### フォーマットチェック

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='format'
)
```

### Lintチェック

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='lint'
)
```

### セキュリティスキャン

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='security'
)
```

### 全チェック

```
mcp__guardrails__review_infra_static_analysis(
  targetDirectory='infra/terraform/environments/dev',
  analysisType='all'
)
```

---

## ポリシーレビュー

```
mcp__guardrails__review_qualitative(
  policyId='infra/terraform',
  targetDirectories=['infra/terraform/']
)
```

---

## 自動修正

```
mcp__guardrails__procedure_fix(workspace='infra')
```

- `terraform fmt` を実行

---

## デプロイ

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

### ターゲット選択

| target | 内容 |
|--------|------|
| `all` | 全リソース（インフラ変更時） |
| `api` | Lambda, DynamoDB, 環境変数値 |
| `web` | S3, CloudFront, フロントエンド |

---

## 注意事項

### 破壊的変更

以下は慎重に:

- テーブル名の変更（データ消失）
- GSIの削除（クエリ不可）
- Cognito設定変更（認証影響）

### dev環境の設定

dev環境は以下が無効化されている:

- DynamoDB削除保護
- PITR（ポイントインタイムリカバリ）
- S3バージョニング

本番環境では有効化すること。

---

## 完了条件

- 静的解析（format, lint, security）を通過
- ポリシーレビューを通過
- Plan で意図した変更のみ表示
- Apply が成功
