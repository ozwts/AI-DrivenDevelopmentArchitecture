# Unit of Work: 概要

## 核心原則

Unit of Workは**トランザクション境界を管理**し、**複数のリポジトリ操作をアトミックに実行**する。コールバック成功時は自動コミット、エラー時は自動ロールバック。

**関連ドキュメント**: `../port/10-port-overview.md`

## 責務

### 実施すること

1. **トランザクション境界の管理**: 開始・コミット・ロールバック
2. **操作の登録**: 複数のリポジトリ操作をまとめる
3. **自動コミット**: 成功時の自動コミット
4. **自動ロールバック**: エラー時の自動ロールバック
5. **ACID保証**: トランザクションの4つの特性を実現

### 実施しないこと

1. **ビジネスルール** → UseCase層で実施
2. **ドメインルール** → Domain層（Value Object/Entity）で実施
3. **データ変換** → Repository層で実施
4. **個別リポジトリ操作** → Repository層で実施

## インターフェース定義

### UnitOfWork

トランザクション操作を登録・管理するインターフェース。

```typescript
export type UnitOfWork = {
  registerOperation(operation: TransactionOperation): void;
  getOperationCount(): number;
};
```

**特徴**:

- 操作を登録するだけでコミットはしない
- 複数の操作をバッチで実行
- トランザクション制約のチェック（最大件数等）

### UnitOfWorkRunner

トランザクション境界を管理し、コールバック内でトランザクション操作を実行するインターフェース。

```typescript
export type UnitOfWorkRunner<TUoW> = {
  run<TResult>(callback: (uow: TUoW) => Promise<TResult>): Promise<TResult>;
};
```

**特徴**:

- コールバック成功時は自動コミット
- エラー発生時は自動ロールバック
- コールバックの戻り値を返す

## 基本的な使用パターン

### UseCase層での使用

```typescript
class CreateTodoUseCase {
  constructor(private runner: UnitOfWorkRunner<UoWContext>) {}

  async execute(command: CreateTodoCommand): Promise<Result<Todo>> {
    return await this.runner.run(async (uow) => {
      // 複数のリポジトリ操作をトランザクション内で実行
      const todo = new Todo({ ... });
      await uow.todoRepository.save(todo);

      const user = await uow.userRepository.findById(command.userId);
      const updatedUser = user.incrementTodoCount();
      await uow.userRepository.save(updatedUser);

      return todo;
      // コールバック成功 → 自動コミット
    });
    // エラー発生 → 自動ロールバック
  }
}
```

### Repository層での対応

```typescript
export class TodoRepositoryImpl implements TodoRepository {
  readonly #uow?: DynamoDBUnitOfWork;

  constructor(params: { uow?: DynamoDBUnitOfWork; ... }) {
    this.#uow = params.uow;
  }

  async save(todo: Todo): Promise<SaveResult> {
    const operation = { Put: { TableName: this.#tableName, Item: ... } };

    if (this.#uow) {
      // UoWが渡されている場合は操作を登録（コミットはrunner側で行う）
      this.#uow.registerOperation(operation);
    } else {
      // UoWなしの場合は即座に実行
      await this.#ddbDoc.send(new TransactWriteCommand({ TransactItems: [operation] }));
    }

    return { success: true, data: undefined };
  }
}
```

## トランザクション制約

### 永続化技術固有の制約

永続化技術によってトランザクションに制約がある。

**DynamoDBの制約**:

- 最大100操作まで
- 最大4MBまで
- 同じキーへの複数操作不可

**対応方法**:

- 制約を超える場合はトランザクションを分割
- アグリゲート境界を見直す
- 必要最小限の操作のみをトランザクションに含める

## 設計判断の理由

### なぜUnit of Workパターンを使うのか

1. **データ整合性**: 複数操作をアトミックに実行
2. **ACID保証**: トランザクションの4つの特性を実現
3. **抽象化**: データベース技術の詳細を隠蔽
4. **テスト容易性**: トランザクションロジックを分離してテスト

### なぜ自動コミット/ロールバックを実装するのか

1. **コードの簡潔性**: 明示的なcommit/rollback呼び出し不要
2. **エラーハンドリングの統一**: try-catchパターンで一貫した処理
3. **トランザクション漏れ防止**: コミット忘れを防ぐ
4. **リソース管理**: トランザクション開始・終了を確実に実行

### なぜリポジトリでUnit of Workをオプショナルにするのか

1. **柔軟性**: トランザクション不要な操作もサポート
2. **後方互換性**: 既存コードへの影響を最小化
3. **パフォーマンス**: 単一操作では即座に実行
4. **段階的導入**: 必要な箇所から順次トランザクション対応

## Do / Don't

### ✅ Good

```typescript
// 自動コミット/ロールバック
const result = await runner.run(async (uow) => {
  await uow.todoRepository.save(todo);
  await uow.userRepository.save(user);
  return todo;
});
// コールバック成功 → 自動コミット
// エラー発生 → 自動ロールバック

// Repositoryでの対応: uowの有無をチェック
if (this.#uow) {
  this.#uow.registerOperation(operation);  // 登録のみ
} else {
  await this.#ddbDoc.send(new TransactWriteCommand({ ... }));  // 即座に実行
}

// テスト用Dummy実装
const dummyRunner = new UnitOfWorkRunnerDummy(() => ({
  todoRepository: mockTodoRepository,
}));
```

### ❌ Bad

```typescript
// 手動コミット/ロールバック（実装しない）
const uow = createUnitOfWork();
try {
  await uow.todoRepository.save(todo);
  await uow.commit();  // ❌ 自動コミットを使うべき
} catch (error) {
  await uow.rollback();  // ❌ 自動ロールバックを使うべき
}

// トランザクション不要な場面で使用
const result = await runner.run(async (uow) => {
  // ❌ 単一のリポジトリ操作のみ → トランザクション不要
  return await uow.todoRepository.findById({ id });
});

// Repositoryでuowをチェックしない
async save(todo: Todo): Promise<SaveResult> {
  // ❌ uowの有無をチェックせずに即座に実行
  await this.#ddbDoc.send(new TransactWriteCommand({ ... }));
}
```

