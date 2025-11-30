# Unit of Work: DynamoDB実装

## 核心原則

DynamoDB Unit of Workは**TransactWriteItems APIを使用**し、**最大100操作・4MBの制約**を自動チェックする。

**関連ドキュメント**:

- **概要**: `10-unit-of-work-overview.md`
- **使用パターン**: `30-usage-patterns.md`

## DynamoDBUnitOfWork実装

### クラス構造

```typescript
export class DynamoDBUnitOfWork implements UnitOfWork {
  readonly #operations: TransactWriteItem[] = [];
  readonly #logger: Logger;

  constructor(params: { logger: Logger }) {
    this.#logger = params.logger;
  }

  registerOperation(operation: TransactWriteItem): void {
    // 100個制限チェック
    if (this.#operations.length >= 100) {
      throw new Error("DynamoDBトランザクションは最大100操作までです");
    }

    this.#operations.push(operation);
  }

  getOperationCount(): number {
    return this.#operations.length;
  }

  getOperations(): readonly TransactWriteItem[] {
    return this.#operations;
  }
}
```

**特徴**:

1. **操作の登録**: `TransactWriteItem`を内部配列に蓄積
2. **100個制限チェック**: 登録時に自動的にチェック
3. **読み取り専用アクセス**: `getOperations()`で操作を取得

## DynamoDBUnitOfWorkRunner実装

### クラス構造

```typescript
export class DynamoDBUnitOfWorkRunner<TUoW> implements UnitOfWorkRunner<TUoW> {
  readonly #ddbDoc: DynamoDBDocumentClient;
  readonly #logger: Logger;
  readonly #contextFactory: (uow: DynamoDBUnitOfWork) => TUoW;

  constructor(
    params: {
      ddbDoc: DynamoDBDocumentClient;
      logger: Logger;
    },
    contextFactory: (uow: DynamoDBUnitOfWork) => TUoW,
  ) {
    this.#ddbDoc = params.ddbDoc;
    this.#logger = params.logger;
    this.#contextFactory = contextFactory;
  }

  async run<TResult>(
    callback: (uow: TUoW) => Promise<TResult>,
  ): Promise<TResult> {
    // 1. UnitOfWorkインスタンス生成
    const uow = new DynamoDBUnitOfWork({ logger: this.#logger });

    // 2. リポジトリコンテキスト作成
    const context = this.#contextFactory(uow);

    // 3. コールバック実行
    const result = await callback(context);

    // 4. トランザクション実行（自動コミット）
    const operations = uow.getOperations();
    if (operations.length > 0) {
      await this.#ddbDoc.send(
        new TransactWriteCommand({
          TransactItems: [...operations],
        }),
      );
      this.#logger.info(
        `トランザクションをコミットしました（${operations.length}操作）`,
      );
    }

    // 5. コールバックの戻り値を返す
    return result;
  }
}
```

**処理フロー**:

1. UnitOfWorkインスタンスを生成
2. コンテキストファクトリーでリポジトリコンテキストを作成
3. コールバックを実行（リポジトリ操作を登録）
4. トランザクション実行（自動コミット）
5. コールバックの戻り値を返す

**エラーハンドリング**:

- コールバック内でエラーが発生した場合、トランザクションは実行されない（自動ロールバック）
- TransactWriteCommandのエラーは呼び出し元に伝播

## DynamoDB制約

### 1. 最大100操作制限

DynamoDBのTransactWriteItemsは**最大100操作**まで。

**対応**:

- `registerOperation()`で登録時に自動チェック
- 100操作を超えた場合は例外をthrow

```typescript
if (this.#operations.length >= 100) {
  throw new Error("DynamoDBトランザクションは最大100操作までです");
}
```

**回避策**:

- トランザクションを分割する
- アグリゲート境界を見直す
- 子エンティティの上限を設ける

### 2. 最大4MB制限

トランザクション全体のサイズが**最大4MB**まで。

**注意**:

- 現在の実装では4MBチェックは行っていない
- 大きなデータを扱う場合は注意が必要
- TransactWriteCommandのエラーで検出される

