# Domain層 - ドメインモデル

ビジネスロジックとドメインルールを表現する純粋なTypeScriptコード。外部依存は一切持たない。

## 責務

- **エンティティ**: ビジネスの中核概念を不変オブジェクトとして表現
- **Value Object**: ドメイン固有の値をバリデーション付きで型安全に表現
- **リポジトリインターフェース**: データアクセスの抽象化（実装はインフラ層）
- **サポートインターフェース**: 外部依存の抽象化（Logger, FetchNow, AuthClient等）

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
│   └── value-object.ts      # Value Objectベースインターフェース
│
└── support/                  # サポートインターフェース
    ├── logger/              # ロガー（logger/README.md参照）
    ├── fetch-now/           # 時刻取得
    ├── auth-client/         # 認証クライアント（auth-client/README.md参照）
    └── unit-of-work/        # トランザクション（unit-of-work/README.md参照）
```

## 核となる設計原則

### 1. 外部依存ゼロ

ドメイン層は他のレイヤー（インフラ、ユースケース、ハンドラ）に依存しない。外部依存は全てインターフェースで抽象化。

**許可される依存:**

- TypeScript標準ライブラリのみ
- 同じドメイン層内の他のエンティティ/Value Object

**禁止される依存:**

- AWS SDK
- DynamoDB
- 外部ライブラリ（Hono, Zod等）

### 2. 不変性（Immutability）

エンティティは `readonly` プロパティで状態変更を防ぐ。更新メソッドは常に新しいインスタンスを返す。

**実装例:**

```typescript
// ❌ エンティティを変更しない
todo.status = "COMPLETED"; // 間違い！

// ✅ 常に新しいインスタンスを返す
const updatedTodo = todo.changeStatus("COMPLETED", now);
```

### 3. 明示的エラーハンドリング

例外を使わず、Result型 `Result<T, E>` で成功/失敗を明示的に返す。

### 4. Propsパターン

将来の拡張性のため、メソッド引数はオブジェクト形式。

## 集約パターン（Aggregate Pattern）

### 集約ルートと子エンティティ

ドメイン駆動設計における集約パターンを採用。関連するエンティティ群を1つの集約として扱う。

**設計原則:**

1. **集約ルート（Aggregate Root）**: 外部から参照される唯一のエンティティ

   - 例: `Todo`エンティティが集約ルート

2. **子エンティティ**: 集約ルート経由でのみアクセスされる

   - 例: `Attachment`エンティティはTodoの子エンティティ
   - **重要**: 子エンティティのドメインモデルには親のID（例: `todoId`）を含めない
   - 親子関係はリポジトリ層で管理する（DynamoDBのSK等で表現）

3. **リポジトリの集約**: 子エンティティ専用のリポジトリは作らず、親の集約ルートリポジトリに統合

   - 基本的には`TodoRepository`に`addAttachment()`は作らず、ドメインモデルの集約として`save()`で対応する。ただし、パフォーマンス懸念がある場合はその限りではない

4. **技術的詳細の漏洩防止**:
   - ドメインモデルにAWS、S3、DynamoDB、Cognito等の技術要素を一切含めない
   - プロパティ名も技術に依存しない抽象的な名前を使用（例: `s3Key` → `storageKey`）
   - ストレージ、認証などの外部依存操作はサポートインターフェース（StorageClient等）で抽象化

**実装例:**

```typescript
// ✅ 良い例: Attachmentエンティティ（技術要素なし）
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string; // S3やGCSなど特定技術に依存しない抽象的な名前
  readonly contentType: string;
  readonly fileSize: number;
  readonly uploadedAt: Date;
  readonly uploadedBy: string;
  // todoIdは不要 - 集約ルートが管理
}

// ✅ 良い例: TodoRepositoryに集約
interface TodoRepository {
  // ... 既存のTodoメソッド ...

  // Attachment関連（子エンティティの管理）
  addAttachment(props: {
    todoId: string;
    attachment: Attachment;
  }): Promise<Result>;
  listAttachments(props: { todoId: string }): Promise<Result<Attachment[]>>;
  removeAttachment(props: {
    todoId: string;
    attachmentId: string;
  }): Promise<Result>;
}

// ❌ 悪い例: todoIdをドメインモデルに含める
export class Attachment {
  readonly todoId: string; // 集約されているため不要
}

// ❌ 悪い例: 技術要素の漏洩（プロパティ名）
export class Attachment {
  readonly s3Key: string; // S3という技術要素が漏洩
  readonly s3Bucket: string; // AWS技術の漏洩
  readonly dynamoDbKey: string; // DynamoDB技術の漏洩
}

