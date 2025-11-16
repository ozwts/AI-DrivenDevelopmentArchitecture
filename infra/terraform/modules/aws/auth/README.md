# Auth Module (AWS Cognito)

AWS Cognitoを使った認証モジュールのTerraform実装です。

## 概要

このモジュールは以下のリソースを作成します：

- AWS Cognito User Pool
- Cognito User Pool Client
- Cognito User Pool Domain（オプション）

認証と認可はアプリケーション側で行います。

## 使い方

### 基本的な使用方法

```hcl
module "auth" {
  source = "../../modules/aws/auth"

  project_name = "hands-on"
  identifier   = "dev"

  # MFA設定
  enable_mfa = false

  # 削除保護
  deletion_protection = false

  # トークンの有効期限
  access_token_validity_minutes = 60
  id_token_validity_minutes     = 60
  refresh_token_validity_days   = 30
}
```

### OAuth設定を含む場合

```hcl
module "auth" {
  source = "../../modules/aws/auth"

  project_name = "hands-on"
  identifier   = "dev"

  # OAuth設定
  oauth_flows = ["code", "implicit"]
  oauth_scopes = ["email", "openid", "profile"]

  callback_urls = [
    "https://example.com/callback"
  ]

  logout_urls = [
    "https://example.com/logout"
  ]

  # Cognitoドメイン
  domain_prefix = "hands-on-dev-auth"
}
```

## 入力変数

| 変数名 | 説明 | 型 | デフォルト | 必須 |
|--------|------|-----|-----------|------|
| `project_name` | プロジェクト名 | string | - | Yes |
| `identifier` | 環境識別子 | string | - | Yes |
| `enable_mfa` | MFAを有効にするか | bool | false | No |
| `deletion_protection` | 削除保護を有効にするか | bool | false | No |
| `access_token_validity_minutes` | アクセストークンの有効期限（分） | number | 60 | No |
| `id_token_validity_minutes` | IDトークンの有効期限（分） | number | 60 | No |
| `refresh_token_validity_days` | リフレッシュトークンの有効期限（日） | number | 30 | No |
| `oauth_flows` | 許可するOAuthフロー | list(string) | [] | No |
| `oauth_scopes` | 許可するOAuthスコープ | list(string) | ["email", "openid", "profile"] | No |
| `callback_urls` | コールバックURL | list(string) | [] | No |
| `logout_urls` | ログアウトURL | list(string) | [] | No |
| `identity_providers` | サポートするIDプロバイダー | list(string) | ["COGNITO"] | No |
| `read_attributes` | 読み取り可能な属性 | list(string) | ["email", "email_verified"] | No |
| `write_attributes` | 書き込み可能な属性 | list(string) | ["email"] | No |
| `domain_prefix` | Cognitoドメインのプレフィックス | string | "" | No |

## 出力

| 出力名 | 説明 |
|--------|------|
| `user_pool_id` | Cognito User Pool ID |
| `user_pool_arn` | Cognito User Pool ARN |
| `user_pool_endpoint` | Cognito User Pool エンドポイント |
| `app_client_id` | Cognito App Client ID |
| `app_client_secret` | Cognito App Client Secret（sensitive） |
| `domain` | Cognito User Pool Domain |
| `domain_cloudfront_distribution_arn` | CloudFront Distribution ARN |

## アプリケーション側での認証

このモジュールで作成したCognito User Poolを使って、アプリケーション側で認証と認可を行います。

### サーバー側での使用例

```typescript
import { CognitoAuthClient } from "@/infrastructure/auth-client";

// AuthClientの初期化
const authClient = new CognitoAuthClient({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
});

// ミドルウェアでトークンを検証
app.use("/api/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const isValid = await authClient.verifyToken(token);

  if (!isValid) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // トークンをデコードしてユーザー情報を取得
  const payload = await authClient.decodeToken(token);

  // コンテキストにユーザー情報を設定
  c.set("userSub", payload.userSub);
  c.set("userEmail", payload.claims?.email);

  await next();
});
```

## デプロイ

### 初回デプロイ

```bash
cd infra
npm run config:dev
npm run deploy:dev
```

### 更新デプロイ

```bash
cd infra
npm run deploy:dev
```

## テスト

### ユーザー作成

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --temporary-password TempPassword123!
```

### トークン取得

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id <USER_POOL_ID> \
  --client-id <APP_CLIENT_ID> \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=YourPassword123!
```

### API呼び出し

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/api/todos
```

## 環境変数の設定

Terraformの出力値を環境変数として設定します：

```bash
# Terraform outputs
output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_app_client_id" {
  value = module.auth.app_client_id
}
```

Lambda関数の環境変数に設定：

```hcl
resource "aws_lambda_function" "api" {
  # ...

  environment {
    variables = {
      COGNITO_USER_POOL_ID = module.auth.user_pool_id
      COGNITO_CLIENT_ID    = module.auth.app_client_id
    }
  }
}
```

## 注意事項

1. **削除保護**: 本番環境では `deletion_protection = true` を設定することを推奨します
2. **MFA**: セキュリティ要件に応じて `enable_mfa = true` を検討してください
3. **トークン有効期限**: セキュリティとUXのバランスを考慮して設定してください
4. **Cognitoドメイン**: ドメインプレフィックスは全AWSアカウントでグローバルに一意である必要があります

## トラブルシューティング

### Cognitoドメインの競合

ドメインプレフィックスは全AWSアカウントでグローバルに一意である必要があります。競合する場合は別の名前を試してください。

### トークン検証エラー

- User Pool IDとClient IDが正しく設定されているか確認
- トークンの有効期限が切れていないか確認
- リージョンが一致しているか確認

## ライセンス

MIT
