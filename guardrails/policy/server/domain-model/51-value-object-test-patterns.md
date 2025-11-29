# Value Objectテストパターン

## 概要

このドキュメントは、Value Objectの具体的なテスト実装パターンをまとめたものである。

**関連ドキュメント**:

- **テスト概要**: `50-test-overview.md`
- **Entityテスト**: `52-entity-test-patterns.md`
- **Value Object設計**: `25-value-object-overview.md`

## テスト対象メソッド

Value Objectは以下のメソッドを持つ（`25-value-object-overview.md`参照）:

**必須メソッド**:

1. **from()** (静的ファクトリメソッド) - 必須
2. **equals()** - 必須
3. **toString()** - 必須

**条件付きメソッド**: 4. **不変条件チェックメソッド** (`canTransitionTo()`) - 不変条件がある場合

**オプションメソッド**: 5. **default()** - ビジネス的に意味のあるデフォルト値がある場合のみ 6. **ヘルパーメソッド** (`isCompleted()`, `isTodo()`等) - 必要に応じて7. **静的ファクトリメソッド** (`todo()`, `completed()`等) - from()のショートカット

**テスト不要**:

- **プライベートコンストラクタ** - 外部からアクセス不可のため直接テストしない（from()経由で間接的にテスト）

## 1. from() テスト（静的ファクトリメソッド）

**必須テストケース**:

```typescript
describe("from", () => {
  describe("正常系", () => {
    it("有効な値からValue Objectを作成できる", () => {
      // Act
      const result = TodoStatus.from({ status: "TODO" });

      // Assert
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

    it("小文字でも作成できる（大文字小文字の柔軟性）", () => {
      // OpenAPIではenumで大文字のみだが、Value Objectで柔軟に対応
      const result = TodoStatus.from({ status: "todo" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTodo()).toBe(true);
      }
    });
  });

  describe("異常系", () => {
    it("無効なステータス文字列の場合DomainErrorを返す", () => {
      // Act
      const result = TodoStatus.from({ status: "INVALID_STATUS" });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DomainError);
        expect(result.error.message).toContain("無効なステータス");
      }
    });

    it("空文字列の場合DomainErrorを返す", () => {
      const result = TodoStatus.from({ status: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DomainError);
      }
    });

    it("nullやundefinedの場合DomainErrorを返す", () => {
      const resultNull = TodoStatus.from({ status: null as any });
      const resultUndefined = TodoStatus.from({ status: undefined as any });

      expect(resultNull.success).toBe(false);
      expect(resultUndefined.success).toBe(false);
    });
  });
});
```

**テストカバレッジ目標**:

- ✅ 正常値（代表値、境界値）
- ✅ 異常値（不正形式、空文字列、境界値外）
- ✅ Result型の正しいチェック（`result.success`で分岐）
- ✅ エラーメッセージの内容検証

## 2. 不変条件チェックメソッドテスト

**不変条件がある場合のみ実装**（例: `TodoStatus.canTransitionTo()`）

```typescript
describe("canTransitionTo", () => {
  it("未完了から完了への遷移は許可される", () => {
    // Arrange
    const todo = TodoStatus.todo();
    const completed = TodoStatus.completed();

    // Act
    const result = todo.canTransitionTo(completed);

    // Assert
    expect(result.success).toBe(true);
  });

  it("完了から未完了への遷移は禁止される", () => {
    // Arrange
    const completed = TodoStatus.completed();
    const todo = TodoStatus.todo();

    // Act
    const result = completed.canTransitionTo(todo);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.message).toContain(
        "完了済みTODOのステータスは変更できません",
      );
    }
  });

  it("同じステータスへの遷移は許可される", () => {
    const completed = TodoStatus.completed();

    const result = completed.canTransitionTo(completed);

    expect(result.success).toBe(true);
  });

  it("進行中から完了への遷移は許可される", () => {
    const inProgress = TodoStatus.inProgress();
    const completed = TodoStatus.completed();

    const result = inProgress.canTransitionTo(completed);

    expect(result.success).toBe(true);
  });
});
```

**テストカバレッジ目標**:

- ✅ 許可される遷移パターン（全組み合わせ）
- ✅ 禁止される遷移パターン（全組み合わせ）
- ✅ エラーメッセージの検証

