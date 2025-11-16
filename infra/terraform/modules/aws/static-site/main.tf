##################################################
# S3バケット（静的サイトホスティング用）
##################################################
locals {
  bucket_name = var.bucket_name != null ? var.bucket_name : "${var.aws_project_prefix}-static-site"
}

# S3バケット
resource "aws_s3_bucket" "static_site" {
  bucket        = local.bucket_name
  force_destroy = var.force_destroy # trueの場合、バケット内にオブジェクトがあっても削除可能

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = local.bucket_name
      Purpose     = "static-site"
    }
  )
}

# サーバーサイド暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# パブリックアクセスブロック設定（CloudFront経由のみアクセス可能）
resource "aws_s3_bucket_public_access_block" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

##################################################
# CloudFront Origin Access Control (OAC)
##################################################
resource "aws_cloudfront_origin_access_control" "static_site" {
  name                              = "${var.aws_project_prefix}-static-site-oac"
  description                       = "OAC for ${local.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

##################################################
# CloudFront Distribution
##################################################
resource "aws_cloudfront_distribution" "static_site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.aws_project_prefix} static site distribution"
  default_root_object = var.default_root_object
  price_class         = var.cloudfront_price_class

  # S3をオリジンとして設定
  origin {
    domain_name              = aws_s3_bucket.static_site.bucket_regional_domain_name
    origin_id                = "S3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site.id
  }

  # index.html用のキャッシュビヘイビア（短いTTL）
  ordered_cache_behavior {
    path_pattern     = "/index.html"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${local.bucket_name}"

    cache_policy_id            = aws_cloudfront_cache_policy.spa_html.id
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    # Basic認証を有効にする場合
    dynamic "function_association" {
      for_each = var.enable_basic_auth ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.basic_auth[0].arn
      }
    }
  }

  # 静的アセット用のキャッシュビヘイビア（長いTTL）
  # Viteは /assets/* にハッシュ付きファイル名でビルド
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${local.bucket_name}"

    cache_policy_id            = aws_cloudfront_cache_policy.spa_assets.id
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    # Basic認証を有効にする場合
    dynamic "function_association" {
      for_each = var.enable_basic_auth ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.basic_auth[0].arn
      }
    }
  }

  # デフォルトのキャッシュビヘイビア（その他のファイル）
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${local.bucket_name}"

    cache_policy_id            = aws_cloudfront_cache_policy.spa_html.id # HTMLと同じ短いTTL
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    # Basic認証を有効にする場合
    dynamic "function_association" {
      for_each = var.enable_basic_auth ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.basic_auth[0].arn
      }
    }
  }

  # カスタムエラーレスポンス（SPA用）
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/${var.error_document}"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/${var.error_document}"
  }

  # 地理的制限なし
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # デフォルトのSSL証明書を使用
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.aws_project_prefix}-static-site-distribution"
    }
  )
}

##################################################
# S3バケットポリシー（CloudFrontからのアクセスを許可）
##################################################
resource "aws_s3_bucket_policy" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static_site.arn
          }
        }
      }
    ]
  })
}
