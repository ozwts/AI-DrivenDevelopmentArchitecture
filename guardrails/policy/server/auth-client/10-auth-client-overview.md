# AuthClient: 認証サービスインターフェース

## 核心原則

AuthClientは**認証サービス（Cognito等）への抽象インターフェース**であり、**技術非依存**かつ**JWTトークン操作**と**ユーザー管理**を提供する。

**関連ドキュメント**: `../port/10-port-overview.md`

## 責務

### 実施すること

1. **認証操作の抽象化**: トークン検証、デコード、ユーザー情報取得
2. **ユーザー管理操作**: ユーザー削除、カスタムトークン生成
3. **技術非依存**: Cognito, Firebase Auth等の具体的な技術に依存しない

### 実施しないこと

1. **認証ロジックの実装** → Infrastructure層で実施
2. **認可判定** → UseCase層またはHandler層で実施
3. **セッション管理** → 別の責務として分離

## 型定義

```typescript
import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

export type AuthPayload = {
  userSub: string;
  issuer?: string;
  issuedAt?: number;
  expiresAt?: number;
  claims?: Record<string, unknown>;
};

export type AuthUser = {
  id: string;
  email?: string;
  emailVerified?: boolean;
  disabled?: boolean;
};

export type DeleteUserResult = Result<void, UnexpectedError>;

export type AuthClient = {
  decodeToken(token: string): Promise<AuthPayload>;
  getUserById(userId: string): Promise<AuthUser>;
  verifyToken(token: string): Promise<boolean>;
  deleteUser(userId: string): Promise<DeleteUserResult>;
  createCustomToken(
    userId: string,
    additionalClaims?: Record<string, unknown>
  ): Promise<string>;
};
```

## 使用例

### Handler層での認証

```typescript
export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const isValid = await authClient.verifyToken(token);
  if (!isValid) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const payload = await authClient.decodeToken(token);
  c.set("userId", payload.userSub);

  await next();
};
```

### UseCase層でのユーザー削除

```typescript
export class DeleteCurrentUserUseCase {
  readonly #authClient: AuthClient;
  readonly #userRepository: UserRepository;

  async execute(input: { userId: string }): Promise<DeleteUserResult> {
    // リポジトリからユーザー削除
    const repoResult = await this.#userRepository.delete({ id: input.userId });
    if (!repoResult.success) {
      return repoResult;
    }

    // 認証サービスからユーザー削除
    const authResult = await this.#authClient.deleteUser(input.userId);
    if (!authResult.success) {
      return authResult;
    }

    return Result.ok(undefined);
  }
}
```

## DTO説明

### AuthPayload

JWTトークンをデコードした結果。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| userSub | string | ユーザー識別子（必須） |
| issuer | string? | トークン発行者 |
| issuedAt | number? | 発行時刻（UNIX時間） |
| expiresAt | number? | 有効期限（UNIX時間） |
| claims | Record? | カスタムクレーム |

### AuthUser

認証サービスから取得したユーザー情報。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | ユーザーID（必須） |
| email | string? | メールアドレス |
| emailVerified | boolean? | メール確認済みフラグ |
| disabled | boolean? | 無効化フラグ |

## Do / Don't

### ✅ Good

```typescript
// 技術非依存のインターフェース
const payload = await authClient.decodeToken(token);
const user = await authClient.getUserById(payload.userSub);

// Result型でエラーハンドリング（削除操作）
const result = await authClient.deleteUser(userId);
if (!result.success) {
  logger.error("ユーザー削除失敗", result.error);
}
```

### ❌ Bad

```typescript
// 技術固有のAPI
const user = await cognitoClient.adminGetUser({
  UserPoolId: "ap-northeast-1_xxx",  // ❌ Cognito固有
  Username: userId,
});

// 認証ロジックをポートに含める
export type AuthClient = {
  isAdmin(userId: string): Promise<boolean>;  // ❌ 認可判定はUseCase層で
};
```
