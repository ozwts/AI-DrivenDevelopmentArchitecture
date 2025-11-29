# Entityテストパターン

## 概要

このドキュメントは、Entityの具体的なテスト実装パターンをまとめたものである。

**関連ドキュメント**:
- **テスト概要**: `50-test-overview.md`
- **Value Objectテスト**: `51-value-object-test-patterns.md`
- **Entity設計**: `20-entity-overview.md`

## テスト対象メソッド

Entityは以下のメソッドを持つ（`20-entity-overview.md`参照）:

1. **コンストラクタ** - 必須
2. **専用更新メソッド** (`changeStatus()`等) - 必須
3. **静的ファクトリメソッド** (`reconstruct()`) - 必須

## 1. コンストラクタテスト

```typescript
describe("constructor", () => {
  it("すべてのプロパティを持つインスタンスを作成できる", () => {
    // Arrange
    const status = TodoStatus.todo();

    // Act
    const todo = new Todo({
      id: "todo-123",
      title: "新しいタスク",
      description: "タスクの説明",
      status,
      dueDate: "2024-12-31T23:59:59.000Z",
      completedAt: undefined,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Assert
    expect(todo.id).toBe("todo-123");
    expect(todo.title).toBe("新しいタスク");
    expect(todo.description).toBe("タスクの説明");
    expect(todo.status.isTodo()).toBe(true);
    expect(todo.dueDate).toBe("2024-12-31T23:59:59.000Z");
    expect(todo.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(todo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("undefinedフィールドを明示的に渡してインスタンスを作成できる", () => {
    const status = TodoStatus.todo();

    const todo = new Todo({
      id: "todo-123",
      title: "必須項目のみのタスク",
      description: undefined,  // 明示的にundefinedを渡す
      status,
      dueDate: undefined,      // 明示的にundefinedを渡す
      completedAt: undefined,  // 明示的にundefinedを渡す
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(todo.id).toBe("todo-123");
    expect(todo.title).toBe("必須項目のみのタスク");
    expect(todo.description).toBeUndefined();
    expect(todo.dueDate).toBeUndefined();
  });

  it("Value Objectを保持できる", () => {
    const status = TodoStatus.completed();

    const todo = new Todo({
      id: "todo-123",
      title: "タスク",
      description: undefined,
      status,
      dueDate: undefined,
      completedAt: undefined,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(todo.status).toBeInstanceOf(TodoStatus);
    expect(todo.status.isCompleted()).toBe(true);
  });
});
```

**テストカバレッジ目標**:
- ✅ 必須プロパティのみでインスタンス作成
- ✅ オプショナルプロパティ含めてインスタンス作成
- ✅ Value Objectが正しく保持されること

## 2. 専用メソッドテスト（changeStatus等）

**Value Objectを保持するEntityの専用更新メソッド**:

```typescript
describe("changeStatus", () => {
  it("ステータスを変更した新しいインスタンスを返す", () => {
    // Arrange
    const todo = new Todo({
      id: "todo-123",
      title: "タスク",
      status: TodoStatus.todo(),
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    const updated = todo.changeStatus(
      TodoStatus.completed(),
      "2024-01-02T00:00:00.000Z"
    );

    // Assert
    expect(updated.status.isCompleted()).toBe(true);
    expect(updated.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(updated.id).toBe(todo.id);
    expect(updated.title).toBe(todo.title);
  });

  it("元のインスタンスは変更されない", () => {
    const todo = new Todo({
      id: "todo-123",
      title: "タスク",
      status: TodoStatus.todo(),
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    todo.changeStatus(
      TodoStatus.completed(),
      "2024-01-02T00:00:00.000Z"
    );

    // Assert
    expect(todo.status.isTodo()).toBe(true);
    expect(todo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
  });
});
```

## 3. reconstruct()テスト

```typescript
describe("reconstruct", () => {
  it("すべてのフィールドで新しいインスタンスを再構成できる", () => {
    // Arrange
    const status = TodoStatus.completed();

    // Act
    const result = Todo.reconstruct({
      id: "todo-123",
      title: "再構成されたタスク",
      description: "説明",
      status,
      dueDate: "2024-12-31T23:59:59.000Z",
      completedAt: "2024-01-02T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("todo-123");
      expect(result.data.title).toBe("再構成されたタスク");
      expect(result.data.status.isCompleted()).toBe(true);
    }
  });

  it("複数値関係性チェックに違反する場合はDomainErrorを返す", () => {
    // Arrange
    const completedStatus = TodoStatus.completed();

    // Act - 完了TODOだが期限がない（不正）
    const result = Todo.reconstruct({
      id: "todo-123",
      title: "タスク",
      description: undefined,
      status: completedStatus,
      dueDate: undefined,  // 完了TODOは期限必須
      completedAt: "2024-01-02T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.message).toContain("期限");
    }
  });

  it("undefinedフィールドを明示的に渡して再構成できる", () => {
    // Arrange
    const status = TodoStatus.todo();

    // Act
    const result = Todo.reconstruct({
      id: "todo-123",
      title: "タスク",
      description: undefined,  // 明示的にundefined
      status,
      dueDate: undefined,      // 明示的にundefined
      completedAt: undefined,  // 明示的にundefined
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.dueDate).toBeUndefined();
    }
  });
});
```

