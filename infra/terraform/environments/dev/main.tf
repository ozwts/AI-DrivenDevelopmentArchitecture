##################################################
# Locals
##################################################
locals {
  # リソースプレフィックス（ブランチサフィックスがあれば付与）
  # 共有dev環境: sandbox-dev
  # 開発者環境: sandbox-dev-abc123f
  resource_prefix = join("-", compact([var.aws_project_prefix, var.branch_suffix]))

  # 実効environment（タグ用、ブランチ環境では識別子を付与）
  # compact: 空文字を除外 → join: ハイフンで結合
  effective_environment = join("-", compact([var.environment, var.branch_suffix]))

  static_site_url = "https://${module.static_site.cloudfront_domain_name}"

  # ビルド成果物ディレクトリ
  web_build_dir = "${path.module}/../../../../web/build/client"
  api_build_dir = "${path.module}/../../../../server/dist/api"

  # CORS許可オリジン
  # WARNING: 開発環境のため全オリジン許可。検証・本番環境では必ず許可するオリジンを限定すること
  # 例: cors_allowed_origins = [local.static_site_url]
  cors_allowed_origins = ["*"]

  # サーバー設定（Lambda環境変数 + SSM Parameter Store）
  server_config = merge(
    # DynamoDBテーブル名
    module.db.app_env_vars,
    # Cognito設定
    {
      COGNITO_USER_POOL_ID = module.auth.user_pool_id
      COGNITO_CLIENT_ID    = module.auth.app_client_id
    },
    # S3設定
    {
      ATTACHMENTS_BUCKET_NAME = module.attachments_bucket.bucket_name
    },
    # CORS設定（local.cors_allowed_originsを参照）
    {
      ALLOWED_ORIGINS = join(",", local.cors_allowed_origins)
    },
    # ログ設定
    {
      LOG_LEVEL = "DEBUG"
    },
    # ステージ設定
    {
      STAGE_NAME = "DEV"
    }
  )
}

##################################################
# Modules - 基盤層（依存なし）
##################################################

# DynamoDB Tables
module "db" {
  source = "../../modules/aws/db"

  environment        = local.effective_environment
  env                = var.env
  aws_project_prefix = local.resource_prefix

  deletion_protection_enabled = false # ハンズオン環境用: destroyで完全削除可能
  point_in_time_recovery      = false # ハンズオン環境用: バックアップ不要
  server_side_encryption      = true
}

# 認証（Cognito）
module "auth" {
  source = "../../modules/aws/auth"

  project_name = local.resource_prefix
  identifier   = var.env
  environment  = local.effective_environment

  # MFA設定（開発環境では無効）
  enable_mfa = false

  # 削除保護（ハンズオン環境用: destroyで完全削除可能）
  deletion_protection = false

  # トークンの有効期限
  access_token_validity_minutes = 60 # 60分
  id_token_validity_minutes     = 60 # 60分
  refresh_token_validity_days   = 30 # 30日

  # 読み取り・書き込み可能な属性
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]

  # OAuth設定（カスタムログインフォームでは不要）
  oauth_flows  = []
  oauth_scopes = []
}

# 添付ファイル用S3バケット
module "attachments_bucket" {
  source = "../../modules/aws/storage"

  environment        = local.effective_environment
  env                = var.env
  aws_project_prefix = local.resource_prefix

  # バケットの用途を指定
  bucket_purpose = "attachments"

  # CORS設定（local.cors_allowed_originsを参照）
  enable_cors          = true
  cors_allowed_origins = local.cors_allowed_origins

  # バージョニングとライフサイクル設定
  enable_versioning = false
  enable_lifecycle  = false

  # ハンズオン環境用: destroyで完全削除可能
  force_destroy = true
}

# 静的サイトホスティング（S3 + CloudFront）
module "static_site" {
  source = "../../modules/aws/static-site"

  environment        = local.effective_environment
  env                = var.env
  aws_project_prefix = local.resource_prefix

  # CloudFront設定
  cloudfront_price_class = "PriceClass_200" # アジア・ヨーロッパ・北米
  default_root_object    = "index.html"
  error_document         = "index.html" # SPAのため404もindex.htmlへ

