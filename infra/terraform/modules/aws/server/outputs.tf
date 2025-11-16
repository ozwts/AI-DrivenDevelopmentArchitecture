output "function_name" {
  description = "Lambda関数名"
  value       = aws_lambda_function.api_function.function_name
}

output "function_arn" {
  description = "Lambda関数のARN"
  value       = aws_lambda_function.api_function.arn
}

output "function_invoke_arn" {
  description = "Lambda関数の呼び出しARN"
  value       = aws_lambda_function.api_function.invoke_arn
}

output "api_id" {
  description = "API GatewayのID"
  value       = aws_apigatewayv2_api.api.id
}

output "api_endpoint" {
  description = "API GatewayのエンドポイントURL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_arn" {
  description = "API GatewayのARN"
  value       = aws_apigatewayv2_api.api.arn
}

output "lambda_role_arn" {
  description = "Lambda実行ロールのARN"
  value       = aws_iam_role.lambda_role.arn
}
