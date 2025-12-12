output "parameter_path_prefix" {
  description = "SSMパラメータのパスプレフィックス"
  value       = "/${var.parameter_path_prefix}"
}

output "parameter_arns" {
  description = "作成されたSSMパラメータのARNマップ"
  value = {
    for key, param in aws_ssm_parameter.params : key => param.arn
  }
}

output "parameter_names" {
  description = "作成されたSSMパラメータの完全パスマップ"
  value = {
    for key, param in aws_ssm_parameter.params : key => param.name
  }
}
