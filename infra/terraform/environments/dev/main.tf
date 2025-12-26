##################################################
# Variables
##################################################
variable "environment" {
  description = "This environment name."
  type        = string
  default     = "development"
}

variable "env" {
  description = "Short form of this environment."
  type        = string
  default     = "dev"
}

variable "aws_project_prefix" {
  description = "The prefix name of the project deployed in this AWS account."
  type        = string
  default     = "sandbox-dev"
}

variable "aws_project_region" {
  description = "AWS region name to be used as primary."
  type        = string
  default     = "ap-northeast-1"
}

##################################################
# Locals
##################################################
locals {
  static_site_url = "https://${module.static_site.cloudfront_domain_name}"
  api_url         = module.server.api_endpoint

  # ビルド成果物ディレクトリ
  web_build_dir = "${path.module}/../../../../web/build/client"
  api_build_dir = "${path.module}/../../../../server/dist/api"

  # アプリケーション共通環境変数
  # Lambda環境変数とSSM Parameter Store（ローカル開発用）で使いまわす
  app_env_vars = merge(
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
    # CORS設定
    {
      ALLOWED_ORIGINS = join(",", [
        local.static_site_url,
        "http://localhost:5173",
        "http://localhost:3000",
      ])
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
# Modules
##################################################

# ローカル開発用パラメータ（SSM Parameter Store）
# ローカルから `npm run dev` で AWS リソースに接続するための設定
module "shared_parameters" {
  source = "../../modules/aws/parameter"

  parameter_path_prefix = var.aws_project_prefix

  parameters = {
    for key, value in local.app_env_vars : key => {
      value       = value
      description = "App environment variable: ${key}"
      secure      = false
    }
  }

  tags = {
    Service = "local-dev-parameters"
  }
}

# 静的サイトホスティング（S3 + CloudFront）
module "static_site" {
  source = "../../modules/aws/static-site"

  environment        = var.environment
  env                = var.env
  aws_project_prefix = var.aws_project_prefix

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

# DynamoDB Tables
module "db" {
  source = "../../modules/aws/db"

  environment        = var.environment
  env                = var.env
  aws_project_prefix = var.aws_project_prefix

  deletion_protection_enabled = false # ハンズオン環境用: destroyで完全削除可能
  point_in_time_recovery      = false # ハンズオン環境用: バックアップ不要
  server_side_encryption      = true
}

# 認証（Cognito）
module "auth" {
  source = "../../modules/aws/auth"

  project_name = var.aws_project_prefix
  identifier   = var.env

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

  environment        = var.environment
  env                = var.env
  aws_project_prefix = var.aws_project_prefix

  # バケットの用途を指定
  bucket_purpose = "attachments"

  # CORS設定（開発環境ではlocalhostも許可）
  enable_cors = true
  cors_allowed_origins = [
    local.static_site_url,
    "http://localhost:5173",
  ]

  # バージョニングとライフサイクル設定
  enable_versioning = false
  enable_lifecycle  = false

  # ハンズオン環境用: destroyで完全削除可能
  force_destroy = true
}

# APIサーバー（Lambda + API Gateway）
module "server" {
  source = "../../modules/aws/server"

  environment        = var.environment
  env                = var.env
  aws_project_prefix = var.aws_project_prefix

  # API設定
  api_name = "${var.aws_project_prefix}-api"

  # Lambda設定
  handler     = "index.handler"
  runtime     = "nodejs22.x"
  memory_size = 1770 # 2vCPUの最低リソース（1,770MB～3,008MBで2vCPU、3,009MB以上は引き上げ申請が必要）
  timeout     = 30

  # デプロイ設定
  source_dir = local.api_build_dir

  # 環境変数（local.app_env_varsを使いまわし + Lambda専用の設定を追加）
  environment_variables = merge(
    local.app_env_vars,
    {
      NODE_ENV        = var.environment
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

  # CORS設定（開発環境ではlocalhostも許可）
  allowed_origins = [
    local.static_site_url,
    "http://localhost:5173",
  ]

  # モニタリング設定
  enable_monitoring  = true
  log_retention_days = 7

  tags = {
    Service = "api"
    Type    = "lambda"
  }
}

