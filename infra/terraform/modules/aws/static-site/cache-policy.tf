##################################################
# CloudFront Cache Policy
# SPAに最適化されたキャッシュ設定
##################################################

# index.html用のキャッシュポリシー（短いTTL）
resource "aws_cloudfront_cache_policy" "spa_html" {
  name    = "${var.aws_project_prefix}-spa-html-cache-policy"
  comment = "Cache policy for SPA HTML files with short TTL"

  min_ttl     = 0
  default_ttl = 60  # 1分（SPAのindex.htmlは短くする）
  max_ttl     = 300 # 5分

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# 静的アセット用のキャッシュポリシー（長いTTL）
resource "aws_cloudfront_cache_policy" "spa_assets" {
  name    = "${var.aws_project_prefix}-spa-assets-cache-policy"
  comment = "Cache policy for SPA static assets with long TTL"

  min_ttl     = 0
  default_ttl = 86400    # 1日
  max_ttl     = 31536000 # 1年（ハッシュ付きファイル名なので安全）

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}
