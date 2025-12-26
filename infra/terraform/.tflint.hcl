# TFLint Configuration - Strictest Mode
# https://github.com/terraform-linters/tflint
#
# AI駆動開発の観点:
# - デプロイ前にエラーを検出（terraform plan では検出できないAWS固有のエラーも検出）
# - 全ルール有効化で一貫性を担保
# - Deep Checkingでリソースの実際の値を検証

config {
  # 全てのモジュールを検査（ローカル + リモート）
  call_module_type = "all"

  # 警告もエラーとして扱わない（CIでは --force オプションで制御）
  force = false
}

##################################################
# Terraform Language Plugin - 全ルール有効化
# https://github.com/terraform-linters/tflint-ruleset-terraform
##################################################
plugin "terraform" {
  enabled = true
  # "all" preset: 全ルールを有効化（"recommended"より厳格）
  preset = "all"
}

# デフォルトで無効なルールを明示的に有効化
# これにより全20ルールが有効になる

# コメント構文を # に統一（// を禁止）
rule "terraform_comment_syntax" {
  enabled = true
}

# 変数に説明を必須化
rule "terraform_documented_variables" {
  enabled = true
}

# 出力に説明を必須化
rule "terraform_documented_outputs" {
  enabled = true
}

# 命名規則: スネークケースを強制
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

# 標準モジュール構造を強制（main.tf, variables.tf, outputs.tf）
rule "terraform_standard_module_structure" {
  enabled = true
}

# Git-hostedモジュールのshallow cloneを推奨
rule "terraform_module_shallow_clone" {
  enabled = true
}

# required_providersで宣言されたが未使用のプロバイダーを検出
rule "terraform_unused_required_providers" {
  enabled = true
}

##################################################
# AWS Provider Plugin - 全ルール有効化
# https://github.com/terraform-linters/tflint-ruleset-aws
# 700+ ルールが含まれる
##################################################
plugin "aws" {
  enabled = true
  version = "0.44.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"

  # Deep Checking: AWSリソースの実際の値を検証
  # terraform plan では検出できないエラーを事前に検出
  # 例: 無効なインスタンスタイプ、存在しないAMI ID
  deep_check = true
}

##################################################
# AWS ルール - セキュリティ・ベストプラクティス強化
# デフォルトで有効なルールに加え、追加設定
##################################################

# リソースに必須タグを強制
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Name"]
}
