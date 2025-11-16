output "bucket_id" {
  description = "S3バケットのID"
  value       = aws_s3_bucket.bucket.id
}

output "bucket_arn" {
  description = "S3バケットのARN"
  value       = aws_s3_bucket.bucket.arn
}

output "bucket_name" {
  description = "S3バケットの名前"
  value       = aws_s3_bucket.bucket.bucket
}

output "bucket_domain_name" {
  description = "S3バケットのドメイン名"
  value       = aws_s3_bucket.bucket.bucket_domain_name
}

output "bucket_region" {
  description = "S3バケットのリージョン"
  value       = aws_s3_bucket.bucket.region
}

output "bucket_endpoint" {
  description = "S3バケットのエンドポイントURL"
  value       = "https://${aws_s3_bucket.bucket.bucket}.s3.${aws_s3_bucket.bucket.region}.amazonaws.com"
} 