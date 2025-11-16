##################################################
# Locals
##################################################
locals {
  function_name = var.lambda_function_name != "" ? var.lambda_function_name : var.api_name
  api_stage     = "api"

  # CORSの設定
  cors_origins = var.allowed_origins
}

##################################################
# Lambda関数用のIAMロール
##################################################
resource "aws_iam_role" "lambda_role" {
  name = "${local.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${local.function_name}-role"
    }
  )
}

# Lambda基本実行ロール
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDBアクセス用IAMポリシー
resource "aws_iam_role_policy" "dynamodb_access" {
  count = length(var.dynamodb_table_arns) > 0 ? 1 : 0

  name = "${local.function_name}-dynamodb-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = concat(
          var.dynamodb_table_arns,
          [for arn in var.dynamodb_table_arns : "${arn}/index/*"]
        )
      }
    ]
  })
}

# Cognitoアクセス用IAMポリシー
resource "aws_iam_role_policy" "cognito_access" {
  count = var.enable_cognito_access ? 1 : 0

  name = "${local.function_name}-cognito-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "cognito-idp:*"
        Resource = var.cognito_user_pool_arn
      }
    ]
  })
}

# S3アクセス用IAMポリシー
resource "aws_iam_role_policy" "s3_access" {
  count = var.enable_s3_access ? 1 : 0

  name = "${local.function_name}-s3-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

##################################################
# CloudWatch Logs
##################################################
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "/aws/lambda/${local.function_name}"
    }
  )
}

##################################################
# Lambda関数のデプロイパッケージ
##################################################
data "archive_file" "lambda_package" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/.terraform/lambda-${var.api_name}.zip"
}

##################################################
# Lambda関数
##################################################
resource "aws_lambda_function" "api_function" {
  filename         = data.archive_file.lambda_package.output_path
  function_name    = local.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = var.handler
  source_code_hash = data.archive_file.lambda_package.output_base64sha256
  runtime          = var.runtime
  memory_size      = var.memory_size
  timeout          = var.timeout

  environment {
    variables = var.environment_variables
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_basic
  ]

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = local.function_name
    }
  )
}

##################################################
# API Gateway
##################################################
resource "aws_apigatewayv2_api" "api" {
  name          = var.api_name
  protocol_type = "HTTP"
  description   = "${var.api_name} API"

  cors_configuration {
    allow_origins = local.cors_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = var.api_name
    }
  )
}

# Lambda統合
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  integration_method     = "POST"
  integration_uri        = aws_lambda_function.api_function.invoke_arn
  payload_format_version = "2.0"
}

# デフォルトルート（すべてのパスをLambdaに転送）
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ステージ
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.api_name}-default-stage"
    }
  )
}

# API Gateway ログ
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.api_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "/aws/apigateway/${var.api_name}"
    }
  )
}

# API GatewayにLambda実行権限を付与
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

##################################################
# CloudWatchモニタリング
##################################################
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${local.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function error rate is too high"

  dimensions = {
    FunctionName = aws_lambda_function.api_function.function_name
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${local.function_name}-errors-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${local.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Lambda function is being throttled"

  dimensions = {
    FunctionName = aws_lambda_function.api_function.function_name
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${local.function_name}-throttles-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${var.api_name}-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5XX error rate is too high"

  dimensions = {
    ApiId = aws_apigatewayv2_api.api.id
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.api_name}-5xx-errors-alarm"
    }
  )
}
