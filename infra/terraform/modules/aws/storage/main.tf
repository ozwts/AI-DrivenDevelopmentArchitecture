##################################################
# AWS S3バケット設定
##################################################
locals {
  bucket_name = var.bucket_name != null ? var.bucket_name : "${var.aws_project_prefix}-${var.env}-${var.bucket_purpose}"
}

# S3バケット
resource "aws_s3_bucket" "bucket" {
  bucket        = local.bucket_name
  force_destroy = var.force_destroy
  tags = {
    Environment = var.environment
    Name        = local.bucket_name
    Purpose     = var.bucket_purpose
  }
}

# パブリックアクセスブロック設定
resource "aws_s3_bucket_public_access_block" "bucket" {
  bucket = aws_s3_bucket.bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# サーバーサイド暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "bucket_encryption" {
  bucket = aws_s3_bucket.bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# オプションのバージョニング設定
resource "aws_s3_bucket_versioning" "bucket_versioning" {
  count = var.enable_versioning ? 1 : 0

  bucket = aws_s3_bucket.bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# オプションのライフサイクルポリシー
resource "aws_s3_bucket_lifecycle_configuration" "bucket_lifecycle" {
  count  = var.enable_lifecycle ? 1 : 0
  bucket = aws_s3_bucket.bucket.id

  rule {
    id     = "expire-${var.bucket_purpose}-files"
    status = "Enabled"

    # 空のフィルターの代わりに明示的なprefixを指定
    filter {
      prefix = "" # バケット全体に適用
    }

    expiration {
      days = var.expiration_days
    }
  }
}

# オプションのCORS設定
resource "aws_s3_bucket_cors_configuration" "bucket_cors" {
  count  = var.enable_cors ? 1 : 0
  bucket = aws_s3_bucket.bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
} 