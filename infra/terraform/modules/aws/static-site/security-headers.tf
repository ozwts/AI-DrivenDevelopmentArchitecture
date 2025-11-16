##################################################
# CloudFront Response Headers Policy
# XSS対策、CSP、その他のセキュリティヘッダーを設定
##################################################

locals {
  # connect-src に設定する接続先のリスト
  # 'self' を先頭に追加し、渡されたURLリストを結合
  connect_src_hosts = concat(["'self'"], var.csp_connect_src)

  # Content Security Policy の構築
  csp_directives = concat(
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", # Viteのため unsafe-inline が必要
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src ${join(" ", local.connect_src_hosts)}",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ],
    var.enable_csp_report && var.csp_report_uri != "" ? ["report-uri ${var.csp_report_uri}"] : []
  )
}

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.aws_project_prefix}-security-headers-policy"
  comment = "Security headers for XSS protection, CSP, and other security features"

  # セキュリティヘッダー設定
  security_headers_config {
    # Content Security Policy (CSP)
    content_security_policy {
      content_security_policy = join("; ", local.csp_directives)
      override                = true
    }

    # Strict Transport Security (HSTS)
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2年
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    # X-Content-Type-Options
    content_type_options {
      override = true
    }

    # X-Frame-Options
    frame_options {
      frame_option = "DENY"
      override     = true
    }

    # X-XSS-Protection
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    # Referrer-Policy
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  # カスタムヘッダー（追加のセキュリティ情報）
  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "geolocation=(), microphone=(), camera=()"
      override = true
    }
  }
}