## 3. equals() テスト

```typescript
describe("equals", () => {
  it("同じ値のValue Objectは等価である", () => {
    // Arrange
    const status1 = TodoStatus.todo();
    const status2 = TodoStatus.todo();

    // Assert
    expect(status1.equals(status2)).toBe(true);
  });

  it("静的ファクトリメソッドから生成した同じステータスは等価である", () => {
    const status1Result = TodoStatus.from({ status: "TODO" });
    const status2Result = TodoStatus.from({ status: "TODO" });

    expect(status1Result.success).toBe(true);
    expect(status2Result.success).toBe(true);
    if (status1Result.success && status2Result.success) {
      expect(status1Result.data.equals(status2Result.data)).toBe(true);
    }
  });

  it("異なる値のValue Objectは等価でない", () => {
    const todo = TodoStatus.todo();
    const completed = TodoStatus.completed();

    expect(todo.equals(completed)).toBe(false);
  });
});
```

## 4. default() テスト（オプション）

```typescript
describe("default", () => {
  it("デフォルト値を持つValue Objectを返す", () => {
    // Act
    const email = Email.default();

    // Assert
    expect(email.toString()).toBe("noreply@company.com");
  });

  it("デフォルト値は常に同じ値である", () => {
    const email1 = Email.default();
    const email2 = Email.default();

    expect(email1.equals(email2)).toBe(true);
  });
});
```

**注**: `default()`メソッドは必須ではなく、ビジネス的に意味のあるデフォルト値がある場合のみ実装する。

## 5. toString() テスト

```typescript
describe("toString", () => {
  it("値の文字列表現を返す", () => {
    // Arrange
    const status = TodoStatus.todo();

    // Assert
    expect(status.toString()).toBe("TODO");
  });

  it("静的ファクトリメソッドから生成したValue Objectの文字列表現", () => {
    const statusResult = TodoStatus.from({ status: "COMPLETED" });

    expect(statusResult.success).toBe(true);
    if (statusResult.success) {
      expect(statusResult.data.toString()).toBe("COMPLETED");
    }
  });
});
```

## 6. ヘルパーメソッドテスト

```typescript
describe("isCompleted", () => {
  it("COMPLETEDステータスの場合trueを返す", () => {
    const completed = TodoStatus.completed();

    expect(completed.isCompleted()).toBe(true);
  });

  it("TODOステータスの場合falseを返す", () => {
    const todo = TodoStatus.todo();

    expect(todo.isCompleted()).toBe(false);
  });

  it("IN_PROGRESSステータスの場合falseを返す", () => {
    const inProgress = TodoStatus.inProgress();

    expect(inProgress.isCompleted()).toBe(false);
  });
});

describe("isTodo", () => {
  it("TODOステータスの場合trueを返す", () => {
    const todo = TodoStatus.todo();

    expect(todo.isTodo()).toBe(true);
  });

  it("COMPLETEDステータスの場合falseを返す", () => {
    const completed = TodoStatus.completed();

    expect(completed.isTodo()).toBe(false);
  });
});
```

## 7. 静的ファクトリメソッドテスト（オプション）

**from()のショートカットとして提供される静的メソッド**:

```typescript
describe("todo", () => {
  it("TODOステータスのインスタンスを返す", () => {
    const status = TodoStatus.todo();

    expect(status.isTodo()).toBe(true);
    expect(status.toString()).toBe("TODO");
  });
});

describe("completed", () => {
  it("COMPLETEDステータスのインスタンスを返す", () => {
    const status = TodoStatus.completed();

    expect(status.isCompleted()).toBe(true);
    expect(status.toString()).toBe("COMPLETED");
  });
});

describe("inProgress", () => {
  it("IN_PROGRESSステータスのインスタンスを返す", () => {
    const status = TodoStatus.inProgress();

    expect(status.isInProgress()).toBe(true);
    expect(status.toString()).toBe("IN_PROGRESS");
  });
});
```

**注**: 静的ファクトリメソッドのテストは、既知の値を簡単に生成できることを確認する程度でOK。詳細なバリデーションは`from()`でテスト済み。

## Value Object Dummy

### Value Objectテスト自体でのDummy使用

**Value Objectテスト自体ではDummyファクトリ不要**（`from()`や静的ファクトリメソッドで特定の値を生成）

