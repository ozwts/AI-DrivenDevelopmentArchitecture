# Entityテストパターン

## 核心原則

すべてのテストコードで**Dummyファクトリを使用**し、`new Entity()`を直接使わない（保守性向上）。

## 関連ドキュメント

| トピック         | ファイル                       |
| ---------------- | ------------------------------ |
| テスト概要       | `50-test-overview.md`          |
| Value Objectテスト | `51-value-object-test-patterns.md` |
| Entity設計       | `20-entity-overview.md`        |
| 共通Dummyヘルパー | `server/src/util/testing-util/dummy-data.ts` |

## テスト対象

| 対象               | テスト内容                       | 方法                     |
| ------------------ | -------------------------------- | ------------------------ |
| `from()`異常系     | 不整合データのエラー             | `Todo.from()`を直接呼ぶ  |
| 専用更新メソッド   | 正常系、イミュータブル性         | Dummyファクトリを使用    |

**注意**: `from()`正常系のテストは不要。Dummyファクトリが内部で`from()`を呼ぶため、Dummyが動作すれば検証済み。

## テストパターン

### from()異常系テスト（直接呼び出し）

Dummyファクトリは正常データしか生成しないため、不整合データのテストは`from()`を直接呼ぶ。

```typescript
describe("from", () => {
  it("不整合なデータの場合DomainErrorを返す", () => {
    const result = Todo.from({
      id: "todo-123",
      title: "タスク",
      description: undefined,
      status: TodoStatus.completed(),
      dueDate: undefined,
      completedAt: undefined, // 完了済みなのにcompletedAtがない
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DomainError);
    }
  });
});
```

### 専用メソッドテスト（Dummyファクトリ使用）

```typescript
describe("complete", () => {
  it("完了した新しいインスタンスを返す", () => {
    const todo = todoDummyFrom({
      status: TodoStatus.todo(),
      dueDate: "2024-12-31T23:59:59.000Z",
    });

    const result = todo.complete(
      "2024-01-02T00:00:00.000Z",
      "2024-01-02T00:00:00.000Z",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status.isCompleted()).toBe(true);
      expect(result.data.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    }
  });

  it("元のインスタンスは変更されない", () => {
    const todo = todoDummyFrom({
      status: TodoStatus.todo(),
      dueDate: "2024-12-31T23:59:59.000Z",
    });

    todo.complete("2024-01-02T00:00:00.000Z", "2024-01-02T00:00:00.000Z");

    expect(todo.status.isTodo()).toBe(true); // 不変
  });
});
```

## Entity Dummyファクトリ

### 実装パターン

```typescript
// todo.entity.dummy.ts
import { Todo, TodoStatus } from "./todo.entity";
import { todoStatusDummyFrom } from "./todo-status.vo.dummy";
import {
  getDummyId,
  getDummyShortText,
  getDummyDescription,
  getDummyRecentDate,
  getDummyDueDate,
} from "@/util/testing-util/dummy-data";

export type TodoDummyProps = Partial<{
  id: string;
  title: string;
  description: string | undefined;  // オプショナル（undefinedを許容）
  status: TodoStatus;               // 必須
  dueDate: string | undefined;      // オプショナル（undefinedを許容）
  createdAt: string;
  updatedAt: string;
}>;

export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  const now = getDummyRecentDate();

  return Todo.from({
    // 必須フィールド: ?? を使用
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    status: props?.status ?? todoStatusDummyFrom(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,

    // オプショナルフィールド: "key" in props パターンを使用
    // 理由: 明示的に undefined を指定した場合と、キーを省略した場合を区別する
    description:
      props !== undefined && "description" in props
        ? props.description
        : getDummyDescription(),
    dueDate:
      props !== undefined && "dueDate" in props
        ? props.dueDate
        : getDummyDueDate(),
  });
};
```

### フィールド種別による書き分け

| フィールド種別 | 型の例 | パターン | 理由 |
| --- | --- | --- | --- |
| 必須 | `status: TodoStatus` | `props?.status ?? default` | undefinedは渡されない |
| オプショナル | `description: string \| undefined` | `"key" in props` | 明示的undefinedとキー省略を区別 |

**なぜ区別が必要か：**

```typescript
// ❌ ?? だけだと区別できない
todoDummyFrom({ description: undefined })  // → getDummyDescription() が使われる（意図と異なる）
todoDummyFrom({})                          // → getDummyDescription() が使われる

// ✅ "key" in props なら区別できる
todoDummyFrom({ description: undefined })  // → undefined が設定される（意図通り）
todoDummyFrom({})                          // → getDummyDescription() が使われる
```

### 使用例

```typescript
// ランダム値でダミー生成
const todo = todoDummyFrom();

// 一部のプロパティをオーバーライド
const completedTodo = todoDummyFrom({
  title: "完了済みタスク",
  status: TodoStatus.completed(),
});
```

## 共通Dummyヘルパー

**ファイル**: `server/src/util/testing-util/dummy-data.ts`

```typescript
import { fakerJA as faker } from "@faker-js/faker";

export const getDummyId = () => faker.string.uuid();
export const getDummyShortText = () => faker.lorem.words({ min: 1, max: 5 });
export const getDummyDescription = () => faker.lorem.paragraph();
export const getDummyRecentDate = () => faker.date.recent().toISOString();

// オプショナルフィールド用（50%の確率でundefined）
export const getDummyDueDate = () =>
  faker.helpers.maybe(() => faker.date.future().toISOString(), {
    probability: 0.5,
  });
```

**重要**: Value Object用のヘルパーは作らず、Value Object Dummyファクトリを使用する。

## ファイル構成

```
domain/model/todo/
├── todo.entity.ts              # Entity
├── todo.entity.dummy.ts        # Entity Dummy（VO Dummyを使用）
├── todo.entity.small.test.ts   # Entityテスト
├── todo-status.vo.ts           # Value Object
├── todo-status.vo.dummy.ts     # VO Dummyファクトリ
└── todo-status.vo.small.test.ts
```

## Do / Don't

### Good

```typescript
// Dummyファクトリを使用
const todo = todoDummyFrom({ title: "テスト" });

// 一部オーバーライド
const completedTodo = todoDummyFrom({
  status: TodoStatus.completed(),
  completedAt: now,
});
```

### Bad

```typescript
// テストで直接Todo.from()を使用（専用メソッドテストの場合）
const result = Todo.from({
  id: "todo-1",
  title: "タスク",
  status: TodoStatus.todo(),
  // ... モデル変更時に全テストを修正する必要がある
}); // ❌ Dummyファクトリを使用すべき（from()異常系テスト以外）

// 固定値を使用
export const todoDummyFrom = (): Todo => {
  const result = Todo.from({
    id: "test-todo-id", // ❌ ランダム値を使う
    title: "Test Task",
    // ...
  });
  return result.data!;
};
```