## テスト用ファクトリ（Dummy）実装パターン

### Entity Dummy

```typescript
// todo.dummy.ts
import { Todo } from "./todo";
import { TodoStatus } from "./todo-status";

export type TodoDummyProps = Partial<{
  id: string;
  title: string;
  description: string | undefined;
  status: TodoStatus;
  dueDate: string | undefined;
  completedAt: string | undefined;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用Todoファクトリ
 */
export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  return new Todo({
    id: props?.id ?? "test-todo-id",
    title: props?.title ?? "Test Task",
    description: props?.description,
    status: props?.status ?? TodoStatus.todo(),
    dueDate: props?.dueDate,
    completedAt: props?.completedAt,
    createdAt: props?.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: props?.updatedAt ?? "2024-01-01T00:00:00.000Z",
  });
};
```

**使用例**:

```typescript
// デフォルト値でダミー生成
const todo = todoDummyFrom();

// 一部のプロパティをオーバーライド
const completedTodo = todoDummyFrom({
  title: "完了済みタスク",
  status: TodoStatus.completed(),
  completedAt: "2024-01-02T00:00:00.000Z",
});
```

## テストパターン例：Todo Entity

以下は、Todo Entityの完全なテスト例です。

```typescript
// todo.small.test.ts
import { describe, expect, it } from "vitest";
import { Todo } from "./todo";
import { TodoStatus } from "./todo-status";
import { todoDummyFrom } from "./todo.dummy";

describe("Todo", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つインスタンスを作成できる", () => {
      const status = TodoStatus.todo();

      const todo = new Todo({
        id: "todo-123",
        title: "新しいタスク",
        description: "タスクの説明",
        status,
        dueDate: "2024-12-31T23:59:59.000Z",
        completedAt: undefined,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(todo.id).toBe("todo-123");
      expect(todo.title).toBe("新しいタスク");
      expect(todo.description).toBe("タスクの説明");
      expect(todo.status.isTodo()).toBe(true);
    });

    it("undefinedフィールドを明示的に渡してインスタンスを作成できる", () => {
      const status = TodoStatus.todo();

      const todo = new Todo({
        id: "todo-123",
        title: "必須項目のみのタスク",
        description: undefined,  // 明示的にundefinedを渡す
        status,
        dueDate: undefined,      // 明示的にundefinedを渡す
        completedAt: undefined,  // 明示的にundefinedを渡す
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(todo.description).toBeUndefined();
      expect(todo.dueDate).toBeUndefined();
    });

    it("Value Objectを保持できる", () => {
      const status = TodoStatus.completed();

      const todo = new Todo({
        id: "todo-123",
        title: "タスク",
        description: undefined,
        status,
        dueDate: undefined,
        completedAt: undefined,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(todo.status).toBeInstanceOf(TodoStatus);
      expect(todo.status.isCompleted()).toBe(true);
    });
  });

  describe("changeStatus", () => {
    it("ステータスを変更した新しいインスタンスを返す", () => {
      const todo = todoDummyFrom({
        status: TodoStatus.todo(),
      });

      const updated = todo.changeStatus(
        TodoStatus.completed(),
        "2024-01-02T00:00:00.000Z"
      );

      expect(updated.status.isCompleted()).toBe(true);
      expect(updated.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("元のインスタンスは変更されない", () => {
      const todo = todoDummyFrom({
        status: TodoStatus.todo(),
      });

      todo.changeStatus(
        TodoStatus.completed(),
        "2024-01-02T00:00:00.000Z"
      );

      expect(todo.status.isTodo()).toBe(true);
    });
  });
});
```

## チェックリスト

```
[ ] constructorテスト（必須、オプショナル）
[ ] 専用メソッドテスト（changeStatus等）
[ ] イミュータブル性テスト（元のインスタンス不変）
[ ] 新しいインスタンス生成の検証
[ ] ID、createdAtは不変であることの検証
[ ] reconstruct()テスト（全フィールド、複数値関係性チェック）
[ ] Value Object保持の検証
[ ] Dummyファクトリ実装（{entity}.dummy.ts）
[ ] ファイル名: {entity}.small.test.ts
```
