variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "identifier" {
  description = "環境識別子"
  type        = string
}

variable "enable_mfa" {
  description = "MFAを有効にするか"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "削除保護を有効にするか"
  type        = bool
  default     = false
}

variable "access_token_validity_minutes" {
  description = "アクセストークンの有効期限（分）"
  type        = number
  default     = 60
}

variable "id_token_validity_minutes" {
  description = "IDトークンの有効期限（分）"
  type        = number
  default     = 60
}

variable "refresh_token_validity_days" {
  description = "リフレッシュトークンの有効期限（日）"
  type        = number
  default     = 30
}

variable "oauth_flows" {
  description = "許可するOAuthフロー"
  type        = list(string)
  default     = []
}

variable "oauth_scopes" {
  description = "許可するOAuthスコープ"
  type        = list(string)
  default     = ["email", "openid", "profile"]
}

variable "callback_urls" {
  description = "コールバックURL"
  type        = list(string)
  default     = []
}

variable "logout_urls" {
  description = "ログアウトURL"
  type        = list(string)
  default     = []
}

variable "identity_providers" {
  description = "サポートするIDプロバイダー"
  type        = list(string)
  default     = ["COGNITO"]
}

variable "read_attributes" {
  description = "読み取り可能な属性"
  type        = list(string)
  default     = ["email", "email_verified"]
}

variable "write_attributes" {
  description = "書き込み可能な属性"
  type        = list(string)
  default     = ["email"]
}

variable "domain_prefix" {
  description = "Cognitoドメインのプレフィックス（空の場合は作成しない）"
  type        = string
  default     = ""
}
