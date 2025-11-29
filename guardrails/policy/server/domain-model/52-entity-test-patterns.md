# Entityテストパターン

## 概要

このドキュメントは、Entityの具体的なテスト実装パターンをまとめたものである。

**核心原則**: すべてのテストコードでDummyファクトリを使用し、モデル変更時のテスト修正負荷を最小化する。

**関連ドキュメント**:
- **テスト概要**: `50-test-overview.md`
- **Value Objectテスト**: `51-value-object-test-patterns.md`
- **Entity設計**: `20-entity-overview.md`
- **共通Dummyヘルパー**: `server/src/util/testing-util/dummy-data.ts`

## テスト対象メソッド

Entityは以下のメソッドを持つ（`20-entity-overview.md`参照）:

1. **コンストラクタ** - 必須
2. **専用更新メソッド** (`changeStatus()`等) - 必須

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

## テスト用ファクトリ（Dummy）実装パターン

### 核心原則

1. **全テストでDummyファクトリを使用** - `new Entity()`を直接使わない（保守性向上）
2. **ランダム値を使用** - `faker`を使って実世界的なデータ生成
3. **オプショナルフィールドもランダム化** - 50%の確率で値を設定/undefined
4. **基本データは共通ヘルパーを活用** - `util/testing-util/dummy-data.ts`の基本ヘルパー（ID、文字列、日付等）を使用
5. **Value ObjectはDummyファクトリを使用** - 共通ヘルパーではなくValue Object Dummyファクトリを使用

### 共通Dummyヘルパー

すべてのDummyファクトリで基本データ型の共通ヘルパー関数を使用する。

**ファイル**: `server/src/util/testing-util/dummy-data.ts`

**重要**: Value Object用のヘルパーは作らず、Value Object Dummyファクトリを使用する。

```typescript
import { fakerJA as faker } from "@faker-js/faker";

// 基本ジェネレータ（ID、文字列、日付等）
export const getDummyId = () => faker.string.uuid();
export const getDummyEmail = () => faker.internet.email();
export const getDummyShortText = () => faker.lorem.words({ min: 1, max: 5 });
export const getDummyDescription = () => faker.lorem.paragraph();
export const getDummyRecentDate = () => faker.date.recent().toISOString();

// オプショナルフィールド用（50%の確率でundefined）
export const getDummyDueDate = () =>
  faker.helpers.maybe(() => faker.date.future().toISOString(), { probability: 0.5 });

// ❌ Bad: Value Object用のヘルパーは作らない
// export const getDummyTodoStatus = (): TodoStatus => ...
// → Value Object Dummyファクトリ（todoStatusDummyFrom()）を使用する
```

### Entity Dummy実装パターン

**重要**: Value Objectのランダム生成は**Value Object Dummyファクトリ**を使用する（パターン統一、部分オーバーライド可能）。

#### Value Object Dummyファクトリ使用

```typescript
// todo.dummy.ts
import { Todo } from "./todo";
import { TodoStatus } from "./todo-status";
import { todoStatusDummyFrom } from "./todo-status.dummy";  // ✅ Value Object Dummy
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
  description: string | undefined;
  status: TodoStatus;
  dueDate: string | undefined;
  completedAt: string | undefined;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用Todoファクトリ
 *
 * - ランダム値を使用（faker経由）
 * - Value ObjectはDummyファクトリを使用
 * - オプショナルフィールドは50%の確率でundefined
 * - 部分オーバーライド可能
 */
export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  const now = getDummyRecentDate();

  return new Todo({
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    description: props?.description ?? getDummyDescription(),
    status: props?.status ?? todoStatusDummyFrom(),  // ✅ Value Object Dummy
    dueDate: props?.dueDate ?? getDummyDueDate(),  // 50%でundefined
    completedAt: props?.completedAt,  // 明示的にundefined
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
```

### 使用例

```typescript
// ✅ Good: ランダム値でダミー生成
const todo = todoDummyFrom();
// → id, title, description, status, dueDateなどがランダム値
// → dueDateは50%の確率でundefined

// ✅ Good: 一部のプロパティをオーバーライド
const completedTodo = todoDummyFrom({
  title: "完了済みタスク",
  status: TodoStatus.completed(),
  completedAt: "2024-01-02T00:00:00.000Z",
});
// → title, status, completedAtのみ固定、他はランダム

// ❌ Bad: 固定値を使用（ランダム性がない）
export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  return new Todo({
    id: props?.id ?? "test-todo-id",  // ❌ 固定値
    title: props?.title ?? "Test Task",  // ❌ 固定値
    // ...
  });
};

// ❌ Bad: テストで直接new Todo()を使用
const todo = new Todo({
  id: "todo-1",
  title: "タスク",
  status: TodoStatus.todo(),
  // ... モデル変更時に全テストを修正する必要がある
});
```

### オプショナルフィールドのランダム化パターン

```typescript
// パターン1: 50%の確率でundefined
dueDate: props?.dueDate ?? getDummyDueDate(),  // getDummyDueDate()が50%でundefinedを返す

// パターン2: 常にundefined（明示的）
completedAt: props?.completedAt,  // デフォルトでundefined

// パターン3: ドメインルールに基づく条件付き
description: props?.description ??
  (Math.random() > 0.5 ? getDummyDescription() : undefined),
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

### Dummyファクトリ実装

```
[ ] Dummyファクトリを実装（{entity}.dummy.ts）
[ ] Partial<>型でProps定義（全フィールドオプション）
[ ] 基本データは共通ヘルパーを使用（getDummyId, getDummyShortText等）
[ ] fakerを使ってランダム値を生成
[ ] オプショナルフィールドは確率的にundefined（例: 50%）
[ ] 固定値を使用していない（ランダム性を確保）
[ ] createdAt/updatedAtは同じnow値を使用（一貫性）
[ ] Value ObjectはDummyファクトリを使用
[ ] Value Object Dummyファクトリをインポート（{valueObject}DummyFrom()）
```

### テスト実装

```
[ ] constructorテスト（必須、オプショナル）
[ ] 専用メソッドテスト（changeStatus等）
[ ] イミュータブル性テスト（元のインスタンス不変）
[ ] 新しいインスタンス生成の検証
[ ] ID、createdAtは不変であることの検証
[ ] Value Object保持の検証
[ ] ファイル名: {entity}.small.test.ts
[ ] 全テストケースでDummyファクトリを使用（new Entity()を直接使わない）
```
