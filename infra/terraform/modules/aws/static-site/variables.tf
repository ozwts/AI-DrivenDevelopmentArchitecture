variable "environment" {
  description = "環境名 (dev/stg/prd)"
  type        = string
  default     = "dev"
}

variable "env" {
  description = "環境の短縮名 (dev/stg/prd)"
  type        = string
}

variable "aws_project_prefix" {
  description = "プロジェクトのプレフィックス (リソース名の接頭辞)"
  type        = string
}

variable "bucket_name" {
  description = "S3バケット名（未指定時はプロジェクトプレフィックスから自動生成）"
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "バケット削除時にオブジェクトも強制削除するか（本番環境ではfalseを推奨）"
  type        = bool
  default     = false
}

variable "enable_cloudfront_logging" {
  description = "CloudFrontのアクセスログを有効にするか"
  type        = bool
  default     = false
}

variable "cloudfront_price_class" {
  description = "CloudFrontの価格クラス"
  type        = string
  default     = "PriceClass_200" # アジア・ヨーロッパ・北米
}

variable "default_root_object" {
  description = "デフォルトのルートオブジェクト"
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "エラーページのパス"
  type        = string
  default     = "index.html" # SPAの場合はindex.htmlにリダイレクト
}

variable "auto_deploy_enabled" {
  description = "ファイルの自動デプロイを有効にするか"
  type        = bool
  default     = false
}

variable "deploy_source_dir" {
  description = "デプロイするソースディレクトリ（絶対パス）"
  type        = string
  default     = ""
}

variable "enable_basic_auth" {
  description = "Basic認証を有効にするか"
  type        = bool
  default     = false
}

variable "basic_auth_username" {
  description = "Basic認証のユーザー名"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "basic_auth_password" {
  description = "Basic認証のパスワード"
  type        = string
  default     = "password"
  sensitive   = true
}

variable "csp_connect_src" {
  description = "CSP connect-src ディレクティブで許可するURL/ドメインのリスト"
  type        = list(string)
  default     = []
}

variable "enable_csp_report" {
  description = "CSP違反レポートを有効にするか"
  type        = bool
  default     = false
}

variable "csp_report_uri" {
  description = "CSP違反レポートの送信先URI"
  type        = string
  default     = ""
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}
