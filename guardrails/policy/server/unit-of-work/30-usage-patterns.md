# Unit of Work: 使用パターン

## 核心原則

Unit of Workは**UseCase層でトランザクション境界を定義**し、**Repository層で操作を登録**する。トランザクション不要な操作では使用しない。

**関連ドキュメント**:

- **概要**: `10-unit-of-work-overview.md`
- **DynamoDB実装**: `20-dynamodb-implementation.md`
- **Repository統合**: `../repository/10-repository-overview.md`

## UseCase層での使用パターン

### 基本パターン

```typescript
type UoWContext = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

class CreateTodoUseCase {
  constructor(private runner: UnitOfWorkRunner<UoWContext>) {}

  async execute(command: CreateTodoCommand): Promise<Result<Todo>> {
    try {
      const result = await this.runner.run(async (uow) => {
        // 1. TODOを作成
        const todo = new Todo({ ... });
        await uow.todoRepository.save(todo);

        // 2. Userのカウントを更新
        const user = await uow.userRepository.findById(command.userId);
        const updatedUser = user.incrementTodoCount();
        await uow.userRepository.save(updatedUser);

        return todo;
      });

      return { success: true, data: result };
    } catch (error) {
      this.#logger.error("TODO作成に失敗しました", error);
      return { success: false, error: new UnexpectedError() };
    }
  }
}
```

**重要**:

- `runner.run()`のコールバック内で複数のリポジトリ操作を実行
- コールバック成功時は自動コミット
- エラー発生時は自動ロールバック
- `try-catch`でエラーハンドリング

### UnitOfWorkRunnerの生成

```typescript
function createUnitOfWorkRunner(params: {
  ddbDoc: DynamoDBDocumentClient;
  todosTableName: string;
  usersTableName: string;
  logger: Logger;
}): UnitOfWorkRunner<UoWContext> {
  return new DynamoDBUnitOfWorkRunner(
    {
      ddbDoc: params.ddbDoc,
      logger: params.logger,
    },
    (uow) => ({
      // コンテキストファクトリー: UoWを渡してリポジトリを生成
      todoRepository: new TodoRepositoryImpl({
        ddbDoc: params.ddbDoc,
        tableName: params.todosTableName,
        logger: params.logger,
        uow, // UoWを注入
      }),
      userRepository: new UserRepositoryImpl({
        ddbDoc: params.ddbDoc,
        tableName: params.usersTableName,
        logger: params.logger,
        uow, // UoWを注入
      }),
    }),
  );
}
```

**重要**:

- コンテキストファクトリーは`(uow: DynamoDBUnitOfWork) => TUoW`型
- 各トランザクションごとに新しいリポジトリインスタンスを生成
- リポジトリコンストラクタに`uow`を渡す

### トランザクション不要な操作

```typescript
// ✅ Good: トランザクション不要（単一リポジトリ操作）
class GetTodoUseCase {
  constructor(private todoRepository: TodoRepository) {}

  async execute(query: GetTodoQuery): Promise<Result<Todo>> {
    // トランザクション不要 → runnerを使わない
    return await this.todoRepository.findById({ id: query.todoId });
  }
}

// ❌ Bad: 不要なトランザクション
class GetTodoUseCase {
  constructor(private runner: UnitOfWorkRunner<UoWContext>) {}

  async execute(query: GetTodoQuery): Promise<Result<Todo>> {
    // ❌ 単一の検索操作にトランザクションは不要
    return await this.runner.run(async (uow) => {
      return await uow.todoRepository.findById({ id: query.todoId });
    });
  }
}
```

**原則**:

- 検索系操作（find, list）はトランザクション不要
- 単一のリポジトリ操作はトランザクション不要
- 複数のリポジトリ操作をアトミックに実行する場合のみ使用

## Repository層での統合パターン

### コンストラクタでの受け取り

```typescript
export class TodoRepositoryImpl implements TodoRepository {
  readonly #ddbDoc: DynamoDBDocumentClient;
  readonly #tableName: string;
  readonly #logger: Logger;
  readonly #uow?: DynamoDBUnitOfWork;

  constructor(params: {
    ddbDoc: DynamoDBDocumentClient;
    tableName: string;
    logger: Logger;
    uow?: DynamoDBUnitOfWork; // オプショナル
  }) {
    this.#ddbDoc = params.ddbDoc;
    this.#tableName = params.tableName;
    this.#logger = params.logger;
    this.#uow = params.uow;
  }
}
```

