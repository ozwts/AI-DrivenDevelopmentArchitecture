variable "parameter_path_prefix" {
  description = "SSM Parameter Storeのパスプレフィックス（例: sandbox-dev）"
  type        = string
}

variable "parameters" {
  description = "作成するパラメータのマップ"
  type = map(object({
    value       = string
    description = string
    secure      = optional(bool, false)
  }))
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}