```typescript
// ✅ Value Objectテスト内では静的ファクトリメソッドで特定値を生成
const status = TodoStatus.todo();
const completed = TodoStatus.completed();

// または from()で特定値
const statusResult = TodoStatus.from({ status: "TODO" });
expect(statusResult.success).toBe(true);
if (statusResult.success) {
  const status = statusResult.data;
}

// default()がある場合
const email = Email.default();
```

**理由**: Value Objectテストは特定の値でバリデーションロジックを検証するため、ランダム値は不適切。

### Entity Dummyファクトリ内でのDummy使用

**Entity Dummyファクトリ内でもValue Object Dummyファクトリを使用**

Value ObjectのDummyファクトリを`{value-object}.dummy.ts`に作成し、Entity Dummyファクトリから使用する。

```typescript
// domain/model/todo/todo-status.dummy.ts
import { faker } from "@faker-js/faker";
import { TodoStatus } from "./todo-status";

export type TodoStatusDummyProps = Partial<{
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
}>;

/**
 * テスト用TodoStatusファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns TodoStatusインスタンス
 */
export const todoStatusDummyFrom = (
  props?: TodoStatusDummyProps,
): TodoStatus => {
  const statusValue =
    props?.status ??
    faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "COMPLETED"] as const);

  const result = TodoStatus.from({ status: statusValue });

  if (!result.success) {
    throw new Error(`Failed to generate TodoStatus: ${result.error.message}`);
  }

  return result.data;
};
```

```typescript
// domain/model/todo/todo.dummy.ts
import { todoStatusDummyFrom } from "./todo-status.dummy";
import { faker } from "@faker-js/faker";
import type { Todo, TodoProps } from "./todo";

export const todoDummyFrom = (overrides?: Partial<TodoProps>): Todo => {
  const now = new Date().toISOString();

  return new Todo({
    id: overrides?.id ?? faker.string.uuid(),
    title: overrides?.title ?? faker.lorem.sentence(),
    status: overrides?.status ?? todoStatusDummyFrom(), // ✅ Value Object Dummy
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  });
};
```

**理由**:

- Entity Dummyファクトリでは多様なテストケースをカバーするため、Value Objectもランダムに生成
- パターンの統一（すべて`{model}DummyFrom()`形式）
- 部分オーバーライド可能（テストで特定値が必要な場合）

### Dummyファクトリのパターン

#### パターン1: Enum型Value Object

```typescript
// project-color.dummy.ts
import { faker } from "@faker-js/faker";
import { ProjectColor } from "./project-color";

export type ProjectColorDummyProps = Partial<{
  color: "RED" | "BLUE" | "GREEN" | "YELLOW";
}>;

/**
 * テスト用ProjectColorファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns ProjectColorインスタンス
 */
export const projectColorDummyFrom = (
  props?: ProjectColorDummyProps,
): ProjectColor => {
  const colorValue =
    props?.color ??
    faker.helpers.arrayElement(["RED", "BLUE", "GREEN", "YELLOW"] as const);

  const result = ProjectColor.from({ color: colorValue });

  if (!result.success) {
    throw new Error(`Failed to generate ProjectColor: ${result.error.message}`);
  }

  return result.data;
};
```

#### パターン2: 範囲があるValue Object

```typescript
// priority.dummy.ts
import { faker } from "@faker-js/faker";
import { Priority } from "./priority";

export type PriorityDummyProps = Partial<{
  priority: number;
}>;

/**
 * テスト用Priorityファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns Priorityインスタンス
 */
export const priorityDummyFrom = (props?: PriorityDummyProps): Priority => {
  const value = props?.priority ?? faker.number.int({ min: 1, max: 5 });
  const result = Priority.from({ priority: value });

  if (!result.success) {
    throw new Error(`Failed to generate Priority: ${result.error.message}`);
  }

  return result.data;
};
```

#### パターン3: 文字列型Value Object

```typescript
// email.dummy.ts
import { faker } from "@faker-js/faker";
import { Email } from "./email";

export type EmailDummyProps = Partial<{
  email: string;
}>;

/**
 * テスト用Emailファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns Emailインスタンス
 */
export const emailDummyFrom = (props?: EmailDummyProps): Email => {
  const emailValue = props?.email ?? faker.internet.email();
  const result = Email.from({ email: emailValue });

  if (!result.success) {
    throw new Error(`Failed to generate Email: ${result.error.message}`);
  }

  return result.data;
};
```

