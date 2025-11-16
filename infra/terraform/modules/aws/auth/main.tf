# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.identifier}-user-pool"

  # ユーザー名属性の設定
  username_attributes = ["email"]

  # 自動検証する属性
  auto_verified_attributes = ["email"]

  # パスワードポリシー
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # ユーザー属性のスキーマ
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # アカウント復旧設定
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # MFA設定
  mfa_configuration = var.enable_mfa ? "OPTIONAL" : "OFF"

  # デバイス記憶設定
  device_configuration {
    challenge_required_on_new_device      = var.enable_mfa
    device_only_remembered_on_user_prompt = true
  }

  # メール設定
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # ユーザープール削除保護
  deletion_protection = var.deletion_protection ? "ACTIVE" : "INACTIVE"

  tags = {
    Name        = "${var.project_name}-${var.identifier}-user-pool"
    ProjectName = var.project_name
    Identifier  = var.identifier
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.identifier}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # 認証フローの設定
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]

  # トークンの有効期限（秒）
  access_token_validity  = var.access_token_validity_minutes
  id_token_validity      = var.id_token_validity_minutes
  refresh_token_validity = var.refresh_token_validity_days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # OAuth設定
  allowed_oauth_flows                  = var.oauth_flows
  allowed_oauth_flows_user_pool_client = length(var.oauth_flows) > 0
  allowed_oauth_scopes                 = var.oauth_scopes
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  supported_identity_providers         = var.identity_providers

  # セキュリティ設定
  prevent_user_existence_errors = "ENABLED"

  # 読み取り・書き込み属性
  read_attributes  = var.read_attributes
  write_attributes = var.write_attributes
}

# Cognito User Pool Domain (オプション)
resource "aws_cognito_user_pool_domain" "main" {
  count = var.domain_prefix != "" ? 1 : 0

  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}
