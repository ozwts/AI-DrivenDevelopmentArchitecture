# Infra - インフラストラクチャ

TerraformによるAWSインフラの管理（IaC）。

## 技術スタック

- **IaC**: Terraform 1.11.3
- **Provider**: AWS Provider 5.82
- **State**: S3バックエンド
- **Region**: ap-northeast-1 (東京)
- **Linter**: TFLint 0.60.0 + AWS Plugin 0.44.0
- **Security Scanner**: Trivy 0.58.2

## ディレクトリ構成

```
infra/
├── .tflint.hcl              # TFLint設定（最も厳格なルール）
├── .trivyignore             # Trivy無視設定
├── trivy.yaml               # Trivyセキュリティスキャン設定
├── package.json
├── README.md
└── terraform/
    ├── modules/aws/         # 再利用可能なモジュール
    │   ├── auth/            # Cognito
    │   ├── db/              # DynamoDB tables
    │   ├── parameter/       # SSM Parameter Store
    │   ├── server/          # Lambda + API Gateway + IAM
    │   ├── static-site/     # S3 + CloudFront
    │   └── storage/         # S3 buckets
    │
    └── environments/        # 環境別設定（dev, stg, prd）
        └── dev/             # 開発環境の設定
```

## AWSリソース構成

### アーキテクチャ図

```
CloudFront
    │
    ├─→ S3 (Web Frontend)
    │
    └─→ API Gateway (HTTP API)
            │
            └─→ Lambda (Node.js 22)
                    │
                    └─→ DynamoDB
```

### リソース一覧

- **S3**: 静的Webサイトホスティング（React build）
- **CloudFront**: CDN、S3とAPI Gatewayを統合
- **API Gateway**: HTTP API（REST APIではない）
- **Lambda**: Node.js 22.x runtime、esbuildでバンドル
- **DynamoDB**: TODOテーブル、Pay-per-request billing
- **IAM Role**: Lambda実行ロール

## コマンド

### 初期化

```bash
# Terraform初期化（初回、またはモジュール変更後）
npm run init:dev

# または直接Terraformコマンド
cd terraform/environments/dev
terraform init
```

### デプロイ

```bash
# デプロイプラン確認
npm run diff:dev

# デプロイ実行
npm run deploy:dev

# API + DBデプロイ（Lambda、API Gateway、DynamoDB）
npm run deploy:api:dev
```

### 削除

```bash
# インフラ削除（注意: データも削除されます）
npm run destroy:dev
```

### バリデーション

```bash
# dev環境のバリデーション（デフォルト）
npm run validate

# 環境別
npm run validate:dev
npm run validate:stg
npm run validate:prd

# 全環境（CI用）
npm run validate:all

# フォーマット修正
npm run fix
```

### Lint（TFLint）

```bash
# TFLintによる静的解析（全環境）
npm run lint

# 環境別
npm run lint:dev
npm run lint:stg
npm run lint:prd

# モジュールのみ
npm run lint:modules
```

**TFLint設定（`.tflint.hcl`）:**
- `preset = "all"`: 全ルール有効化（最も厳格）
- `deep_check = true`: AWSリソースの実際の値を検証
- AWS Plugin: 700+ ルールで設定ミスを検出

### セキュリティスキャン（Trivy）

```bash
# セキュリティスキャン（CRITICAL/HIGH/MEDIUM）
npm run security

# 全重要度でスキャン（LOWも含む）
npm run security:full
```

**Trivy設定（`trivy.yaml`）:**
- 設定ミス検出（misconfiguration）
- シークレット検出（secret）
- 重要度: CRITICAL, HIGH, MEDIUM

**無視設定（`.trivyignore`）:**
ハンズオン環境で意図的に無効化している設定を記載

## デプロイ手順

### 前提条件

1. AWSアカウント
2. IAMユーザー（AdministratorAccess権限）
3. MFAデバイス設定
4. AWS CLI設定

### 1. AWS認証設定

#### IAMユーザー作成

1. AWSマネジメントコンソール → IAM
2. ユーザー作成（例: `hands-on-deployer`）
3. アクセスキー取得
4. MFAデバイス設定

#### AWS CLI設定

```bash
# プロファイル設定
aws configure --profile hands-on

# 入力内容:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-1
# Default output format: json
```

#### MFA認証トークン取得

