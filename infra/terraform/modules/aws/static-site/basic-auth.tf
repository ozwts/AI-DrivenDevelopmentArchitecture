##################################################
# Basic認証用CloudFront Function
##################################################

# Basic認証のBase64エンコード文字列を生成
locals {
  basic_auth_string = var.enable_basic_auth ? base64encode("${var.basic_auth_username}:${var.basic_auth_password}") : ""
}

# Basic認証用のJavaScriptコードを動的生成
resource "local_file" "basic_auth_function" {
  count = var.enable_basic_auth ? 1 : 0

  filename = "${path.module}/.terraform/basic-auth-generated.js"
  content  = <<-EOF
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var uri = request.uri;
  var method = request.method;

  // 認証を除外するパスのリスト
  var excludedPaths = [
    // 必要に応じてパスを追加
  ];

  // リクエストURIが除外リストに含まれているかチェック
  var isExcluded = excludedPaths.some(function (path) {
    return uri === path || uri.startsWith(path);
  });

  // OPTIONSメソッドは認証をスキップ
  if (isExcluded || method === "OPTIONS") {
    return request;
  }

  // Basic認証の認証情報（動的生成）
  var authString = "Basic ${local.basic_auth_string}";

  if (
    typeof headers.authorization === "undefined" ||
    headers.authorization.value !== authString
  ) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: { "www-authenticate": { value: "Basic" } },
    };
  }

  return request;
}
EOF
}

# CloudFront Function
resource "aws_cloudfront_function" "basic_auth" {
  count = var.enable_basic_auth ? 1 : 0

  name    = "${var.aws_project_prefix}-basic-auth"
  runtime = "cloudfront-js-2.0"
  comment = "Basic authentication for ${var.aws_project_prefix}"
  publish = true
  code    = local_file.basic_auth_function[0].content
}
