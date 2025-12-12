##################################################
# SSM Parameter Store - Shared Parameters
##################################################

# パラメータをフラット構造で作成
# パス: /{prefix}/{PARAMETER_NAME}
resource "aws_ssm_parameter" "params" {
  for_each = var.parameters

  name        = "/${var.parameter_path_prefix}/${each.key}"
  description = each.value.description
  type        = each.value.secure ? "SecureString" : "String"
  value       = each.value.value

  tags = merge(var.tags, {
    Name = each.key
  })
}