```bash
# スクリプトに実行権限付与（初回のみ）
chmod +x ../devtools/get-aws-session-token.sh

# MFAトークン取得（12時間有効）
source ../devtools/get-aws-session-token.sh hands-on <MFA_ARN> <MFA_CODE>
#      ^^^^^^ 重要: source コマンドを使用

# 成功すると環境変数が設定される:
# AWS_ACCESS_KEY_ID=ASIA...
# AWS_SECRET_ACCESS_KEY=...
# AWS_SESSION_TOKEN=...
```

**MFA ARN例**: `arn:aws:iam::123456789012:mfa/hands-on-deployer`

### 2. ビルド

デプロイ前に、サーバーとWebをビルド：

```bash
# サーバービルド（Lambda用）
cd ..
npm run api:build -w server

# Webビルド（S3用）
npm run build -w web

cd infra
```

### 3. 初期化（初回のみ）

```bash
npm run init:dev
```

### 4. デプロイ実行

```bash
# プラン確認
npm run diff:dev

# デプロイ
npm run deploy:dev
```

### 5. 出力の確認

デプロイ成功後、以下の情報が表示されます：

```
Outputs:

api_endpoint = "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com"
cloudfront_url = "https://xxxxx.cloudfront.net"
todos_table_name = "hands-on-<identifier>-todos"
```

**重要**: `api_endpoint` の値を `web/src/config.dev.ts` に設定してください。

### 6. フロントエンド設定

```typescript
// web/src/config.dev.ts
export const config: Config = {
  apiUrl: "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com",
};
```

### 7. フロントエンド再デプロイ

```bash
# Webをリビルド
cd ..
npm run build -w web

# 再デプロイ
npm run deploy -w infra
```

### 8. 動作確認

CloudFront URLでアプリケーションにアクセス：

```
https://xxxxx.cloudfront.net
```

## Terraformモジュール

### DB モジュール (`db/`)

DynamoDBテーブルを管理：

- TODOテーブル（Pay-per-request billing）
- GSI（StatusIndex）設定
- 属性定義とキースキーマ

### Server モジュール (`server/`)

Lambda + API Gateway + IAMを管理：

- Lambda関数（Node.js 22.x、esbuildバンドル）
- HTTP API Gateway
- Lambda実行ロール
- DynamoDBアクセス権限

### Static Site モジュール (`static-site/`)

S3 + CloudFrontを管理：

- S3バケット（Reactビルド配置）
- CloudFront distribution
- Basic認証設定
- セキュリティヘッダー
- キャッシュポリシー

## トラブルシューティング

### MFA認証エラー

```bash
# エラー: AccessDenied when calling GetSessionToken
```

**原因と対処**:
- MFAコードが間違っている → 認証アプリから最新コード取得
- MFA ARNが間違っている → IAMコンソールで確認
- 時刻がずれている → PCの時刻を同期

### セッショントークン期限切れ

```bash
# エラー: The security token included in the request is expired
```

**対処**: MFA認証を再実行

```bash
source ../devtools/get-aws-session-token.sh hands-on <MFA_ARN> <MFA_CODE>
```

### Terraformステートエラー

```bash
# ステートを確認
npm run diff:dev

# ステートをリセット（注意: リソースは削除されない）
rm -rf terraform/.terraform terraform/.terraform.lock.hcl
npm run init:dev
```

### Lambda関数が見つからない

```bash
# Lambdaビルドを確認
ls -lh ../server/dist/lambda-handler.zip

# 再ビルド
cd ..
npm run api:build -w server
cd infra

# 再デプロイ
npm run deploy:dev
```

### DynamoDBテーブルが作成されない

```bash
# Terraformプランを確認
npm run diff:dev

# モジュールを確認
cat terraform/modules/aws/db/tables.tf
```

### CloudFrontキャッシュの問題

```bash
# CloudFront invalidation作成
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## ベストプラクティス

### 1. ステート管理

**現在**: ローカル `.tfstate` ファイル

**本番推奨**: S3バックエンド + DynamoDB ロック

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-bucket"
    key            = "hands-on/dev/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### 2. 環境分離

```
environments/
  ├── dev/        # 開発環境
  ├── stg/        # ステージング環境
  └── prd/        # 本番環境
```

### 3. 変数管理

機密情報は環境変数またはAWS Secrets Managerを使用：

```hcl
variable "db_password" {
  sensitive = true
}
```

### 4. タグ付け

すべてのリソースに適切なタグを付与：

```hcl
tags = {
  Environment = "dev"
  Project     = "hands-on"
  ManagedBy   = "Terraform"
}
```

## 参考資料

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [API Gateway](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [CloudFront](https://docs.aws.amazon.com/cloudfront/)
