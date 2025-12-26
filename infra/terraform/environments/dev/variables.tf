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