  # セキュリティヘッダー設定（CSP connect-srcで許可するURL）
  csp_connect_src = [
    # API Gateway（ワイルドカードで循環依存を回避）
    "https://*.execute-api.${var.aws_project_region}.amazonaws.com",
    # Cognito Identity Provider（認証API）
    "https://cognito-idp.${var.aws_project_region}.amazonaws.com",
    # S3（署名付きURLによるファイルアップロード用）
    "https://*.s3.${var.aws_project_region}.amazonaws.com",
    "https://*.s3.amazonaws.com",
  ]

  # 自動デプロイ設定
  auto_deploy_enabled = true
  deploy_source_dir   = abspath(local.web_build_dir)

  # Basic認証設定
  enable_basic_auth   = false
  basic_auth_username = "admin"
  basic_auth_password = "password-change-me"

  # ハンズオン環境用: destroyで完全削除可能
  force_destroy = true # バケット内のオブジェクトも含めて削除

  tags = {
    Service = "static-site"
    Type    = "web"
  }
}

##################################################
# Modules - アプリケーション層（基盤に依存）
##################################################

# APIサーバー（Lambda + API Gateway）
module "server" {
  source = "../../modules/aws/server"

  environment        = local.effective_environment
  env                = var.env
  aws_project_prefix = local.resource_prefix

  # API設定
  api_name = "${local.resource_prefix}-api"

  # Lambda設定
  handler     = "index.handler"
  runtime     = "nodejs22.x"
  memory_size = 1770 # 2vCPUの最低リソース（1,770MB～3,008MBで2vCPU、3,009MB以上は引き上げ申請が必要）
  timeout     = 30

  # デプロイ設定
  source_dir = local.api_build_dir

  # 環境変数（local.server_configを使いまわし + Lambda専用の設定を追加）
  environment_variables = merge(
    local.server_config,
    {
      STATIC_SITE_URL = local.static_site_url
    }
  )

  # DynamoDBテーブルへのアクセス権限（すべてのテーブルに自動付与）
  dynamodb_table_arns = module.db.all_table_arns

  # Cognito User Poolへのアクセス権限
  enable_cognito_access = true
  cognito_user_pool_arn = module.auth.user_pool_arn

  # S3バケットへのアクセス権限
  enable_s3_access = true
  s3_bucket_arn    = module.attachments_bucket.bucket_arn

  # CORS設定（local.cors_allowed_originsを参照）
  allowed_origins = local.cors_allowed_origins

  # モニタリング設定
  enable_monitoring  = true
  log_retention_days = 7

  tags = {
    Service = "api"
    Type    = "lambda"
  }
}

##################################################
# Modules - 設定層（アプリケーション層に依存）
##################################################

# サーバー用パラメータ（SSM Parameter Store）
# Lambda環境変数 + ローカル開発時のnpm run dev用
module "server_params" {
  source = "../../modules/aws/parameter"

  parameter_path_prefix = "${local.resource_prefix}/server"

  parameters = {
    for key, value in local.server_config : key => {
      value       = value
      description = "サーバー環境変数: ${key}"
      secure      = false
    }
  }

  tags = {
    Service     = "server-parameters"
    Environment = local.effective_environment
  }
}

# Web用パラメータ（SSM Parameter Store）
# ビルド時にfetch-config.tsで取得してconfig生成
module "web_params" {
  source = "../../modules/aws/parameter"

  parameter_path_prefix = "${local.resource_prefix}/web"

  parameters = {
    API_URL = {
      value       = module.server.api_endpoint
      description = "API Gateway エンドポイントURL"
      secure      = false
    }
    COGNITO_USER_POOL_ID = {
      value       = module.auth.user_pool_id
      description = "Cognito User Pool ID"
      secure      = false
    }
    COGNITO_CLIENT_ID = {
      value       = module.auth.app_client_id
      description = "Cognito App Client ID"
      secure      = false
    }
    COGNITO_REGION = {
      value       = var.aws_project_region
      description = "Cognito リージョン"
      secure      = false
    }
  }

  tags = {
    Service     = "web-parameters"
    Environment = local.effective_environment
  }
}
