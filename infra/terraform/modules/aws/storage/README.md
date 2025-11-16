# AWS S3ストレージモジュール

このモジュールは、シンプルなS3バケットを作成し管理します。B2ストレージモジュールと同様のシンプルさを目指しています。

## 機能

- 単一S3バケットの作成と管理
- サーバーサイド暗号化（AES-256）
- オプションのバージョニング
- オプションのライフサイクルポリシー
- オプションのCORS設定

## 使用方法

```hcl
module "upload_storage" {
  source = "../../aws/storage"

  environment        = "dev"
  env                = "dev"
  aws_project_prefix = "myproject"

  # バケット設定
  bucket_name        = "myproject-upload-bucket"
  bucket_purpose     = "upload"

  # オプション機能
  enable_versioning  = false
  enable_lifecycle   = true
  expiration_days    = 30
  enable_cors        = true
  cors_allowed_origins = ["https://example.com"]
}
```

## 入力変数

| 名前                 | 説明                                 | タイプ       | デフォルト | 必須   |
| -------------------- | ------------------------------------ | ------------ | ---------- | ------ |
| environment          | 環境名 (dev/stg/prd)                 | string       | "dev"      | いいえ |
| env                  | 環境の短縮名 (dev/stg/prd)           | string       | -          | はい   |
| aws_project_prefix   | プロジェクトのプレフィックス         | string       | "aniswipe" | いいえ |
| bucket_name          | S3バケット名                         | string       | null       | いいえ |
| bucket_purpose       | バケットの用途                       | string       | "storage"  | いいえ |
| enable_versioning    | バージョニングを有効にするか         | bool         | false      | いいえ |
| enable_lifecycle     | ライフサイクルポリシーを有効にするか | bool         | false      | いいえ |
| expiration_days      | ファイルの有効期限（日数）           | number       | 7          | いいえ |
| enable_cors          | CORSを有効にするか                   | bool         | false      | いいえ |
| cors_allowed_origins | CORSで許可するオリジン               | list(string) | ["*"]      | いいえ |

## 出力変数

| 名前               | 説明                   |
| ------------------ | ---------------------- |
| bucket_id          | S3バケットのID         |
| bucket_arn         | S3バケットのARN        |
| bucket_name        | S3バケットの名前       |
| bucket_domain_name | S3バケットのドメイン名 |
| bucket_region      | S3バケットのリージョン |
