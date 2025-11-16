output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Cognito User Pool エンドポイント"
  value       = aws_cognito_user_pool.main.endpoint
}

output "app_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "app_client_secret" {
  description = "Cognito App Client Secret"
  value       = aws_cognito_user_pool_client.main.client_secret
  sensitive   = true
}

output "domain" {
  description = "Cognito User Pool Domain"
  value       = var.domain_prefix != "" ? aws_cognito_user_pool_domain.main[0].domain : ""
}

output "domain_cloudfront_distribution_arn" {
  description = "Cognito User Pool Domain CloudFront Distribution ARN"
  value       = var.domain_prefix != "" ? aws_cognito_user_pool_domain.main[0].cloudfront_distribution_arn : ""
}
