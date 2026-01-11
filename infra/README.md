# Infra - インフラストラクチャ

TerraformによるAWSインフラの管理（IaC）。

## 技術スタック

- **IaC**: Terraform 1.11.3
- **Provider**: AWS Provider 6.20
- **State**: S3バックエンド
- **Region**: ap-northeast-1 (東京)
- **Linter**: TFLint 0.60.0 + AWS Plugin
- **Security Scanner**: Trivy 0.68.2

## ディレクトリ構成

```
infra/
├── package.json
├── README.md
└── terraform/
    ├── .tflint.hcl           # TFLint設定
    ├── trivy.yaml            # Trivyセキュリティスキャン設定
    ├── policies/             # Trivyカスタムポリシー（Rego）
    │   ├── cognito_deletion_protection.rego
    │   ├── dynamodb_deletion_protection.rego
    │   └── s3_force_destroy.rego
    ├── modules/aws/          # 再利用可能なモジュール
    │   ├── auth/             # Cognito
    │   ├── db/               # DynamoDB tables
    │   ├── parameter/        # SSM Parameter Store
    │   ├── server/           # Lambda + API Gateway + IAM
    │   ├── static-site/      # S3 + CloudFront
    │   └── storage/          # S3 buckets
    └── environments/         # 環境エントリーポイント
        ├── dev/              # 開発環境
        │   ├── main.tf
        │   ├── variables.tf
        │   ├── providers.tf
        │   ├── outputs.tf
        │   ├── data.tf
        │   └── .trivyignore  # 環境固有の例外
        ├── stg/              # 検証環境（.gitkeepのみ）
        └── prd/              # 本番環境（.gitkeepのみ）
```

## AWSリソース構成

```
CloudFront
    │
    ├─→ S3 (Web Frontend)
    │
    └─→ API Gateway (HTTP API)
            │
            └─→ Lambda (Node.js 22)
                    │
                    ├─→ DynamoDB
                    ├─→ S3 (Storage)
                    └─→ Cognito
```

## コマンド

以下のコマンドは`infra/`ディレクトリ内で実行する。

```bash
cd infra
```

### バリデーション

```bash
# 開発環境のバリデーション（format + lint + security）
npm run validate:dev

# 全環境
npm run validate:all

# フォーマット修正
npm run fix
```

### ブランチ環境デプロイ（デフォルト）

ブランチ名のハッシュでリソースを分離し、並行開発を実現：

```bash
# プラン確認
npm run diff:branch:dev

# デプロイ
npm run deploy:branch:dev

# 部分デプロイ
npm run deploy:branch:api:dev
npm run deploy:branch:web:dev

# 削除
npm run destroy:branch:dev
```

### 共有環境デプロイ

```bash
# プラン確認
npm run diff:dev

# デプロイ
npm run deploy:dev

# 部分デプロイ
npm run deploy:api:dev   # API + DB
npm run deploy:web:dev   # Web

# 削除
npm run destroy:dev
```

### Lint（TFLint）

```bash
# 全環境
npm run lint

# 環境別
npm run lint:dev
npm run lint:stg
npm run lint:prd
```

### セキュリティスキャン（Trivy）

```bash
# 全環境
npm run security

# 環境別
npm run security:dev
npm run security:stg
npm run security:prd
```

## 保護戦略

### ステートフルリソースの保護

| リソース | 保護属性                      | 開発     | 本番   |
| -------- | ----------------------------- | -------- | ------ |
| DynamoDB | `deletion_protection_enabled` | false    | true   |
| S3       | `force_destroy`               | true     | false  |
| Cognito  | `deletion_protection`         | INACTIVE | ACTIVE |

### カスタムポリシー

`terraform/policies/`にRegoポリシーを配置。保護が無効なリソースはTrivyで検出される。

### 環境別trivyignore

開発環境は`environments/dev/.trivyignore`で保護を緩和。本番環境は緩和不可。

## デプロイ手順

### 前提条件

1. AWSアカウント
2. IAMユーザー（AdministratorAccess権限）
3. AWS CLI設定済み

### 1. ビルド＆デプロイ

```bash
# 差分確認
npm run diff:dev

# デプロイ
npm run deploy:dev
```

デプロイ成功後、以下が出力される：

```
Outputs:

api_endpoint = "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com"
cloudfront_url = "https://xxxxx.cloudfront.net"
```

## Terraformモジュール

### Auth モジュール (`auth/`)

Cognito User Pool管理：

- User Pool設定
- App Client
- 認証フロー

### DB モジュール (`db/`)

DynamoDBテーブル管理：

- テーブル定義
- GSI設定
- 削除保護

### Parameter モジュール (`parameter/`)

SSM Parameter Store管理：

- 設定値の保存
- 環境変数の管理

### Server モジュール (`server/`)

Lambda + API Gateway + IAM管理：

- Lambda関数（Node.js 22.x）
- HTTP API Gateway
- Lambda実行ロール
- DynamoDB/S3/Cognitoアクセス権限

### Static Site モジュール (`static-site/`)

S3 + CloudFront管理：

- S3バケット
- CloudFront distribution
- Basic認証
- セキュリティヘッダー

### Storage モジュール (`storage/`)

S3バケット管理：

- ファイルストレージ
- 削除保護設定

## トラブルシューティング

### Terraformステートエラー

```bash
# 再初期化
npm run config:dev

# 強制再初期化（プロバイダーアップグレード）
npm run config:upgrade:dev
```
