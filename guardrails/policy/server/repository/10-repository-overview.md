# リポジトリ実装：概要

## 核心原則

リポジトリ実装は**集約の永続化単位**であり、**ドメインモデルとDB形式の変換**を担当し、**トランザクションで整合性を保証**する。

**関連ドキュメント**:

- **Repository Interface**: `../domain-model/30-repository-interface-overview.md`
- **集約の永続化**: `20-aggregate-persistence.md`
- **ドメインの集約**: `../domain-model/40-aggregate-overview.md`
- **DynamoDBパターン**: `30-dynamodb-patterns.md`
- **テストパターン**: `40-test-patterns.md`
- **UnitOfWork**: `../unit-of-work/10-interface.md`

## アーキテクチャ原則

### インターフェース分離原則

インターフェース定義はドメイン層、実装はインフラ層。

**依存関係の方向:**

```
ドメイン層（インターフェース）← インフラ層（実装）
```

これにより、ドメイン層はDynamoDBに依存せず、テストでモック実装に差し替え可能。

**ファイル配置:**

```
domain/model/{entity}/
└── {entity}-repository.ts        # インターフェース定義

infrastructure/repository/
└── {entity}-repository.ts         # 実装
```

## 責務

### 実施すること

1. **データ永続化**: DBへの読み書き、トランザクション管理
2. **データ変換**: ドメインモデル ⇔ DB形式の変換（Zodスキーマ使用）
3. **集約単位の操作**: 集約ルートと子エンティティを一括保存・取得
4. **ID生成**: 集約ルートと子エンティティのID生成（UUID）
5. **エラーハンドリング**: DB操作エラーをResult型で返す

### 実施しないこと

1. **単一Value Objectの不変条件チェック** → Value Object層で実施（自己検証）
2. **複数値関係性チェック** → Entity層で実施（保存時）
3. **ビジネスルール** → UseCase層で実施（DB参照、権限チェック等）
4. **型レベルバリデーション** → Handler層（OpenAPI/Zod）で実施済み
5. **子エンティティ専用リポジトリの作成** → 集約ルートリポジトリに統合
6. **子エンティティを個別操作するメソッドの作成** → 集約として操作

## 基本構造

### ファイル構成

```
infrastructure/repository/
├── todo-repository.ts              # TodoRepository実装
├── todo-repository.medium.test.ts  # Medium Test
├── project-repository.ts           # ProjectRepository実装
├── project-repository.medium.test.ts
└── user-repository.ts              # UserRepository実装
```

### クラス構造

```typescript
import type { Logger } from "@/domain/support/logger";
import type { DynamoDBUnitOfWork } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type TodoRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  todosTableName: string;
  attachmentsTableName: string;  // 子エンティティ用テーブル
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class TodoRepositoryImpl implements TodoRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;
  readonly #todosTableName: string;
  readonly #attachmentsTableName: string;
  readonly #logger: Logger;
  readonly #uow?: DynamoDBUnitOfWork;

  constructor(props: TodoRepositoryProps) {
    this.#ddbDoc = props.ddbDoc;
    this.#todosTableName = props.todosTableName;
    this.#attachmentsTableName = props.attachmentsTableName;
    this.#logger = props.logger;
    this.#uow = props.uow;
  }

  // ID生成
  todoId(): string { return uuid(); }
  attachmentId(): string { return uuid(); }

  // CRUD操作
  async findById(props: { id: string }): Promise<FindByIdResult> { ... }
  async findAll(): Promise<FindAllResult> { ... }
  async save(props: { todo: Todo }): Promise<SaveResult> { ... }
  async remove(props: { id: string }): Promise<RemoveResult> { ... }
}
```

## データ変換パターン

### Zodスキーマ定義

DB形式の型をZodスキーマで定義する。

```typescript
import { z } from "zod";

/**
 * DynamoDB格納用のスキーマ
 */
export const todoDdbItemSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TodoDdbItem = z.infer<typeof todoDdbItemSchema>;
```

### ドメインモデル → DB

```typescript
export const todoDdbItemFromTodo = (todo: Todo): TodoDdbItem => ({
  todoId: todo.id,
  title: todo.title,
  description: todo.description,
  status: todo.status,
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
});
```

### DB → ドメインモデル（Value Object生成を含む）

