# ポート層の全体像

## 核心原則

ポートは**外部サービスへの抽象インターフェース**であり、**ドメイン・ユースケース層の純粋性を保ちながら外部機能を提供**する。

## 関連ドキュメント

| トピック      | ファイル                                          |
| ------------- | ------------------------------------------------- |
| Logger        | `../logger/10-logger-overview.md`                 |
| FetchNow      | `../fetch-now/10-fetch-now-overview.md`           |
| StorageClient | `../storage-client/10-storage-client-overview.md` |
| AuthClient    | `../auth-client/10-auth-client-overview.md`       |
| UnitOfWork    | `../unit-of-work/10-unit-of-work-overview.md`     |

## ポート一覧

| ポート           | 責務                     | 使用箇所                     |
| ---------------- | ------------------------ | ---------------------------- |
| Logger           | ログ出力の抽象化         | UseCase, Handler, Repository |
| FetchNow         | 現在時刻取得の抽象化     | UseCase                      |
| StorageClient    | ファイルストレージ操作   | UseCase                      |
| AuthClient       | 認証サービス操作         | UseCase, Handler             |
| UnitOfWorkRunner | トランザクション境界管理 | UseCase                      |

## 設計原則

### 依存性逆転の原則（DIP）

- **インターフェース**: `application/port/` に定義
- **実装**: `infrastructure/` に配置
- **注入**: DIコンテナで接続

```
UseCase層 → Port（インターフェース） ← Infrastructure層（実装）
```

### 型定義の方針

ポートで定義する型（インターフェース、DTO）は**typeエイリアス**で統一する。

```typescript
export type AuthPayload = {
  userSub: string;
  issuer?: string;
};

export type AuthClient = {
  decodeToken(token: string): Promise<AuthPayload>;
};

export type FetchNow = () => Date;
```

### エラーハンドリング

例外が発生しうる操作は**Result型**を返し、例外を投げない。

```typescript
// ✅ Good: Result型で失敗を表現
export type StorageClient = {
  deleteObject(props: { key: string }): Promise<Result<void, UnexpectedError>>;
};

// ❌ Bad: 例外を投げる
export type StorageClient = {
  deleteObject(props: { key: string }): Promise<void>;  // 失敗時にthrow
};
```

### 技術詳細の隠蔽

ポートは技術固有の名前を避け、ドメインの言葉で表現する。

```typescript
// ✅ Good: 技術非依存の名前
type StorageClient = { ... }
type AuthClient = { ... }

// ❌ Bad: 技術固有の名前
type S3Client = { ... }
type CognitoClient = { ... }
```

### テスタビリティ

各ポートにはDummy実装を提供し、テスト時の差し替えを容易にする。

```
port/
├── logger/
│   ├── index.ts      # インターフェース定義
│   └── dummy.ts      # テスト用Dummy実装
```

## 責務

### 実施すること

1. **抽象インターフェース定義**: 外部サービスへの契約を定義
2. **Dummy実装の提供**: テスト用のモック実装を提供

### 実施しないこと

1. **具体的な実装** → Infrastructure層で実施
2. **ビジネスロジック** → UseCase層で実施
3. **ドメインルール** → Domain層で実施

## ファイル構成

### コード構造

```
application/
└── port/
    ├── logger/
    │   ├── index.ts
    │   └── dummy.ts
    ├── fetch-now/
    │   ├── index.ts
    │   └── dummy.ts
    ├── storage-client/
    │   ├── index.ts
    │   └── dummy.ts
    ├── auth-client/
    │   ├── index.ts
    │   └── dummy.ts
    └── unit-of-work/
        ├── index.ts
        └── dummy.ts
```

### ポリシー構造

```
policy/server/
├── port/           # 本ファイル（概要のみ）
├── logger/         # 個別ポリシー
├── fetch-now/
├── storage-client/
├── auth-client/
└── unit-of-work/
```

## Do / Don't

### ✅ Good

```typescript
// 技術非依存のインターフェース
export type StorageClient = {
  generatePresignedUploadUrl(props: {
    key: string;
    contentType: string;
  }): Promise<Result<string, UnexpectedError>>;
};

// Dummy実装の提供
export const buildStorageClientDummy = (): StorageClient => ({
  generatePresignedUploadUrl: async () =>
    Result.ok("https://example.com/presigned-url"),
});
```

### ❌ Bad

```typescript
// 技術固有のインターフェース
export type S3Client = {
  putObject(bucket: string, key: string): Promise<void>; // ❌ S3固有
};

export type CognitoAuthClient = {  // ❌ Cognito固有
  adminGetUser(userPoolId: string, username: string): Promise<...>;
};
```
