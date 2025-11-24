# ドメインモデル - 全体概要

## 目的

ビジネスロジックとドメインルールを表現する純粋なTypeScriptコードを設計・実装するためのガイドライン。

## 基本原則

### 1. 外部依存ゼロ

ドメイン層は他のレイヤー（インフラ、ユースケース、ハンドラ）に依存しない。

**許可される依存:**

- TypeScript標準ライブラリのみ
- 同じドメイン層内の他のエンティティ/Value Object
- util層のResult型やエラーユーティリティ

**禁止される依存:**

- AWS SDK（`@aws-sdk/*`）
- DynamoDB
- 外部ライブラリ（Hono, Zod等）
- インフラ層、ユースケース層、ハンドラ層のコード

### 2. 不変性（Immutability）

エンティティは `readonly` プロパティで状態変更を防ぐ。更新メソッドは常に新しいインスタンスを返す。

**実装例:**

```typescript
// ❌ エンティティを変更しない
todo.status = "DONE"; // コンパイルエラー！

// ✅ 常に新しいインスタンスを返す
const updatedTodo = todo.changeStatus("DONE", now);
```

### 3. 明示的エラーハンドリング

例外を使わず、Result型 `Result<T, E>` で成功/失敗を明示的に返す。

**リポジトリインターフェース例:**

```typescript
export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;

export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
};
```

### 4. Propsパターン

将来の拡張性のため、メソッド引数はオブジェクト形式。

**実装例:**

```typescript
// ❌ 引数を直接渡さない
findById(id: string)

// ✅ オブジェクト形式で渡す
findById(props: { id: string })
```

### 5. 技術的詳細の漏洩防止

ドメインモデルにAWS、S3、DynamoDB、Cognito等の技術要素を一切含めない。

**実装例:**

```typescript
// ❌ 技術要素が漏れている
class Attachment {
  readonly s3Key: string;
  readonly dynamodbTableName: string;
}

// ✅ 抽象的な名前を使用
class Attachment {
  readonly storageKey: string;
  // テーブル名はドメインモデルに不要（インフラ層で管理）
}
```

## ディレクトリ構成

```
domain/
├── model/                    # ドメインモデル
│   ├── {entity}/            # エンティティごとにディレクトリ
│   │   ├── {entity}.ts                 # エンティティ定義
│   │   ├── {entity}.small.test.ts      # ユニットテスト
│   │   ├── {entity}.dummy.ts           # テスト用ファクトリ
│   │   ├── {entity}-repository.ts      # リポジトリインターフェース
│   │   └── {entity}-repository.dummy.ts # リポジトリモック
│   └── ...
│
└── support/                  # サポートインターフェース
    └── .../                 # 例: logger, fetch-now, auth-client, storage-client, unit-of-work等
```

## レビュー対象ファイル

- `server/src/domain/model/**/*.ts` - エンティティとリポジトリインターフェース
- ただし、以下は除外:
  - `*.small.test.ts` - テストファイル
  - `*.dummy.ts` - ダミーファクトリ

## 関連ポリシー

- **10-entity-design.md** - エンティティ設計の詳細
- **20-repository-interface.md** - リポジトリインターフェースの設計
- **30-aggregate-pattern.md** - 集約パターンの適用