// ❌ 悪い例: AWS SDKへの直接依存
export class Attachment {
  readonly s3Object: S3Object; // AWS SDK型の直接使用
}
```

## エンティティパターン

### 基本構造

- **readonly プロパティ**: 全フィールドをreadonlyに
- **コンストラクタバリデーション**: 必須チェック、長さチェック等
- **更新メソッド**: 新しいインスタンスを返す（`update()`, `changeXxx()`等）
- **ビジネスロジックメソッド**: ドメインルールを実装

### ファイル配置

```
model/{entity}/
├── {entity}.ts                # エンティティ本体
├── {entity}.small.test.ts     # エンティティのユニットテスト
├── {entity}.dummy.ts          # テストデータ生成（{entity}DummyFrom()）
├── {entity}-repository.ts     # リポジトリインターフェース + Result型定義
└── {entity}-repository.dummy.ts  # テスト用リポジトリモック
```

## Value Objectパターン

### 設計方針

- **プライベートコンストラクタ**: 外部からの直接生成を防ぐ
- **静的ファクトリメソッド**: `fromString()` 等でバリデーション付き生成
- **Result型**: バリデーション結果を `Result<T, ValidationError>` で返す
- **等価性メソッド**: `equals()` で値の比較
- **デフォルト値**: `default()` で安全なフォールバック

### 用途

- ドメイン固有のバリデーションルール（メールアドレス、色コード等）
- 型安全性の強化（stringではなく専用の型）
- プリミティブ型の意味の明確化

## リポジトリインターフェース

### 定義場所と実装

- **インターフェース**: `domain/model/{entity}/{entity}-repository.ts`
- **実装**: `infrastructure/repository/{entity}-repository.ts`（インフラ層）

### 設計原則

1. **Propsパターン**: `method(props: { ... })` で拡張性確保
2. **Result型**: `Promise<Result<T, E>>` で明示的エラー
3. **型定義の分離**: Result型を別途export（`FindByIdResult`, `SaveResult`等）

### 必須メソッド

- ID生成: `{entity}Id(): string`
- 検索: `findById(props: { id: string }): Promise<FindByIdResult>`
- 保存: `save(props: { {entity}: Entity }): Promise<SaveResult>`
- 削除: `remove(props: { id: string }): Promise<RemoveResult>`
- その他: ビジネス要件に応じたクエリメソッド

## サポートインターフェース

### Logger

構造化ロギングインターフェース。詳細は `support/logger/README.md` 参照。

**メソッド**: `debug()`, `info()`, `warn()`, `error()`, `appendKeys()`

### FetchNow

現在時刻取得インターフェース。テスト可能性のために抽象化。

**型**: `type FetchNow = () => Date`

### AuthClient

認証クライアントインターフェース。詳細は `support/auth-client/README.md` 参照。

**メソッド**: `decodeToken()`, `getUserById()`, `verifyToken()`, `deleteUser()`

### UnitOfWork

トランザクション管理インターフェース。詳細は `support/unit-of-work/README.md` 参照。

## テスト戦略

### Dummyリポジトリ

スモールテスト用のモック実装。`{entity}-repository.dummy.ts` に配置。

**特徴:**

- コンストラクタで各メソッドの戻り値を設定可能
- デフォルトは成功パターン
- テストごとにエラーケースを簡単に設定

### Dummyファクトリ

テストデータ生成関数。`{entity}.dummy.ts` に `{entity}DummyFrom()` として実装。

**特徴:**

- `@faker-js/faker` でランダム値生成
- 部分的なプロパティ指定が可能
- `util/testing-util/dummy-data.ts` の共通ヘルパー活用

## 実装時のチェックリスト

新しいエンティティを追加する際の確認事項：

- [ ] エンティティクラスを `readonly` プロパティで定義
- [ ] コンストラクタでバリデーション実施
- [ ] 更新メソッドは新しいインスタンスを返す
- [ ] リポジトリインターフェースをドメイン層に定義
- [ ] Result型を各メソッド用に型定義
- [ ] Propsパターンでメソッド引数を定義
- [ ] スモールテスト（`.small.test.ts`）を作成
- [ ] Dummyファクトリ（`.dummy.ts`）を作成
- [ ] Dummyリポジトリ（`-repository.dummy.ts`）を作成
- [ ] Value Objectが必要な場合は適切に実装

## 参考

- `server/README.md` - サーバー全体のアーキテクチャ
- `support/logger/README.md` - Loggerインターフェース
- `support/auth-client/README.md` - AuthClientインターフェース
- `support/unit-of-work/README.md` - トランザクション管理
- `../use-case/README.md` - ユースケース層での使用方法
- `../infrastructure/repository/README.md` - リポジトリの実装パターン