```typescript
export const todoDdbItemToTodo = (
  todoDdbItem: TodoDdbItem,
  attachments: Attachment[],
): Todo => {
  // Value Object生成（DBから取得したデータをValue Objectに変換）
  // from()メソッドにProps型エイリアスパターンで渡す
  const statusResult = TodoStatus.from({ status: todoDdbItem.status });

  // データ不整合の場合はデフォルト値を使用（ログ出力推奨）
  const status = statusResult.success
    ? statusResult.data
    : TodoStatus.default();

  // Entityはコンストラクタで直接生成
  // DBデータは既に整合性があると信頼（MECE原則）
  return new Todo({
    id: todoDdbItem.todoId,
    title: todoDdbItem.title,
    description: todoDdbItem.description,
    status, // Value Object（変換済み）
    attachments,
    createdAt: todoDdbItem.createdAt,
    updatedAt: todoDdbItem.updatedAt,
  });
};
```

**重要**:

- DBから取得した文字列をValue Objectに変換
- `from(props: XxxProps)`メソッドにProps型エイリアスパターンで渡す（例: `{ status: value }`）
- Value Object変換失敗時は`default()`を使用してフォールバック
- **Entityはコンストラクタで直接生成**（複数値関係性チェックは不要）
- **DBデータは既に整合性があると信頼**（MECE原則：複数値関係性チェックは保存時に完了済み）
- データ不整合が発生した場合はLogger経由でモニタリング推奨
- **throwは使わない**（全層でResult型パターンを徹底）

**なぜデフォルト値を使うべきか**:

1. **システムの可用性を優先**: throwすると処理が停止し、ユーザー体験を損なう
2. **データ移行・スキーマ変更時の柔軟性**: 古いデータや移行中のデータが存在しても動作可能
3. **Graceful Degradation**: 一部のデータが不正でも、システム全体は動作し続ける
4. **監視とアラート**: Logger経由で不整合を検出し、後で修正可能（運用で対処）
5. **ゼロダウンタイム**: データ修正中もサービスを継続できる

**例**:

```typescript
// ✅ Good: デフォルト値でフォールバック
const statusResult = TodoStatus.from({ status: todoDdbItem.status });
const status = statusResult.success ? statusResult.data : TodoStatus.default(); // デフォルト値（例: "TODO"）

if (!statusResult.success) {
  logger.warn("不正なステータス値を検出", {
    todoId: todoDdbItem.todoId,
    invalidStatus: todoDdbItem.status,
  });
}

// ❌ Bad: throwで処理を停止
const statusResult = TodoStatus.from({ status: todoDdbItem.status });
if (!statusResult.success) {
  throw new Error("Invalid status"); // システムが停止
}
```

## UnitOfWorkパターン

UnitOfWorkが渡された場合は操作を登録し、渡されていない場合は即座に実行する。

```typescript
async save(props: { todo: Todo }): Promise<SaveResult> {
  const operations = [...];  // トランザクション操作

  if (this.#uow !== undefined) {
    // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
    for (const operation of operations) {
      this.#uow.registerOperation(operation);
    }
  } else {
    // UoWなしの場合は即座に実行
    await this.#ddbDoc.send(
      new TransactWriteCommand({
        TransactItems: operations,
      }),
    );
  }

  return { success: true, data: undefined };
}
```

## エラーハンドリング

すべてのメソッドはResult型を返し、エラーをUnexpectedErrorでラップする。

```typescript
async findById(props: { id: string }): Promise<FindByIdResult> {
  try {
    // DB操作
    const result = await this.#ddbDoc.send(new GetCommand({ ... }));

    if (result.Item === undefined) {
      return { success: true, data: undefined };
    }

    const todo = todoDdbItemToTodo(result.Item);
    return { success: true, data: todo };
  } catch (error) {
    this.#logger.error("TODOの取得に失敗しました", error as Error);
    return {
      success: false,
      error: new UnexpectedError(),
    };
  }
}
```

## Do / Don't

### ✅ Good

```typescript
// Propsパターンでコンストラクタ引数を渡す
export type TodoRepositoryProps = {
  ddbDoc: DynamoDBDocumentClient;
  todosTableName: string;
  logger: Logger;
  uow?: DynamoDBUnitOfWork;
};

export class TodoRepositoryImpl implements TodoRepository {
  constructor(props: TodoRepositoryProps) { ... }
}

// Zodスキーマでパース
const todoDdbItem = todoDdbItemSchema.parse(result.Item);

// データ変換関数を使用
const todo = todoDdbItemToTodo(todoDdbItem, attachments);

// Result型でエラーを返す
return { success: false, error: new UnexpectedError() };

// UnitOfWorkをサポート
if (this.#uow !== undefined) {
  this.#uow.registerOperation(operation);
} else {
  await this.#ddbDoc.send(new TransactWriteCommand({ ... }));
}
```

