# Terraform Infrastructure

このディレクトリには、ハンズオン用のAWSインフラをTerraformで管理するための設定が含まれています。

## ディレクトリ構成

```
infra/
├── package.json          # npm scriptsでTerraformコマンドを管理
└── terraform/
    ├── environments/     # 環境別の設定
    │   └── dev/         # 開発環境
    │       ├── main.tf      # メインの設定（S3 + CloudFront）
    │       ├── tables.tf    # DynamoDBテーブル定義
    │       └── outputs.tf   # 出力値
    └── modules/         # 再利用可能なモジュール
        └── aws/
            ├── db/          # DynamoDBモジュール
            └── static-site/ # 静的サイトホスティングモジュール
```

## 初期セットアップ

### 1. AWS認証情報の設定

```bash
# プロジェクトルートから実行
# MFA認証でセッショントークンを取得
source devtools/get-aws-session-token.sh <プロファイル名> <MFAデバイスARN> <MFAコード>

# 認証情報の確認
aws sts get-caller-identity
```

### 2. Terraform初期化

```bash
# infraディレクトリに移動
cd infra

# 初期化（初回のみ）
npm run infra:config:dev
```

### 3. プロバイダーのアップグレード（必要に応じて）

```bash
# Terraform providerを最新版にアップグレード
npm run infra:upgrade:dev
```

## リソースのデプロイ

**重要**: すべてのコマンドは `infra/` ディレクトリで実行してください。

### プレビュー（差分確認）

```bash
npm run infra:diff:dev
```

### デプロイ

```bash
npm run infra:deploy:dev
```

このコマンドは以下を自動実行します：
1. サーバーのビルド
2. Terraformの初期化
3. インフラのデプロイ（auto-approve）

## リソースの削除

**ハンズオン環境の特別な設定**

このハンズオン環境では、`npm run infra:destroy:dev`でリソースを完全に削除できるように以下の設定をしています：

### DynamoDBテーブル

- **削除保護: 無効** (`deletion_protection_enabled = false`)
  - 通常の本番環境では有効にすべきですが、ハンズオンでは学習目的のため無効化
- **ポイントインタイムリカバリ: 無効** (`point_in_time_recovery = false`)
  - バックアップが不要なため無効化してコスト削減

### S3バケット

- **強制削除: 有効** (`force_destroy = true`)
  - バケット内にオブジェクトがあっても削除可能
  - 通常の本番環境では`false`にしてデータ保護すべき

### リソースの削除コマンド

```bash
# infraディレクトリで実行
cd infra

# 削除プレビュー
npm run infra:diff:destroy:dev

# 削除実行
npm run infra:destroy:dev
```

**注意**: `npm run infra:destroy:dev`を実行すると、以下のリソースが完全に削除されます：
- DynamoDBテーブル（projectsテーブル、todosテーブル、データも含めて）
- S3バケット（アップロード済みファイルも含めて）
- CloudFront Distribution
- CloudFront OAC（Origin Access Control）
- その他関連リソース

## 主要なリソース

### 静的サイトホスティング

- **S3バケット**: フロントエンドのビルド成果物を格納
- **CloudFront**: グローバルCDNで配信、Basic認証付き
- **OAC**: S3へのアクセス制御

### DynamoDB

- **projectsテーブル**: プロジェクト情報
  - Hash Key: `projectId`
  - GSI: `OwnerIdIndex` (ownerId + createdAt)
- **todosテーブル**: TODO情報
  - Hash Key: `projectId`、Range Key: `todoId`
  - GSI: `StatusIndex` (projectId + status)
  - GSI: `AssigneeIndex` (assigneeId + createdAt)

## 出力値の確認

デプロイ後に、作成されたリソースの情報を確認できます。

```bash
# すべての出力値を表示
npm run infra:output:dev

# 特定の出力値のみ（生のterraformコマンドを使用）
cd terraform/environments/dev
terraform output static_site_url
terraform output cloudfront_distribution_id
```

### 主な出力値

- `static_site_url`: CloudFrontのURL（Basic認証でアクセス）
- `cloudfront_distribution_id`: CloudFront DistributionのID
- `s3_bucket_name`: S3バケット名
- `projects_table_name`: projectsテーブル名
- `todos_table_name`: todosテーブル名

## npm scripts一覧

| コマンド | 説明 |
|---------|------|
| `npm run infra:config:dev` | Terraformの初期化（初回のみ） |
| `npm run infra:upgrade:dev` | Terraform providerのアップグレード |
| `npm run infra:diff:dev` | デプロイ前の差分確認 |
| `npm run infra:deploy:dev` | インフラのデプロイ（ビルド＋初期化＋適用） |
| `npm run infra:diff:destroy:dev` | 削除前の差分確認 |
| `npm run infra:destroy:dev` | インフラの削除 |
| `npm run infra:output:dev` | 出力値の確認 |
| `npm run validate` | 全バリデーション（フォーマット + terraform validate + TFLint + Trivy） |
| `npm run fix` | Terraformコードの自動フォーマット |

## トラブルシューティング

### S3バケットが削除できない

通常、S3バケット内にオブジェクトがあると削除できませんが、このハンズオン環境では`force_destroy = true`により自動的に削除されます。

それでもエラーが出る場合は、手動で削除：

```bash
# バケット名を取得
cd infra
BUCKET_NAME=$(npm run infra:output:dev --silent | grep s3_bucket_name | awk '{print $3}' | tr -d '"')

# バケット内を空にする
aws s3 rm s3://${BUCKET_NAME} --recursive

# 再度destroy実行
npm run infra:destroy:dev
```

### DynamoDBテーブルが削除できない

削除保護が有効な場合は削除できませんが、このハンズオン環境では`deletion_protection_enabled = false`により削除可能です。

### CloudFront Distributionの削除に時間がかかる

CloudFrontの削除には通常5-10分程度かかります。これは正常な動作です。

### Terraform初期化エラー

プロバイダーのバージョン問題などで初期化に失敗する場合：

```bash
# プロバイダーをアップグレード
npm run infra:upgrade:dev

# 初期化をやり直し
npm run infra:config:dev
```

## 本番環境への移行時の注意

このハンズオン環境の設定を本番環境で使用する場合は、以下の変更が**必須**です：

### terraform/environments/dev/tables.tf

```hcl
module "dynamodb_tables" {
  # ...
  deletion_protection_enabled = true  # 削除保護を有効化
  point_in_time_recovery      = true  # バックアップを有効化
}
```

### terraform/environments/dev/main.tf

```hcl
module "static_site" {
  # ...
  force_destroy = false  # S3バケットの誤削除を防止

  # Basic認証（本番ではより強固な認証を推奨）
  enable_basic_auth   = false  # または環境変数から強力なパスワードを取得
  basic_auth_username = var.basic_auth_username  # 環境変数化を推奨
  basic_auth_password = var.basic_auth_password  # 環境変数化を推奨
}
```

### その他のセキュリティ考慮事項

- CloudFrontにカスタムドメインとSSL証明書を設定
- WAF（Web Application Firewall）の導入を検討
- DynamoDBの暗号化キーをKMSで管理
- S3バケットのバージョニング有効化
- CloudWatchによる監視とアラート設定
- IAMロールとポリシーの最小権限化

## 参考リンク

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [AWS CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
