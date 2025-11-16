output "bucket_id" {
  description = "S3バケットのID"
  value       = aws_s3_bucket.static_site.id
}

output "bucket_arn" {
  description = "S3バケットのARN"
  value       = aws_s3_bucket.static_site.arn
}

output "bucket_name" {
  description = "S3バケットの名前"
  value       = aws_s3_bucket.static_site.bucket
}

output "bucket_regional_domain_name" {
  description = "S3バケットのリージョナルドメイン名"
  value       = aws_s3_bucket.static_site.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront ディストリビューションのID"
  value       = aws_cloudfront_distribution.static_site.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront ディストリビューションのARN"
  value       = aws_cloudfront_distribution.static_site.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront ディストリビューションのドメイン名"
  value       = aws_cloudfront_distribution.static_site.domain_name
}

output "cloudfront_url" {
  description = "CloudFront ディストリビューションのURL"
  value       = "https://${aws_cloudfront_distribution.static_site.domain_name}"
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront ディストリビューションのホストゾーンID（Route53連携用）"
  value       = aws_cloudfront_distribution.static_site.hosted_zone_id
}

output "response_headers_policy_id" {
  description = "CloudFront Response Headers PolicyのID"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}

output "response_headers_policy_arn" {
  description = "CloudFront Response Headers PolicyのARN"
  value       = aws_cloudfront_response_headers_policy.security_headers.arn
}

output "cache_policy_html_id" {
  description = "HTML用のCache PolicyのID"
  value       = aws_cloudfront_cache_policy.spa_html.id
}

output "cache_policy_assets_id" {
  description = "Assets用のCache PolicyのID"
  value       = aws_cloudfront_cache_policy.spa_assets.id
}