### ❌ Bad

```typescript
// 個別引数で渡す（拡張性が低い）
constructor(
  ddbDoc: DynamoDBDocumentClient,
  todosTableName: string,
  logger: Logger,
) { ... }

// パースせずに使用（型安全性がない）
const todo = new Todo(result.Item as any);

// 例外をthrow（Result型を使うべき）
if (result.Item === undefined) {
  throw new Error("Not found");  // ❌ Result型を使うべき
}

// Value Object変換失敗時に例外をthrow
const statusResult = TodoStatus.from({ status });
if (!statusResult.success) {
  throw new Error("Invalid status");  // ❌ デフォルト値を使うべき
}

// UnitOfWorkをサポートしない
await this.#ddbDoc.send(new TransactWriteCommand({ ... }));  // 常に即座に実行

// 単一Value Objectの不変条件チェック（Value Object層の責務）
if (status === "COMPLETED" && !canTransitionToCompleted()) {
  throw new Error("Cannot transition");  // ❌ Value Object層で実施
}

// 複数値関係性チェック（Entity層の責務：保存時に実施済み）
if (status === "COMPLETED" && completedAt === undefined) {
  throw new Error("Completed todo must have completedAt");  // ❌ Repository層では不要（DBデータは整合性あり）
}
```

## DI設定パターン

### サービスID命名規則

`{ENTITY}_REPOSITORY`

```typescript
// service-id.ts
export const TODO_REPOSITORY = "TodoRepository";
export const PROJECT_REPOSITORY = "ProjectRepository";
```

### 登録パターン

```typescript
// register-lambda-container.ts
container
  .bind<TodoRepository>(TODO_REPOSITORY)
  .toDynamicValue((context) => {
    return new TodoRepositoryImpl({
      ddbDoc: context.container.get(DYNAMODB_DOC),
      todosTableName: env.TODOS_TABLE_NAME,
      attachmentsTableName: env.ATTACHMENTS_TABLE_NAME,
      logger: context.container.get(LOGGER),
      // uowは注入しない（各UseCaseで必要に応じて渡す）
    });
  })
  .inSingletonScope();
```

**注入する依存:**

- DynamoDBクライアント
- テーブル名（環境変数から）
- Logger
- UnitOfWorkは注入しない（各UseCaseで必要に応じて渡す）

**スコープ:** Singleton

## チェックリスト

```
[ ] インターフェースはドメイン層、実装はインフラ層
[ ] Repository Interfaceを実装している
[ ] Propsパターンでコンストラクタ引数を受け取る
[ ] Zodスキーマでパースしている
[ ] データ変換関数を使用している
[ ] DB → ドメインモデル変換時にValue Object.from(props)を使用
[ ] Value Object変換時はProps型エイリアスパターンを使用（インラインprops不可）
[ ] Value Object変換失敗時はデフォルト値を使用（throwしない）
[ ] Entityはコンストラクタで直接生成（複数値関係性チェックは不要）
[ ] DBデータの整合性を信頼（MECE原則：複数値関係性チェックは保存時完了済み）
[ ] すべてのメソッドがResult型を返す
[ ] エラーをUnexpectedErrorでラップしている（throwしない）
[ ] UnitOfWorkをサポートしている（uow?: DynamoDBUnitOfWork）
[ ] Loggerで操作をログ出力している
[ ] プライベートフィールドは#プレフィックスを使用
[ ] ID生成メソッドを提供している
[ ] 集約単位で保存・取得している（子エンティティも含む）
[ ] 単一Value Objectの不変条件チェックを実装していない（Value Object層の責務）
[ ] 複数値関係性チェックを実装していない（Entity層の責務：保存時に実施済み）
[ ] ビジネスルールを実装していない（UseCase層の責務）
[ ] 子エンティティを個別操作するメソッドを作っていない
[ ] DI設定でSingletonスコープで登録
[ ] サービスID命名規則に従っている（{ENTITY}_REPOSITORY）
```
