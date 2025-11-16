# AuthClient - 認証クライアント抽象化

認証基盤（Cognito等）への依存を抽象化するインターフェース。ドメイン層の純粋性を保ちながら認証機能を提供。

## 責務

- JWTトークンの検証とデコード
- ユーザー情報の取得
- ユーザーの削除（アカウント削除）
- トークンの有効性検証

## ファイル構成

```
auth-client/
├── index.ts          # AuthClientインターフェース定義
└── dummy.ts          # テスト用Dummy実装
```

## インターフェース定義

### AuthPayload

トークンから抽出されるペイロード情報。

**必須フィールド:**

- `userSub: string` - ユーザー識別子（Cognito Subなど）
- `issuer?: string` - 発行者
- `issuedAt?: number` - 発行時刻（UNIX時間）
- `expiresAt?: number` - 有効期限（UNIX時間）
- `claims?: Record<string, unknown>` - カスタムクレーム（`email`, `email_verified`等）

### AuthUser

認証プロバイダから取得されるユーザー情報。

**必須フィールド:**

- `id: string` - ユーザーID
- `email?: string` - メールアドレス
- `emailVerified?: boolean` - メール検証済みフラグ
- `disabled?: boolean` - 無効化フラグ

### AuthClientインターフェース

認証操作を抽象化するメソッド群。

**メソッド:**

1. `decodeToken(token: string): Promise<AuthPayload>`

   - JWTトークンを検証・デコード
   - トークンが無効な場合はエラーを投げる

2. `getUserById(userId: string): Promise<AuthUser>`

   - ユーザーIDから認証プロバイダのユーザー情報を取得

3. `verifyToken(token: string): Promise<boolean>`

   - トークンの有効性を検証（true/falseを返す）

4. `deleteUser(userId: string): Promise<DeleteUserResult>`
   - 認証プロバイダからユーザーを削除
   - Result型でエラーハンドリング

## 実装

### インフラ層での実装

実装は `infrastructure/auth-client/index.ts` に配置。

**Cognito実装の例:**

- `aws-jwt-verify` でトークン検証
- `@aws-sdk/client-cognito-identity-provider` でユーザー管理
- DIコンテナでシングルトン登録

### テスト用Dummy実装

`dummy.ts` でモック実装を提供。スモールテストで使用。

**特徴:**

- コンストラクタで各メソッドの戻り値を設定可能
- デフォルトは正常系の戻り値
- テストごとにエラーケースを簡単に設定

## 使用パターン

### ハンドラ層での使用

認証ミドルウェアでトークン検証：

```typescript
// 1. Authorizationヘッダーからトークン抽出
// 2. authClient.decodeToken()でトークン検証
// 3. payloadからuserSubを取得
// 4. Honoコンテキストに設定（USER_SUB, USER_EMAIL等）
```

### ユースケース層での使用

アカウント削除時にAuthClientを使用：

```typescript
// 1. リポジトリからドメインエンティティを削除
// 2. authClient.deleteUser()で認証プロバイダから削除
// 3. 両方成功した場合のみ成功を返す
```

## Current Userパターン

### 設計原則

認証済みユーザー自身の操作は全て `/users/me` エンドポイントを使用。

**命名規則:**

- ファイル名: `*-current-user-use-case.ts`, `*-current-user-handler.ts`
- サービスID: `*_CURRENT_USER_USE_CASE`
- エンドポイント: `POST/GET/PUT/DELETE /users/me`

### 認証フロー

1. **認証ミドルウェア** (ハンドラ層)

   - Authorizationヘッダーからトークン抽出
   - `authClient.decodeToken()`でトークン検証
   - Honoコンテキストに`USER_SUB`, `USER_EMAIL`, `USER_EMAIL_VERIFIED`を設定

2. **ハンドラ** (ハンドラ層)

   - コンテキストから`userSub`を取得
   - バリデーション（存在チェック、型チェック）
   - ユースケースに渡す

3. **ユースケース** (ユースケース層)
   - リポジトリで`findBySub({ sub })`を使用してエンティティ取得
   - ビジネスロジック実行

### セキュリティ原則

1. **トークンから取得**: `userSub`は必ずトークン（コンテキスト）から取得。URLパラメータは信頼しない
2. **自己操作のみ**: ユーザーは自分自身のデータのみ操作可能
3. **管理者機能なし**: 他ユーザーの編集・削除は実装しない

### リポジトリ要件

**必須メソッド:**

- `findBySub(props: { sub: string }): Promise<FindBySubResult>`
  - Cognito Subでユーザーを検索
  - DynamoDBキー: `PK: USER#{sub}`, `SK: USER#{sub}`

## DI設定

### 必要な登録

1. **Cognito Client**: `CognitoIdentityProviderClient`
2. **JWT Verifier**: `CognitoJwtVerifier`（aws-jwt-verify）
3. **AuthClient**: `CognitoAuthClient`（実装クラス）

### サービスID

- `COGNITO_USER_POOL_ID` - User Pool ID
- `COGNITO_CLIENT_ID` - Client ID
- `COGNITO_CLIENT` - CognitoIdentityProviderClient
- `JWT_VERIFIER` - JWTVerifier
- `AUTH_CLIENT` - AuthClient実装

## テスト戦略

### スモールテスト

`AuthClientDummy`を使用してユースケースをテスト。

**テストケース例:**

- トークンデコード成功時の処理
- トークンデコード失敗時のエラーハンドリング
- ユーザー削除成功時の処理
- ユーザー削除失敗時のエラーハンドリング

### ミディアムテスト

AuthClientの統合テストは基本的に不要。認証はモックで十分。

### 統合テスト（オプション）

実際のCognitoトークンを使用したE2Eテスト。必要に応じて実施。

## 設計判断の理由

### なぜインターフェースで抽象化するのか

1. **ドメイン層の純粋性**: AWS SDKへの直接依存を避ける
2. **テスト容易性**: Dummy実装で簡単にテスト
3. **実装の切り替え**: Cognito以外の認証基盤への移行が容易
4. **依存関係の方向**: ドメイン層 ← インフラ層（依存性逆転の原則）

### なぜResult型を使用するのか

- 明示的なエラーハンドリング
- 例外を使わない関数型プログラミングスタイル
- 型安全性の向上

### なぜCurrent Userパターンを採用するのか

- URLにユーザーIDを含めないことでセキュリティ向上
- 認証トークンを唯一の真実の情報源とする
- シンプルな権限モデル（自己操作のみ）

## 参考

- `../../README.md` - ドメイン層全体の設計原則
- `../../model/{entity}/{entity}-repository.ts` - リポジトリパターン
- `../logger/README.md` - Loggerインターフェース
- `../../../use-case/README.md` - ユースケースでの使用方法
- `../../../handler/README.md` - ハンドラでの使用方法
- `../../../infrastructure/auth-client/` - Cognito実装
