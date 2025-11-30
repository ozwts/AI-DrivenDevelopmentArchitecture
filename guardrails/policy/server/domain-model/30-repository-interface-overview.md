# リポジトリインターフェース設計

## 核心原則

リポジトリインターフェースは**ドメインモデルとデータアクセスの境界を定義**し、**型エイリアスで定義**して**Result型を返す**。

## 関連ドキュメント

| トピック           | ファイル                           |
| ------------------ | ---------------------------------- |
| リポジトリ実装     | `../repository/10-repository-overview.md` |
| UseCaseテスト      | `../use-case/30-use-case-testing.md`      |
| Entity Dummy       | `52-entity-test-patterns.md`              |

## 実装要件

### 1. 型エイリアスで定義

リポジトリインターフェースは`type`で定義する（classではない）。

```typescript
export type TodoRepository = {
  todoId(): string;
  findById(props: { id: string }): Promise<FindByIdResult>;
  findAll(): Promise<FindAllResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
};
```

### 2. Result型を使用

すべてのメソッドは`Result<T, E>`型を返す。

```typescript
import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
export type FindAllResult = Result<Todo[], UnexpectedError>;
export type SaveResult = Result<void, UnexpectedError>;
```

### 3. Propsパターン

メソッド引数はオブジェクト形式。

```typescript
// Good
findById(props: { id: string }): Promise<FindByIdResult>;

// Bad
findById(id: string): Promise<FindByIdResult>; // ❌ 直接引数
```

### 4. ID生成メソッド

リポジトリはエンティティIDの生成を担当する。

```typescript
export type TodoRepository = {
  todoId(): string;
  attachmentId(): string; // 子エンティティのID（必要に応じて）
  // ...
};
```

### 5. 検索メソッドの戻り値

- 単一エンティティ検索: `Result<Entity | undefined, Error>`
- 複数エンティティ検索: `Result<Entity[], Error>`

```typescript
findById(props: { id: string }): Promise<Result<Todo | undefined, UnexpectedError>>;
findAll(): Promise<Result<Todo[], UnexpectedError>>;
```

### 6. JSDocコメント

すべてのリポジトリインターフェース、メソッドにJSDocを記載する。

```typescript
/**
 * TODOリポジトリインターフェース
 *
 * TODOエンティティの永続化を担当する。
 * 子エンティティ（Attachment）も含めて管理する。
 */
export type TodoRepository = {
  /** TODOIDを生成する */
  todoId(): string;

  /** 添付ファイルIDを生成する */
  attachmentId(): string;

  /**
   * TODOをIDで検索する
   * @param props 検索条件
   * @returns 見つかった場合はTodo、見つからない場合はundefined
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * TODOを保存する（新規作成・更新）
   * @param props 保存するTodo
   */
  save(props: { todo: Todo }): Promise<SaveResult>;

  /**
   * TODOを削除する
   * @param props 削除対象のID
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
```

## 禁止事項

### 具体的な実装詳細の露出

```typescript
// ❌ DynamoDBの詳細が漏れている
findByPartitionKey(pk: string, sk: string): Promise<FindResult>;

// Good: ドメインの概念で表現
findById(props: { id: string }): Promise<FindByIdResult>;
```

### 例外のthrow

```typescript
// ❌ 例外を投げる設計
findById(props: { id: string }): Promise<Todo>;

// Good: Result型で明示的に表現
findById(props: { id: string }): Promise<FindByIdResult>;
```

## ファイル配置

```
domain/model/todo/
├── todo.entity.ts              # Entity
├── todo.repository.ts          # リポジトリインターフェース
├── todo.repository.dummy.ts    # Dummy実装（Small Test用）
└── todo.entity.dummy.ts        # Entity Dummy
```

## Repository Dummy

**目的**: UseCase/UnitOfWorkのSmall Testで使用する軽量なモック実装。

```typescript
import { todoDummyFrom } from "./todo.entity.dummy";
import type { TodoRepository, FindByIdResult, SaveResult } from "./todo.repository";

export type TodoRepositoryDummyProps = {
  findByIdReturnValue?: FindByIdResult;
  saveReturnValue?: SaveResult;
};

export class TodoRepositoryDummy implements TodoRepository {
  readonly #findByIdReturnValue: FindByIdResult;
  readonly #saveReturnValue: SaveResult;

  constructor(props?: TodoRepositoryDummyProps) {
    this.#findByIdReturnValue = props?.findByIdReturnValue ?? {
      success: true,
      data: todoDummyFrom(), // Entity Dummyファクトリを使用
    };
    this.#saveReturnValue = props?.saveReturnValue ?? {
      success: true,
      data: undefined,
    };
  }

  todoId(): string { return uuid(); }
  async findById(_props: { id: string }): Promise<FindByIdResult> {
    return this.#findByIdReturnValue;
  }
  async save(_props: { todo: unknown }): Promise<SaveResult> {
    return this.#saveReturnValue;
  }
}
```

## 集約との関連

子エンティティ専用のリポジトリは作らず、親の集約ルートリポジトリに統合する。

```typescript
// ❌ 子エンティティ専用のリポジトリ
export type AttachmentRepository = { ... };

// Good: 親の集約ルートリポジトリで管理
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>; // 子エンティティも一緒に保存
};
```

## Do / Don't

### Good

```typescript
// リポジトリインターフェース
export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
export type SaveResult = Result<void, UnexpectedError>;

export type TodoRepository = {
  todoId(): string;
  findById(props: { id: string }): Promise<FindByIdResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
};

// 使用例
const result = await todoRepository.findById({ id: "123" });
if (!result.success) {
  return Result.err(result.error);
}
if (!result.data) {
  return Result.err(new NotFoundError("TODOが見つかりません"));
}
const todo = result.data;
```

### Bad

```typescript
// classで定義
export class TodoRepository { ... } // ❌ typeを使う

// 実装詳細の露出
findByPartitionKey(pk: string, sk: string) // ❌ ドメイン概念で表現

// 直接引数
findById(id: string) // ❌ Propsパターンを使う

// 例外を投げる
findById(props: { id: string }): Promise<Todo> // ❌ Result型を返す

// 子エンティティ専用リポジトリ
export type AttachmentRepository = { ... } // ❌ 集約ルートで管理
```
