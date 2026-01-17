# Dummy実装の適切性検証

## @what

テストで使用するDummyファクトリが適切に実装されているか検証

## @why

Dummyファクトリを統一的に使用することで、テストの保守性を高め、モデル変更時の修正を最小化するため

## @failure

以下のパターンを検出した場合に警告:
- Repository DummyでEntity Dummyファクトリを使用していない
- テスト専用ヘルパー関数を作成している（保守コスト増）
- buildFetchNowDummyを使用していない

---

## 核心原則

**Dummyファクトリの統一使用**: すべてのテストでDummyファクトリを使用し、手動構築を避ける。

**参照**:
- `guardrails/constitution/co-evolution/testing-principles.md`（テストの原則）
- `guardrails/constitution/structural-discipline/responsibility-principles.md`（単一の真実の情報源）

---

## Dummyファクトリの種類

### 1. Entity Dummyファクトリ

**場所**: `domain/model/{entity}/{entity}.entity.dummy.ts`

**役割**: Entityのテストデータを生成

**Good**: Entity Dummyファクトリを使用
```typescript
// domain/model/todo/todo.entity.dummy.ts
export const buildTodoDummy = (overrides?: Partial<TodoProps>): Todo => {
  return Todo.from({
    id: randomUUID(),
    title: `Todo ${randomInt(1000)}`,
    description: `Description ${randomInt(1000)}`,
    status: TodoStatus.notStarted(),
    priority: Priority.medium(),
    assigneeId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }).unwrap();
};

// use-case/todo/create-todo-use-case.small.test.ts
const existingTodo = buildTodoDummy({ title: "existing-todo" });  // ✅
```

**Bad**: 手動でEntityを構築
```typescript
// use-case/todo/create-todo-use-case.small.test.ts
const existingTodo = new Todo({  // ❌ 手動構築（保守コスト増）
  id: "todo-1",
  title: "existing-todo",
  status: TodoStatus.notStarted(),
  priority: Priority.medium(),
  assigneeId: "user-1",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
});
```

---

### 2. Repository Dummyファクトリ

**場所**: `infrastructure/repository/{entity}/{entity}.repository.dummy.ts`

**役割**: Repositoryのモック実装を生成

**Good**: Entity Dummyファクトリを内部で使用
```typescript
// infrastructure/repository/todo/todo.repository.dummy.ts
export const buildTodoRepositoryDummy = (
  overrides?: Partial<TodoRepository>
): TodoRepository => {
  return {
    save: async ({ todo }) => Result.ok(todo),
    findById: async ({ id }) => Result.ok(buildTodoDummy({ id })),  // ✅ Entity Dummy使用
    findByUserId: async ({ userId }) => Result.ok([buildTodoDummy({ assigneeId: userId })]),
    delete: async () => Result.ok(undefined),
    ...overrides,
  };
};
```

**Bad**: Entity Dummyファクトリを使用しない
```typescript
// infrastructure/repository/todo/todo.repository.dummy.ts
export const buildTodoRepositoryDummy = (
  overrides?: Partial<TodoRepository>
): TodoRepository => {
  return {
    findById: async ({ id }) => Result.ok(new Todo({  // ❌ 手動構築
      id,
      title: "todo-1",
      status: TodoStatus.notStarted(),
      // ...
    })),
    // ...
  };
};
```

**理由**: Entity Dummyファクトリを使わないと、モデル変更時にRepository Dummyも修正が必要になる

---

### 3. fetchNow Dummyファクトリ

**場所**: `infrastructure/utility/fetch-now.dummy.ts`

**役割**: 現在時刻を固定値で返す

**Good**: buildFetchNowDummyを使用
```typescript
// use-case/todo/create-todo-use-case.small.test.ts
const now = new Date("2023-01-01T00:00:00Z");
const useCase = new CreateTodoUseCaseImpl({
  todoRepository: buildTodoRepositoryDummy(),
  fetchNow: buildFetchNowDummy(now),  // ✅
});
```

