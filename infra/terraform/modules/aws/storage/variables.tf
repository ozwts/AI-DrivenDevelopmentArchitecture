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
  default     = "aniswipe"
}

variable "bucket_name" {
  description = "S3バケット名（未指定時はプロジェクトプレフィックスと用途から自動生成）"
  type        = string
  default     = null
}

variable "bucket_purpose" {
  description = "バケットの用途（upload、encoded、cache など）"
  type        = string
  default     = "storage"
}

variable "enable_versioning" {
  description = "バケットのバージョニングを有効にするか"
  type        = bool
  default     = false
}

variable "enable_lifecycle" {
  description = "ライフサイクルポリシーを有効にするか"
  type        = bool
  default     = false
}

variable "expiration_days" {
  description = "ファイルの有効期限（日数）"
  type        = number
  default     = 7
}

variable "enable_cors" {
  description = "CORSを有効にするか"
  type        = bool
  default     = false
}

variable "cors_allowed_origins" {
  description = "CORSで許可するオリジンのリスト"
  type        = list(string)
  default     = ["*"]
}

variable "force_destroy" {
  description = "バケット削除時に中身のオブジェクトも強制削除するか"
  type        = bool
  default     = false
} 