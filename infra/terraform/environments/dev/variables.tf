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

variable "branch_suffix" {
  description = "開発者ごとの分離環境用ブランチハッシュ。設定時はリソース名にこのサフィックスが付与され、開発者間の競合を回避する。"
  type        = string
  default     = ""

  validation {
    condition     = var.branch_suffix == "" || can(regex("^[a-z0-9]{1,12}$", var.branch_suffix))
    error_message = "branch_suffixは空文字、または1〜12文字の小文字英数字（例: gitの短縮ハッシュ）である必要があります。"
  }
}