### 3. 同じキーへの複数操作不可

同じキーに対してDeleteとPutを同一トランザクション内で行うことができない。

**対応**: Repository層でReplace戦略を実装（`../repository/20-aggregate-persistence.md`参照）

## コンテキストファクトリーパターン

### UoWコンテキストの型定義

```typescript
type UoWContext = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};
```

**設計原則**:

- トランザクション内で使用するリポジトリをまとめる
- 型安全にアクセスできる
- 必要なリポジトリのみを含める

### ファクトリー関数の実装

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
- リポジトリコンストラクタに`uow`を渡す
- 各トランザクションごとに新しいリポジトリインスタンスを生成

## TransactWriteItem型

DynamoDBのトランザクション操作型。

```typescript
type TransactWriteItem = {
  Put?: PutItemInput;
  Update?: UpdateItemInput;
  Delete?: DeleteItemInput;
  ConditionCheck?: ConditionCheckInput;
};
```

**操作種別**:

1. **Put**: アイテムの挿入・上書き
2. **Update**: アイテムの更新
3. **Delete**: アイテムの削除
4. **ConditionCheck**: 条件チェック（楽観的ロック等）

## 特徴

### 1. 自動コミット

コールバックが成功すると自動的にコミットされる。

```typescript
const result = await runner.run(async (uow) => {
  await uow.todoRepository.save(todo);
  await uow.userRepository.save(user);
  return todo;
});
// ここでトランザクションがコミットされている
```

### 2. 自動ロールバック

コールバック内でエラーが発生すると、トランザクションは実行されない（自動ロールバック）。

```typescript
try {
  await runner.run(async (uow) => {
    await uow.todoRepository.save(todo);
    throw new Error("エラー"); // エラー発生
  });
} catch (error) {
  // トランザクションは実行されていない（ロールバック）
}
```

### 3. 100個制限チェック

登録時に自動的にチェックし、100操作を超えた場合は例外をthrow。

```typescript
for (let i = 0; i < 101; i++) {
  uow.registerOperation({ Put: { ... } });
}
// Error: DynamoDBトランザクションは最大100操作までです
```

### 4. 型安全なコンテキスト

TypeScriptの型システムでUoWコンテキストを定義し、型安全にアクセスできる。

```typescript
await runner.run(async (uow) => {
  // uow.todoRepository と uow.userRepository が型安全にアクセスできる
  await uow.todoRepository.save(todo);
});
```

## パフォーマンス最適化

### バッチサイズの最適化

- 不要な操作を含めない（必要最小限の操作のみ）
- 大量データの一括処理は分割（100操作制限に応じて）
- トランザクション粒度の適切な設計

### 整合性チェックの活用

- 楽観的ロックで競合を検出（ConditionCheck）
- 条件式で整合性チェック
- 不要なトランザクション失敗を削減

### リトライ戦略

- 一時的エラーはリトライ
- 永続的エラーは即座に失敗
- エクスポネンシャルバックオフ

## Do / Don't

### ✅ Good

```typescript
// 100個制限チェック
if (this.#operations.length >= 100) {
  throw new Error("DynamoDBトランザクションは最大100操作までです");
}

// コンテキストファクトリーでリポジトリ生成
new DynamoDBUnitOfWorkRunner({ ddbDoc, logger }, (uow) => ({
  todoRepository: new TodoRepositoryImpl({ ddbDoc, tableName, logger, uow }),
}));

// 自動コミット/ロールバック
const result = await runner.run(async (uow) => {
  await uow.todoRepository.save(todo);
  return todo;
});
```

### ❌ Bad

```typescript
// 100個制限チェックなし
this.#operations.push(operation);  // チェックせずに追加

// リポジトリをシングルトンで管理（UoWを注入できない）
const todoRepository = new TodoRepositoryImpl({ ... });
new DynamoDBUnitOfWorkRunner({ ddbDoc, logger }, () => ({
  todoRepository,  // シングルトンインスタンス（UoWが注入されていない）
}));

// 手動コミット（実装しない）
await uow.commit();  // 自動コミットを使うべき
```

