# Value Objectテストパターン

## 核心原則

Value Objectテストは**静的ファクトリメソッドまたはfrom()で特定値を生成**し、**Dummyファクトリ不要**（Entity Dummyファクトリ内では使用）。

## 関連ドキュメント

| トピック         | ファイル                       |
| ---------------- | ------------------------------ |
| テスト概要       | `50-test-overview.md`          |
| Entityテスト     | `52-entity-test-patterns.md`   |
| Value Object設計 | `25-value-object-overview.md`  |

## テスト対象メソッド

| メソッド               | テスト要否 | 備考                           |
| ---------------------- | ---------- | ------------------------------ |
| from()                 | 必須       | 正常系・異常系                 |
| equals()               | 必須       | 同値・異値                     |
| toString()             | 必須       | 文字列表現                     |
| canTransitionTo()      | 条件付き   | 不変条件がある場合             |
| default()              | 条件付き   | メソッドがある場合             |
| ヘルパーメソッド       | 条件付き   | メソッドがある場合             |
| 静的ファクトリメソッド | 条件付き   | メソッドがある場合             |

## テストパターン

### from() テスト

```typescript
describe("from", () => {
  describe("正常系", () => {
    it("有効な値からValue Objectを作成できる", () => {
      const result = TodoStatus.from({ status: "TODO" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTodo()).toBe(true);
      }
    });

    it("すべての有効なステータスから作成できる", () => {
      const todoResult = TodoStatus.from({ status: "TODO" });
      const inProgressResult = TodoStatus.from({ status: "IN_PROGRESS" });
      const completedResult = TodoStatus.from({ status: "COMPLETED" });

      expect(todoResult.success).toBe(true);
      expect(inProgressResult.success).toBe(true);
      expect(completedResult.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("無効なステータス文字列の場合DomainErrorを返す", () => {
      const result = TodoStatus.from({ status: "INVALID" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DomainError);
        expect(result.error.message).toContain("無効なステータス");
      }
    });
  });
});
```

### 不変条件チェックメソッドテスト

```typescript
describe("canTransitionTo", () => {
  it("未完了から完了への遷移は許可される", () => {
    const todo = TodoStatus.todo();
    const completed = TodoStatus.completed();

    const result = todo.canTransitionTo(completed);

    expect(result.success).toBe(true);
  });

  it("完了から未完了への遷移は禁止される", () => {
    const completed = TodoStatus.completed();
    const todo = TodoStatus.todo();

    const result = completed.canTransitionTo(todo);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DomainError);
    }
  });
});
```

### equals() テスト

```typescript
describe("equals", () => {
  it("同じ値のValue Objectは等価である", () => {
    const status1 = TodoStatus.todo();
    const status2 = TodoStatus.todo();

    expect(status1.equals(status2)).toBe(true);
  });

  it("異なる値のValue Objectは等価でない", () => {
    const todo = TodoStatus.todo();
    const completed = TodoStatus.completed();

    expect(todo.equals(completed)).toBe(false);
  });
});
```

### toString() テスト

```typescript
describe("toString", () => {
  it("値の文字列表現を返す", () => {
    const status = TodoStatus.todo();

    expect(status.toString()).toBe("TODO");
  });
});
```

## Value Object Dummyファクトリ

**Entity Dummyファクトリ内で使用するため作成する。**

```typescript
// todo-status.vo.dummy.ts
import { faker } from "@faker-js/faker";
import { TodoStatus } from "./todo-status.vo";

export type TodoStatusDummyProps = Partial<{
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
}>;

export const todoStatusDummyFrom = (props?: TodoStatusDummyProps): TodoStatus => {
  const statusValue = props?.status ??
    faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "COMPLETED"] as const);

  const result = TodoStatus.from({ status: statusValue });

  if (!result.success) {
    throw new Error(`Failed to generate TodoStatus: ${result.error!.message}`);
  }

  return result.data!;
};
```

**Entity Dummyファクトリでの使用**:

```typescript
// todo.entity.dummy.ts
import { todoStatusDummyFrom } from "./todo-status.vo.dummy";

export const todoDummyFrom = (overrides?: Partial<TodoProps>): Todo => {
  const result = Todo.from({
    id: overrides?.id ?? faker.string.uuid(),
    title: overrides?.title ?? faker.lorem.sentence(),
    status: overrides?.status ?? todoStatusDummyFrom(), // VO Dummyを使用
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  });

  if (!result.success) {
    throw new Error(`Failed to generate Todo: ${result.error.message}`);
  }
  return result.data;
};
```

## ファイル構成

```
domain/model/todo/
├── todo.entity.ts                  # Entity
├── todo.entity.dummy.ts            # Entity Dummy（VO Dummyを使用）
├── todo.entity.small.test.ts       # Entityテスト
├── todo-status.vo.ts               # Value Object
├── todo-status.vo.dummy.ts         # VO Dummyファクトリ
└── todo-status.vo.small.test.ts    # VOテスト（静的ファクトリ使用）
```
