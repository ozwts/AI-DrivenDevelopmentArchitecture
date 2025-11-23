##################################################
# Data Sources
##################################################

# AWS Secrets Manager: ANTHROPIC_API_KEY
# 管理用: ガードレールのMCPサーバーでのみ利用
# MCPサーバー起動時に自動的にAWS Secrets Managerから取得してprocess.envに設定
data "aws_secretsmanager_secret" "anthropic_api_key" {
  name = "${var.aws_project_prefix}/ANTHROPIC_API_KEY"
}

data "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id = data.aws_secretsmanager_secret.anthropic_api_key.id
}
