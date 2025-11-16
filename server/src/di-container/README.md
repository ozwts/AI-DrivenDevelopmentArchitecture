# DI Container - 依存性注入

InversifyJSを使用した依存性注入（Dependency Injection）の設定と管理。

## ファイル構成

```
di-container/
├── register-lambda-container.ts  # Lambda用DIコンテナ設定
├── service-id.ts                 # サービスID定義
└── env-util.ts                   # 環境変数ヘルパー
```

## サービスID定義

### service-id.ts

すべてのサービスの識別子を一元管理。文字列定数として定義し、TypeScript型として `as const` で固定。

**命名規則:**

- 全て `UPPER_SNAKE_CASE` 形式
- 分類ごとにグループ化（環境変数、ユーティリティ、リポジトリ、ユースケース）
- エンティティごとにセクション分け

**分類パターン:**

```
環境変数
  ├── {RESOURCE}_TABLE_NAME
  ├── {SERVICE}_POOL_ID
  └── {SERVICE}_CLIENT_ID

ユーティリティ
  ├── LOGGER
  ├── FETCH_NOW
  └── {AWS_SERVICE}_CLIENT

リポジトリ
  └── {ENTITY}_REPOSITORY

ユースケース
  └── {ACTION}_{ENTITY}_USE_CASE
```

## DIコンテナ設定

### register-lambda-container.ts

Lambda関数用のDIコンテナを設定。すべての依存関係を登録する。

#### 登録順序

依存される順に登録することで循環参照を回避：

1. **環境変数**: 他のサービスが参照する設定値
2. **ユーティリティ**: Logger, FetchNow等の基盤サービス
3. **AWSクライアント**: DynamoDB, Cognito等の外部サービスクライアント
4. **リポジトリ**: データアクセス層（AWSクライアントに依存）
5. **ユースケース**: ビジネスロジック層（リポジトリとユーティリティに依存）

### 登録パターン

#### 1. 環境変数の登録

**用途**: プリミティブ型の設定値（文字列、数値等）

**パターン**:

- `unwrapEnv()` で環境変数を取得（未定義時にエラー）
- Singleton スコープで登録

#### 2. ユーティリティの登録

**用途**: 単一責任の基盤サービス（Logger, FetchNow等）

**パターン**:

- `new ServiceImpl(config)` でインスタンス生成
- 環境変数から設定を注入
- Singleton スコープで登録

#### 3. AWSクライアントの登録

**用途**: AWS SDKクライアント（DynamoDB, Cognito等）

**パターン**:

- AWS SDKの初期化処理
- リージョン等の設定を環境変数から取得
- Singleton スコープで登録

#### 4. リポジトリの登録

**用途**: データアクセス層の実装

**パターン**:

- `ctx.container.get()` で依存サービスを取得
  - AWSクライアント（DynamoDB等）
  - テーブル名（環境変数）
  - Logger
- `new RepositoryImpl({ deps })` でインスタンス生成
- Singleton スコープで登録

**実装例:**

```typescript
// DIコンテナに登録
container
  .bind<TodoRepository>(serviceId.TODO_REPOSITORY)
  .toDynamicValue((ctx) => {
    const ddbDoc = ctx.container.get(serviceId.DDB_DOC);
    const tableName = ctx.container.get(serviceId.TODOS_TABLE_NAME);
    const logger = ctx.container.get(serviceId.LOGGER);
    return new TodoRepositoryImpl({
      ddbDoc,
      todosTableName: tableName,
      logger,
    });
  })
  .inSingletonScope();
```

#### 5. ユースケースの登録

**用途**: ビジネスロジック層の実装

**パターン**:

- `ctx.container.get()` で依存サービスを取得
  - リポジトリ
  - ユーティリティ（Logger, FetchNow等）
  - 他のサービス（AuthClient等）
- `new UseCaseImpl({ deps })` でインスタンス生成
- Singleton スコープで登録

## 新しいサービスの追加手順

### ステップ1: サービスIDを定義

`service-id.ts` に識別子を追加：

- `UPPER_SNAKE_CASE` 形式で命名
- 適切なグループ（環境変数、ユーティリティ、リポジトリ、ユースケース）に配置
- コメントでセクション分け

### ステップ2: DIコンテナに登録

`register-lambda-container.ts` にバインディングを追加：

- `container.bind<Interface>(serviceId.{SERVICE_ID})` で型とIDを紐付け
- `.toDynamicValue()` でインスタンス生成ロジックを定義
- 依存サービスは `ctx.container.get<Type>(serviceId.{DEPENDENCY})` で取得
- `.inSingletonScope()` でスコープを指定

### ステップ3: 使用側で注入

ハンドラやユースケースでサービスを取得：

- `container.get<Interface>(serviceId.{SERVICE_ID})` で型安全に取得
- 型パラメータを明示的に指定（`<Type>`）
- 取得したサービスをメソッド呼び出しで使用

## スコープ

### Singleton（推奨）

`.inSingletonScope()` でシングルトン登録。

- コンテナ内で1つのインスタンスのみ作成
- ほとんどのサービスで使用
- ステートレスなサービスに適用

### Transient（非推奨）

`.inTransientScope()` で都度生成。

- 取得するたびに新しいインスタンスを作成
- 通常は使用しない
- 特別な理由がない限りSingletonを使用

## ベストプラクティス

### 1. 依存関係の順序

依存される順に登録する：

- 基盤サービス（環境変数、ユーティリティ、AWSクライアント）を先に登録
- 依存するサービス（リポジトリ、ユースケース）を後に登録
- 循環依存を回避するため依存グラフを意識

### 2. 型安全性

明示的な型指定を使用：

- `.bind<Interface>()` で型パラメータを指定
- `.get<Type>()` で取得時も型を明示
- 型推論に頼らず明示的に型を書く
- `any` 型の使用を避ける

### 3. エラーハンドリング

環境変数の取得は `unwrapEnv` を使用：

- 環境変数が未定義の場合に早期エラー
- デフォルト値が必要な場合は `process.env.{VAR} || "default"` パターン
- 必須環境変数は起動時にチェック

### 4. グループ化

関連するサービスをコメントでグループ化：

- 環境変数セクション
- ユーティリティセクション
- リポジトリセクション
- ユースケースセクション（エンティティごと）
- 読みやすさと保守性の向上

## トラブルシューティング

### エラー: "No matching bindings found"

原因: サービスIDが登録されていない

解決策:

1. `service-id.ts` に識別子が定義されているか確認
2. `register-lambda-container.ts` でバインディングされているか確認
3. サービスIDのタイポがないか確認

### エラー: "Circular dependency"

原因: サービス間で循環依存が発生

解決策:

1. 依存関係を見直し、循環を解消
2. インターフェースを活用して依存を逆転
3. 必要に応じてサービスを分割

### 型エラー

原因: ジェネリクス型が一致しない

解決策:

- `.bind<Interface>()` と `.get<Interface>()` で同じ型を指定
- 型パラメータを明示的に記述（型推論に依存しない）
- インターフェース型を使用（実装クラスではなく）

## 参考

- [InversifyJS公式ドキュメント](https://inversify.io/)
- `server/src/domain/README.md` - ドメイン層のインターフェース定義
- `server/src/use-case/README.md` - ユースケースでのDI使用例
