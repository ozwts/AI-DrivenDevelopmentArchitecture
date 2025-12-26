##################################################
# Outputs
##################################################

# Static Site Outputs
output "static_site_url" {
  description = "CloudFront distribution URL for static site"
  value       = "https://${module.static_site.cloudfront_domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.static_site.cloudfront_distribution_id
}

output "s3_bucket_name" {
  description = "S3 bucket name for static site"
  value       = module.static_site.bucket_name
}

# API Outputs
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.server.api_endpoint
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.server.function_name
}

# DynamoDB Outputs
output "dynamodb_table_names" {
  description = "DynamoDB table names"
  value       = module.db.table_names
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.auth.user_pool_arn
}

output "cognito_app_client_id" {
  description = "Cognito App Client ID"
  value       = module.auth.app_client_id
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = module.auth.user_pool_endpoint
}

# SSM Parameter Store Outputs
output "server_params_path" {
  description = "サーバー用SSM Parameter Storeパスプレフィックス（ローカル開発用）"
  value       = module.server_params.parameter_path_prefix
}

output "web_params_path" {
  description = "Web用SSM Parameter Storeパスプレフィックス（ビルド時のconfig生成用）"
  value       = module.web_params.parameter_path_prefix
}
