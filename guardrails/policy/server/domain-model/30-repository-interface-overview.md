# リポジトリインターフェース設計

## 概要

リポジトリインターフェースは、ドメインモデルとデータアクセスの境界を定義する。実装はインフラ層に配置される。

## 必須要件

### 1. 型エイリアスで定義

リポジトリインターフェースは `type` で定義する（classではない）。

```typescript
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findAll(): Promise<FindAllResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
};
```

### 2. Result型を使用

**参照**: `@/util/result` - Result型の定義

すべてのメソッドは `Result<T, E>` 型を返す。

```typescript
import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

// 型エイリアス定義
export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
export type FindAllResult = Result<Todo[], UnexpectedError>;
export type SaveResult = Result<void, UnexpectedError>;
export type RemoveResult = Result<void, UnexpectedError>;

// リポジトリインターフェース
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findAll(): Promise<FindAllResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
};
```

**使用パターン**:
```typescript
// リポジトリ呼び出し
const result = await todoRepository.findById({ id: "123" });

// Result型の判定
if (!result.success) {
  return Result.err(result.error);  // UnexpectedError
}

if (!result.data) {
  return Result.err(new NotFoundError("TODOが見つかりません"));
}

const todo = result.data;  // Todo型が使用可能
```

### 3. Propsパターン

メソッド引数はオブジェクト形式。引数がない場合でも将来の拡張性を考慮。

```typescript
// ✅ 正しい
findById(props: { id: string }): Promise<FindByIdResult>;
save(props: { todo: Todo }): Promise<SaveResult>;

// ❌ 間違い: 引数を直接渡さない
findById(id: string): Promise<FindByIdResult>;
```

### 4. ID生成メソッド

リポジトリはエンティティIDの生成を担当する。

```typescript
export type TodoRepository = {
  /**
   * TODOIDを生成する
   */
  todoId(): string;

  /**
   * 子エンティティのIDを生成する（必要に応じて）
   */
  attachmentId(): string;

  // その他のメソッド...
};
```

### 5. JSDoc コメント

すべてのメソッドにJSDocコメントを記述する。

```typescript
export type TodoRepository = {
  /**
   * TODOIDを生成する
   */
  todoId(): string;

  /**
   * TODOをIDで検索する
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * TODOを全件検索する
   */
  findAll(): Promise<FindAllResult>;

  /**
   * TODOを保存する（新規作成・更新）
   */
  save(props: { todo: Todo }): Promise<SaveResult>;

  /**
   * TODOを削除する
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
```

## 禁止事項

### 1. 具体的な実装詳細の露出

```typescript
// ❌ 間違い: DynamoDBの詳細が漏れている
export type TodoRepository = {
  findByPartitionKey(pk: string, sk: string): Promise<FindResult>;
  putItem(item: Record<string, AttributeValue>): Promise<void>;
};

// ✅ 正しい: ドメインの概念で表現
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
};
```

### 2. 技術的な用語

```typescript
// ❌ 間違い
queryByGSI(indexName: string, key: string): Promise<QueryResult>;
scanTable(): Promise<ScanResult>;

// ✅ 正しい
findByStatus(props: { status: TodoStatus }): Promise<FindByStatusResult>;
findAll(): Promise<FindAllResult>;
```

### 3. 例外のthrow

```typescript
// ❌ 間違い: 例外を投げない
findById(props: { id: string }): Promise<Todo>; // エラー時にthrowする設計

// ✅ 正しい: Result型で明示的に表現
findById(props: { id: string }): Promise<FindByIdResult>; // Result<Todo | undefined, Error>
```

## ファイル配置

リポジトリインターフェースは、対応するエンティティと同じディレクトリに配置する。

```
domain/model/todo/
├── todo.ts                       # エンティティ
├── todo-repository.ts            # リポジトリインターフェース
├── todo-repository.dummy.ts      # ダミー実装（テスト用）
├── todo.small.test.ts            # エンティティのテスト
└── todo.dummy.ts                 # エンティティのファクトリ
```

## 検索メソッドの設計

### undefined vs 空配列

- 単一エンティティ検索: `Result<Entity | undefined, Error>`
- 複数エンティティ検索: `Result<Entity[], Error>`

```typescript
// 単一検索: 見つからない場合はundefined
findById(props: { id: string }): Promise<Result<Todo | undefined, UnexpectedError>>;

// 複数検索: 見つからない場合は空配列
findAll(): Promise<Result<Todo[], UnexpectedError>>;
findByStatus(props: { status: TodoStatus }): Promise<Result<Todo[], UnexpectedError>>;
```

## 集約との関連

子エンティティ専用のリポジトリは作らず、親の集約ルートリポジトリに統合する。

```typescript
// ❌ 間違い: 子エンティティ専用のリポジトリを作らない
export type AttachmentRepository = {
  save(props: { attachment: Attachment }): Promise<SaveResult>;
};

// ✅ 正しい: 親の集約ルートリポジトリで管理
export type TodoRepository = {
  // Todoエンティティにattachmentsが含まれているため、
  // save()で子エンティティも一緒に保存される
  save(props: { todo: Todo }): Promise<SaveResult>;
};
```

## 実装の必要最小限化

**憲法参照**: `guardrails/constitution/implementation-minimization-principles.md`

### 1. 使っていないメソッドは実装しない

**現在のユースケースで使用されていないメソッドは実装しない。**

```typescript
// ❌ Bad: 使わないメソッドを「念のため」実装
interface TodoRepository {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findAll(): Promise<FindAllResult>;           // どこでも使っていない
  count(): Promise<CountResult>;               // どこでも使っていない
  exists(props: { id: string }): Promise<ExistsResult>; // findByIdで代替可能
}

// ✅ Good: 現在必要なメソッドのみ実装
interface TodoRepository {
  findById(props: { id: string }): Promise<FindByIdResult>;
}
```

### 2. 非効率な実装を検出したら即座にリファクタリング

**findByIdをループで使っている箇所を発見したら、目先の修正で終わらせず、findByIdsを実装する。**

```typescript
// ❌ Bad: findByIdをループ（目先の修正）
for (const id of todoIds) {
  const result = await todoRepository.findById({ id });
  if (result.success) todos.push(result.data);
}

// ✅ Good: findByIdsを実装（継続的リファクタリング）
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findByIds(props: { ids: string[] }): Promise<FindByIdsResult>;  // インターフェースに遡って追加
};

const todosResult = await todoRepository.findByIds({ ids: todoIds });
```

**重要**: findByIdのループを見つけたら、その場で止まらず、インターフェースに遡ってfindByIdsを追加する。

### 3. 都度都度インターフェースを見直す

**新しいユースケースが追加されるたびに、既存インターフェースが最適かを検証する。**

```typescript
// 初期実装
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
};

// ユースケース追加: 複数TODO一括取得 → findByIds追加
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findByIds(props: { ids: string[] }): Promise<FindByIdsResult>;
};

// さらに追加: プロジェクト別TODO取得 → 専用メソッド追加（findByIdのループは許さない）
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findByIds(props: { ids: string[] }): Promise<FindByIdsResult>;
  findByProjectId(props: { projectId: string }): Promise<FindByProjectIdResult>;
};
```

### 4. 既存メソッドで代替可能なら新規実装不要

```typescript
// ❌ Bad: 既存メソッドで代替可能なのに新規実装
export type TodoRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  exists(props: { id: string }): Promise<ExistsResult>;  // findByIdで代替可能
};

// ✅ Good: 既存メソッドを活用
const result = await todoRepository.findById({ id });
const exists = result.success && result.data !== undefined;
```
