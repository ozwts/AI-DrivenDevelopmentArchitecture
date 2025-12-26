terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket = "sandbox-dev-secrets"
    key    = "terraform/dev.tfstate"
    region = "ap-southeast-2"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"

  default_tags {
    tags = {
      Project     = local.resource_prefix
      Env         = var.env
      Environment = local.effective_environment
    }
  }
}