**重要**:

- `uow?: DynamoDBUnitOfWork`をオプショナルで受け取る
- DIコンテナでは`uow`は渡さない（`undefined`）
- UnitOfWorkRunnerが動的に注入

### 保存メソッドでの対応

```typescript
async save(todo: Todo): Promise<SaveResult> {
  const operation = {
    Put: {
      TableName: this.#tableName,
      Item: this.toItem(todo),
    },
  };

  try {
    if (this.#uow) {
      // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
      this.#uow.registerOperation(operation);
    } else {
      // UoWなしの場合は即座に実行
      await this.#ddbDoc.send(
        new TransactWriteCommand({
          TransactItems: [operation],
        }),
      );
    }

    return { success: true, data: undefined };
  } catch (error) {
    this.#logger.error("TODOの保存に失敗しました", error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

**重要**:

- `uow`の有無をチェック
- `uow`がある場合は操作を登録（即実行しない）
- `uow`がない場合は即座に実行

### 削除メソッドでの対応

```typescript
async remove(props: { id: string }): Promise<RemoveResult> {
  const operation = {
    Delete: {
      TableName: this.#tableName,
      Key: { todoId: props.id },
    },
  };

  try {
    if (this.#uow) {
      this.#uow.registerOperation(operation);
    } else {
      await this.#ddbDoc.send(
        new TransactWriteCommand({
          TransactItems: [operation],
        }),
      );
    }

    return { success: true, data: undefined };
  } catch (error) {
    this.#logger.error("TODOの削除に失敗しました", error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

### 検索メソッド（トランザクション不要）

```typescript
async findById(props: { id: string }): Promise<FindByIdResult> {
  try {
    // 検索操作はトランザクション不要 → uowを使わない
    const result = await this.#ddbDoc.send(
      new GetCommand({
        TableName: this.#tableName,
        Key: { todoId: props.id },
      }),
    );

    if (result.Item === undefined) {
      return { success: true, data: undefined };
    }

    const todo = this.fromItem(result.Item);
    return { success: true, data: todo };
  } catch (error) {
    this.#logger.error("TODOの取得に失敗しました", error);
    return { success: false, error: new UnexpectedError() };
  }
}
```

**重要**:

- 検索系メソッド（find, list）は`uow`を使用しない
- 読み取り操作はトランザクション不要

## DI設定パターン

### リポジトリの登録

```typescript
// DIコンテナでの登録
container
  .bind<TodoRepository>(TODO_REPOSITORY)
  .toDynamicValue((context) => {
    return new TodoRepositoryImpl({
      ddbDoc: context.container.get(DYNAMODB_DOC),
      tableName: env.TODOS_TABLE_NAME,
      logger: context.container.get(LOGGER),
      // uowは注入しない（各UseCaseで必要に応じて渡す）
    });
  })
  .inSingletonScope();
```

**重要**:

- `uow`パラメータは`undefined`（注入しない）
- Singletonスコープで登録
- UnitOfWorkRunnerがコールバック内で動的に注入

### UseCaseの登録

```typescript
container
  .bind<CreateTodoUseCase>(CREATE_TODO_USE_CASE)
  .toDynamicValue((context) => {
    return new CreateTodoUseCase(
      createUnitOfWorkRunner({
        ddbDoc: context.container.get(DYNAMODB_DOC),
        todosTableName: env.TODOS_TABLE_NAME,
        usersTableName: env.USERS_TABLE_NAME,
        logger: context.container.get(LOGGER),
      }),
    );
  })
  .inSingletonScope();
```

**重要**:

- UnitOfWorkRunnerはファクトリー関数で生成
- DIコンテナには登録しない（ステートフルなため）

## テストパターン

### Dummy実装を使用したテスト

**重要**: Repository DummyとEntity Dummyファクトリを使用する。

```typescript
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";

describe("CreateTodoUseCase", () => {
  test("TODOを作成し、ユーザーのカウントを更新する", async () => {
    // Arrange: Repository DummyでEntity Dummyファクトリを使用
    const todoRepository = new TodoRepositoryDummy({
      saveReturnValue: Result.ok(undefined),
    });

    const existingUser = userDummyFrom({ id: "user-123", todoCount: 0 });
    const userRepository = new UserRepositoryDummy({
      findByIdReturnValue: Result.ok(existingUser),
      saveReturnValue: Result.ok(undefined),
    });

    const dummyRunner = new UnitOfWorkRunnerDummy(() => ({
      todoRepository,
      userRepository,
    }));

    const fetchNow = buildFetchNowDummy(new Date("2024-01-01"));
    const useCase = new CreateTodoUseCase({ runner: dummyRunner, fetchNow });

    // Act
    const result = await useCase.execute({
      userId: "user-123",
      title: "New TODO",
    });

    // Assert
    expect(result.success).toBe(true);
  });
});
```

**設計原則**:

- **Repository Dummy使用** - Entity Dummyファクトリを内部で使用
- **Entity Dummyファクトリ使用** - `todoDummyFrom()`, `userDummyFrom()`でランダム値生成
- **buildFetchNowDummy使用** - 時刻を制御可能にする
- `UnitOfWorkRunnerDummy`を使用してトランザクション処理をスキップ
- コールバックをそのまま実行（実際のDB操作なし）

### Medium Testでのトランザクション検証

**重要**: Medium TestでもEntity Dummyファクトリを使用する。

```typescript
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";

describe("CreateTodoUseCase (Medium Test)", () => {
  test("トランザクションが正常にコミットされる", async () => {
    // Arrange: 実際のDynamoDB使用
    const runner = new DynamoDBUnitOfWorkRunner({ ddbDoc, logger });
    const fetchNow = buildFetchNowDummy(new Date("2024-01-01"));
    const useCase = new CreateTodoUseCase({ runner, fetchNow });

    // Act: Entity Dummyファクトリでテストデータ作成
    const result = await useCase.execute({
      userId: "user-123",
      title: "New TODO",
    });

    // Assert
    expect(result.success).toBe(true);

    // TODOが保存されたことを確認
    const todo = await todoRepository.findById({ id: result.data.id });
    expect(todo).toBeDefined();

    // Userのカウントが更新されたことを確認
    const user = await userRepository.findById({ id: "user-123" });
    expect(user?.todoCount).toBe(1);
  });

  test("エラー時はロールバックされる", async () => {
    // Arrange
    const runner = new DynamoDBUnitOfWorkRunner({ ddbDoc, logger });
    const fetchNow = buildFetchNowDummy(new Date("2024-01-01"));
    const useCase = new CreateTodoUseCase({ runner, fetchNow });

    // Act & Assert: 意図的にエラーを発生させる
    await expect(
      useCase.execute({ userId: "non-existent-user", title: "New TODO" }),
    ).rejects.toThrow();

    // TODOが保存されていないことを確認（ロールバック）
    // ※ 実際のIDは実行時に生成されるため、全件検索で確認
    const allTodos = await todoRepository.findAll();
    expect(allTodos.data).toHaveLength(0);
  });
});
```

## Do / Don't

### ✅ Good

```typescript
// トランザクション必要な場面で使用
await runner.run(async (uow) => {
  await uow.todoRepository.save(todo);
  await uow.userRepository.save(user);
});

// Repositoryでuowの有無をチェック
if (this.#uow) {
  this.#uow.registerOperation(operation);
} else {
  await this.#ddbDoc.send(new TransactWriteCommand({ ... }));
}

// Dummy実装でテスト
const dummyRunner = new UnitOfWorkRunnerDummy(() => ({
  todoRepository: mockTodoRepository,
}));
```

### ❌ Bad

```typescript
// トランザクション不要な場面で使用
await runner.run(async (uow) => {
  // ❌ 単一の検索操作にトランザクションは不要
  return await uow.todoRepository.findById({ id });
});

// Repositoryでuowをチェックしない
async save(todo: Todo): Promise<SaveResult> {
  // ❌ uowの有無をチェックせずに即座に実行
  await this.#ddbDoc.send(new TransactWriteCommand({ ... }));
}

// DIコンテナでUnitOfWorkRunnerを登録
container.bind<UnitOfWorkRunner>(UOW_RUNNER).to(...);  // ❌ ステートフルなため不適切
```

