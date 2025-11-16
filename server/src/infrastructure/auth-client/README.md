# Auth Client

AWS Cognito用の認証クライアント実装です。

## 概要

このモジュールは、AWS CognitoのJWT認証を抽象化し、統一されたインターフェースでアクセスできるようにします。

## ファイル構成

### Domain層（`src/domain/support/auth-client/`）

- `index.ts` - 型定義とインターフェース
- `dummy.ts` - テスト用のダミー実装

### Infrastructure層（`src/infrastructure/auth-client/`）

- `index.ts` - AWS Cognito用の実装

## 使い方

### 1. 依存関係のインストール

```bash
npm install aws-jwt-verify @aws-sdk/client-cognito-identity-provider
```

### 2. Cognito Auth Clientの初期化

```typescript
import { CognitoAuthClient } from "@/infrastructure/auth-client";

const authClient = new CognitoAuthClient({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  region: "ap-northeast-1", // オプション（デフォルト: ap-northeast-1）
});
```

### 3. トークンの検証

```typescript
// トークンを検証
const isValid = await authClient.verifyToken(token);

if (!isValid) {
  throw new Error("Invalid token");
}
```

### 4. トークンのデコード

```typescript
// トークンをデコードして情報を取得
const payload = await authClient.decodeToken(token);

console.log("User Sub:", payload.userSub);
console.log("Email:", payload.claims?.email);
```

### 5. ユーザー情報の取得

```typescript
// ユーザーIDから詳細情報を取得
const user = await authClient.getUserById(userId);

console.log("Email:", user.email);
console.log("Verified:", user.emailVerified);
console.log("Disabled:", user.disabled);
```

### 6. ユーザーの削除

```typescript
// ユーザーを削除
const result = await authClient.deleteUser(userId);

if (!result.success) {
  console.error("Failed to delete user:", result.error);
}
```

## DI コンテナへの登録

```typescript
import { Container } from "inversify";
import { CognitoAuthClient } from "@/infrastructure/auth-client";
import type { AuthClient } from "@/domain/support/auth-client";

const container = new Container();

// シングルトンとして登録
container
  .bind<AuthClient>("AuthClient")
  .toDynamicValue(() => {
    return new CognitoAuthClient({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
  })
  .inSingletonScope();
```

## テストでの使用

```typescript
import { AuthClientDummy } from "@/domain/support/auth-client/dummy";

describe("Use Case Test", () => {
  it("should work with auth", async () => {
    // ダミー実装を使用
    const authClient = new AuthClientDummy({
      decodeTokenReturnValue: {
        userSub: "test-user-sub",
        issuer: "test-issuer",
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      },
      verifyTokenReturnValue: true,
    });

    // テストコード
    const payload = await authClient.decodeToken("dummy-token");
    expect(payload.userSub).toBe("test-user-sub");
  });
});
```

## 環境変数

以下の環境変数が必要です：

```bash
# Cognito User Pool ID
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX

# Cognito App Client ID
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

# AWSリージョン（オプション、デフォルト: ap-northeast-1）
AWS_REGION=ap-northeast-1
```

## Terraform との連携

Terraformで作成したCognito User Poolの情報は、以下のように取得できます：

```hcl
# Terraform outputs
output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_app_client_id" {
  value = module.auth.app_client_id
}
```

これらの値を環境変数として設定してください。

## 注意事項

### カスタムトークンの生成について

`createCustomToken` メソッドは、Cognitoでは直接カスタムトークンを生成できないため、エラーを投げます。

Cognitoでトークンを取得する場合は、AWS SDKの `InitiateAuth` を使用してください：

```typescript
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "ap-northeast-1" });

const command = new InitiateAuthCommand({
  AuthFlow: "USER_PASSWORD_AUTH",
  ClientId: process.env.COGNITO_CLIENT_ID,
  AuthParameters: {
    USERNAME: "user@example.com",
    PASSWORD: "password123",
  },
});

const response = await client.send(command);
const accessToken = response.AuthenticationResult?.AccessToken;
```

## ライセンス

MIT
