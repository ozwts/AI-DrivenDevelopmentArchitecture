# 技術非依存の命名（セマンティックレビュー）

> **Note:** 技術非依存の命名は文脈依存のため、静的解析ではなくセマンティックレビューで検証します。

## レビュー観点

### 1. 型名・インターフェース名

ポート層の型名は特定技術に依存しない抽象的な名前を使用しているか？

**確認項目:**
- [ ] クラウドプロバイダー固有の名前を避けているか（AWS, GCP, Azure等）
- [ ] データベース固有の名前を避けているか（DynamoDB, PostgreSQL等）
- [ ] ミドルウェア固有の名前を避けているか（Redis, Kafka等）

**Good:**
```typescript
export type StorageClient = { ... };
export type AuthClient = { ... };
export type DocumentClient = { ... };
export type Logger = { ... };
```

**Bad:**
```typescript
export type S3Client = { ... };           // AWS S3固有
export type CognitoAuthClient = { ... };  // AWS Cognito固有
export type DynamoDBClient = { ... };     // AWS DynamoDB固有
export type CloudWatchLogger = { ... };   // AWS CloudWatch固有
```

---

### 2. メソッド名

メソッド名は技術固有の操作ではなく、ドメインの操作を表現しているか？

**Good:**
```typescript
// ドメインの操作を表現
generatePresignedUploadUrl(props: { key: string }): Promise<Result<string, UnexpectedError>>;
deleteObject(props: { key: string }): Promise<Result<void, UnexpectedError>>;
```

**Bad:**
```typescript
// S3固有の操作名
putObject(props: { bucket: string; key: string }): Promise<void>;
getSignedUrl(operation: string, params: object): Promise<string>;
```

---

### 3. 引数・戻り値の型

引数や戻り値に技術固有の概念が漏れ出ていないか？

**Good:**
```typescript
// 抽象的な概念
type AuthPayload = {
  userSub: string;
  issuer?: string;
};
```

**Bad:**
```typescript
// Cognito固有の概念
type CognitoUserAttributes = {
  "cognito:username": string;
  "cognito:groups": string[];
};
```

---

### 4. エラー型

エラー型に技術固有のエラーコードが露出していないか？

**Good:**
```typescript
type AuthError = InvalidTokenError | ExpiredTokenError | UnauthorizedError;
```

**Bad:**
```typescript
type AuthError =
  | CognitoNotAuthorizedException
  | CognitoExpiredTokenException
  | CognitoUserNotFoundException;
```

---

## 技術非依存命名の指針

| 技術固有名 | 推奨される抽象名 |
|-----------|----------------|
| S3Client | StorageClient |
| CognitoClient | AuthClient |
| DynamoDBClient | DocumentClient, DataClient |
| CloudWatchLogger | Logger |
| SQSClient | QueueClient, MessageClient |
| SNSClient | NotificationClient |
| SESClient | EmailClient |

---

## 判断基準

以下の質問に「いいえ」と答えられれば、技術非依存である：

1. この名前を見て、特定のクラウドプロバイダーを連想するか？
2. この名前を見て、特定のデータベース製品を連想するか？
3. 別の技術に置き換えた場合、この名前は不自然になるか？

---

## 関連する静的解析ポリシー

| ファイル | 検証内容 |
|---------|---------|
| `type-alias-definition.ts` | typeエイリアスの使用 |
| `result-type-return.ts` | Result型の返却 |
| `props-pattern.ts` | Propsパターンの使用 |
