variable "environment" {
  description = "環境名 (dev/stg/prd)"
  type        = string
}

variable "env" {
  description = "環境の短縮名 (dev/stg/prd)"
  type        = string
}

variable "aws_project_prefix" {
  description = "プロジェクトのプレフィックス"
  type        = string
}

variable "api_name" {
  description = "APIの名前"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda関数の名前"
  type        = string
  default     = ""
}

variable "handler" {
  description = "Lambdaのハンドラー（例: index.handler）"
  type        = string
  default     = "index.handler"
}

variable "runtime" {
  description = "Lambdaのランタイム"
  type        = string
  default     = "nodejs20.x"
}

variable "memory_size" {
  description = "Lambdaのメモリサイズ（MB）"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambdaのタイムアウト（秒）"
  type        = number
  default     = 30
}

variable "source_dir" {
  description = "Lambda関数のソースコードディレクトリ（ビルド済み）"
  type        = string
}

variable "server_entry_point" {
  description = "サーバーのエントリーポイントファイル（例: src/handler/lambda-handler.ts）"
  type        = string
  default     = ""
}

variable "esbuild_config_path" {
  description = "esbuildの設定ファイルのパス（例: esbuild.api.config.mjs）"
  type        = string
  default     = ""
}

variable "environment_variables" {
  description = "Lambda関数の環境変数"
  type        = map(string)
  default     = {}
}

variable "dynamodb_table_arns" {
  description = "アクセスを許可するDynamoDBテーブルのARNリスト"
  type        = list(string)
  default     = []
}

variable "enable_cognito_access" {
  description = "Cognitoへのアクセス権限を付与するか"
  type        = bool
  default     = false
}

variable "cognito_user_pool_arn" {
  description = "アクセスを許可するCognito User PoolのARN（enable_cognito_access=trueの場合に必須）"
  type        = string
  default     = ""
}

variable "enable_s3_access" {
  description = "S3へのアクセス権限を付与するか"
  type        = bool
  default     = false
}

variable "s3_bucket_arn" {
  description = "アクセスを許可するS3バケットのARN（enable_s3_access=trueの場合に必須）"
  type        = string
  default     = ""
}

variable "allowed_origins" {
  description = "CORSで許可するオリジンのリスト"
  type        = list(string)
  default     = ["*"]
}

variable "enable_monitoring" {
  description = "CloudWatchモニタリングとアラームを有効にするか"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logsの保持期間（日数）"
  type        = number
  default     = 7
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}