**Bad**: 手動でfetchNowを構築
```typescript
// use-case/todo/create-todo-use-case.small.test.ts
const useCase = new CreateTodoUseCaseImpl({
  todoRepository: buildTodoRepositoryDummy(),
  fetchNow: () => new Date("2023-01-01T00:00:00Z"),  // ❌ 手動構築
});
```

**理由**: buildFetchNowDummyを使わないと、fetchNowの実装が変わった時にすべてのテストを修正する必要がある

---

## テスト専用ヘルパー関数の禁止

**Bad**: テスト専用ヘルパー関数を作成
```typescript
// use-case/todo/test-helpers.ts ❌
export const createTestTodo = (title: string): Todo => {
  return new Todo({
    id: randomUUID(),
    title,
    status: TodoStatus.notStarted(),
    priority: Priority.medium(),
    assigneeId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

// use-case/todo/create-todo-use-case.small.test.ts
import { createTestTodo } from "./test-helpers";  // ❌

const existingTodo = createTestTodo("existing-todo");
```

**Good**: Entity Dummyファクトリを使用
```typescript
// use-case/todo/create-todo-use-case.small.test.ts
import { buildTodoDummy } from "../../../domain/model/todo/todo.entity.dummy";  // ✅

const existingTodo = buildTodoDummy({ title: "existing-todo" });
```

**理由**:
- テスト専用ヘルパー関数は保守コストを増やす
- Entity Dummyファクトリが既に存在するため、重複
- モデル変更時に2箇所（Entity Dummy + テストヘルパー）を修正する必要がある

---

## Dummyファクトリの設計原則

### 原則1: ランダム値でデフォルト生成

すべてのフィールドにランダム値を設定し、テストの独立性を保つ:

```typescript
export const buildTodoDummy = (overrides?: Partial<TodoProps>): Todo => {
  return Todo.from({
    id: randomUUID(),                    // ✅ ランダム
    title: `Todo ${randomInt(1000)}`,    // ✅ ランダム
    status: TodoStatus.notStarted(),
    priority: Priority.medium(),
    assigneeId: randomUUID(),            // ✅ ランダム
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }).unwrap();
};
```

### 原則2: 必要なフィールドのみオーバーライド

テストでは必要なフィールドのみを指定:

```typescript
const existingTodo = buildTodoDummy({ title: "existing-todo" });  // ✅
```

### 原則3: モデル変更時の修正を1箇所に集約

Entity Dummyファクトリのみを修正すれば、すべてのテストが動作する:

```typescript
// todo.entity.ts にフィールド追加
export type TodoProps = {
  // ...
  newField: string;  // 新フィールド
};

// todo.entity.dummy.ts のみ修正
export const buildTodoDummy = (overrides?: Partial<TodoProps>): Todo => {
  return Todo.from({
    // ...
    newField: `NewField ${randomInt(1000)}`,  // ✅ ここだけ追加
    ...overrides,
  }).unwrap();
};

// すべてのテストは修正不要 ✅
```

---

## レビュー時のチェックリスト

- [ ] Repository DummyでEntity Dummyファクトリを使用しているか？
- [ ] テスト専用ヘルパー関数を作成していないか？
- [ ] buildFetchNowDummyを使用しているか？
- [ ] Dummyファクトリがランダム値でデフォルト生成しているか？
- [ ] テストで必要なフィールドのみをオーバーライドしているか？

---

## 関連ドキュメント

- **テストの原則**: `guardrails/constitution/co-evolution/testing-principles.md`
- **責務の原則**: `guardrails/constitution/structural-discipline/responsibility-principles.md`
- **テスト概要**: `guardrails/policy/server/use-case/30-testing-overview.md`
- **テストカバレッジ**: `guardrails/policy/vertical/semantic/server/use-case/test-coverage-appropriateness.md`
