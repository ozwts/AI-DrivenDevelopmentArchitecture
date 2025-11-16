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

variable "deletion_protection_enabled" {
  description = "削除保護を有効にするか（本番環境ではtrueを推奨）"
  type        = bool
  default     = false
}

variable "point_in_time_recovery" {
  description = "ポイントインタイムリカバリを有効にするか"
  type        = bool
  default     = false
}

variable "server_side_encryption" {
  description = "サーバー側の暗号化を有効にするか"
  type        = bool
  default     = true
}
