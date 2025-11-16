# DynamoDB Unit of Work

DynamoDBのトランザクション機能を使ったUnit of Workパターンの実装。

## 使用例

### 1. UnitOfWorkRunnerの作成

```typescript
import { DynamoDBUnitOfWorkRunner } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work-runner";
import type { DynamoDBUnitOfWork } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work";

// UoWコンテキストの型定義（必要なリポジトリをまとめる）
type UoWContext = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

// ファクトリー関数でRunnerを作成
function createUnitOfWorkRunner(params: {
  ddbDoc: DynamoDBDocumentClient;
  todoRepositoryFactory: (uow: DynamoDBUnitOfWork) => TodoRepository;
  userRepositoryFactory: (uow: DynamoDBUnitOfWork) => UserRepository;
  logger: Logger;
}): UnitOfWorkRunner<UoWContext> {
  const { ddbDoc, todoRepositoryFactory, userRepositoryFactory, logger } =
    params;

  return new DynamoDBUnitOfWorkRunner({ ddbDoc, logger }, (uow) => ({
    todoRepository: todoRepositoryFactory(uow),
    userRepository: userRepositoryFactory(uow),
  }));
}
```

### 2. Use Caseでの使用

```typescript
class CreateTodoUseCase {
  constructor(
    private runner: UnitOfWorkRunner<UoWContext>,
    private logger: Logger,
  ) {}

  async execute(command: CreateTodoCommand): Promise<Result<Todo, DomainError>> {
    try {
      // トランザクション内で複数のリポジトリ操作を実行
      const result = await this.runner.run(async (uow) => {
        this.logger.info("TODO作成トランザクションを開始します");

        // Todo保存
        const todo = new Todo({ ... });
        await uow.todoRepository.save(todo);

        // User更新
        const user = await uow.userRepository.findById(command.userId);
        const updatedUser = user.incrementTodoCount();
        await uow.userRepository.save(updatedUser);

        return todo;
      });

      // run()が成功すれば自動的にコミットされている
      return { success: true, data: result };
    } catch (error) {
      // エラー時は自動的にロールバックされている
      this.logger.error("TODOの作成に失敗しました", error);
      return { success: false, error: new UnexpectedError() };
    }
  }
}
```

### 3. Repositoryの実装

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
    uow?: DynamoDBUnitOfWork;
  }) {
    this.#ddbDoc = params.ddbDoc;
    this.#tableName = params.tableName;
    this.#logger = params.logger;
    this.#uow = params.uow;
  }

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
}
```

## 特徴

- **100個制限チェック**: DynamoDBの制限（100操作/4MB）を自動的にチェック
- **自動コミット/ロールバック**: `run()`のコールバックが成功すれば自動コミット、失敗すればロールバック
- **型安全**: TypeScriptの型システムでUoWコンテキストを定義
- **シンプルな使用方法**: Drizzle風のAPIで直感的に使える

## 制約事項

- DynamoDBトランザクションは最大100操作、合計4MBまで
- トランザクションは同一リージョン内のテーブルのみ対象
- 集約境界を跨ぐトランザクションは避けるべき（DDDの原則）