### ファイル構成

```
domain/model/todo/
├── todo.ts                    # Entity
├── todo.dummy.ts              # Entity Dummyファクトリ（todoStatusDummyFrom()を使用）
├── todo.small.test.ts         # Entityテスト
├── todo-status.ts             # Value Object
├── todo-status.dummy.ts       # ✅ Value Object Dummyファクトリ（todoStatusDummyFrom()）
└── todo-status.small.test.ts  # Value Objectテスト（静的ファクトリ使用）
```

## テストパターン例：TodoStatus

以下は、TodoStatus Value Objectの完全なテスト例です。

```typescript
// todo-status.small.test.ts
import { describe, expect, it } from "vitest";
import { TodoStatus } from "./todo-status";
import { DomainError } from "@/util/error-util";

describe("TodoStatus", () => {
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

      it("小文字でも作成できる", () => {
        const result = TodoStatus.from({ status: "todo" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isTodo()).toBe(true);
        }
      });
    });

    describe("異常系", () => {
      it("無効なステータス文字列の場合DomainErrorを返す", () => {
        const result = TodoStatus.from({ status: "INVALID" });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(DomainError);
        }
      });
    });
  });

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
    });
  });

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

  describe("toString", () => {
    it("値の文字列表現を返す", () => {
      const status = TodoStatus.todo();

      expect(status.toString()).toBe("TODO");
    });
  });

  describe("ヘルパーメソッド", () => {
    describe("isCompleted", () => {
      it("COMPLETEDステータスの場合trueを返す", () => {
        const completed = TodoStatus.completed();

        expect(completed.isCompleted()).toBe(true);
      });

      it("TODOステータスの場合falseを返す", () => {
        const todo = TodoStatus.todo();

        expect(todo.isCompleted()).toBe(false);
      });
    });

    describe("isTodo", () => {
      it("TODOステータスの場合trueを返す", () => {
        const todo = TodoStatus.todo();

        expect(todo.isTodo()).toBe(true);
      });

      it("COMPLETEDステータスの場合falseを返す", () => {
        const completed = TodoStatus.completed();

        expect(completed.isTodo()).toBe(false);
      });
    });
  });

  describe("静的ファクトリメソッド", () => {
    describe("todo", () => {
      it("TODOステータスのインスタンスを返す", () => {
        const status = TodoStatus.todo();

        expect(status.isTodo()).toBe(true);
        expect(status.toString()).toBe("TODO");
      });
    });

    describe("completed", () => {
      it("COMPLETEDステータスのインスタンスを返す", () => {
        const status = TodoStatus.completed();

        expect(status.isCompleted()).toBe(true);
        expect(status.toString()).toBe("COMPLETED");
      });
    });
  });
});
```

## チェックリスト

### Value Objectテスト

```
[ ] from()の正常系・異常系テスト（必須）
[ ] equals()テスト（必須）
[ ] toString()テスト（必須）
[ ] 不変条件チェックメソッドテスト（不変条件がある場合）
[ ] default()テスト（ある場合）
[ ] ヘルパーメソッドテスト（ある場合）
[ ] 静的ファクトリメソッドテスト（ある場合）
[ ] Result型の正しいチェック（必須）
[ ] エラー型とメッセージの検証（必須）
[ ] 境界値テスト
[ ] ファイル名: {value-object}.small.test.ts
[ ] テスト内では静的ファクトリメソッドまたはfrom()を使用（Dummy不要）
```

### Value Object Dummyファクトリ

```
[ ] {value-object}.dummy.tsファイル作成
[ ] {ValueObject}DummyProps型を定義（Partial<>型）
[ ] {valueObject}DummyFrom()関数を実装
[ ] faker.helpers.arrayElement()で有効値からランダム選択（Enum型の場合）
[ ] from()でResult型をチェックし、失敗時はエラーをthrow
[ ] Entity Dummyファクトリから使用
[ ] JSDocコメント追加（@param, @returns）
[ ] 部分オーバーライド可能（props?: Partial<>）
```
