# ドメインモデルテスト戦略

## 核心原則

ドメインモデル（Entity、Value Object）は**外部依存ゼロ**のため、**Small Testのみで完全に検証**する。

## テスト戦略の全体像

### ドメイン層の特徴とテスト方針

| 観点 | 特徴 | テスト方針 |
|------|------|-----------|
| 外部依存 | なし（純粋TypeScript） | Small Testのみ |
| 実行速度 | 高速 | 全テストを毎回実行 |
| テスト対象 | ドメインルール、不変条件、データ変換 | 網羅的にテスト |
| モック | 不要 | 実装のみテスト |

**参照**:
- `20-entity-design.md` - Entity設計の基本
- `25-value-object-design.md` - Value Object設計とメソッド一覧
- `26-validation-strategy.md` - Always Valid原則、Value Object徹底活用

## テストファイル構成

```
domain/model/{entity}/
├── {entity}.ts                    # Entity本体
├── {entity}.small.test.ts         # Entityテスト
├── {entity}.dummy.ts              # テスト用ファクトリ
├── {value-object}.ts              # Value Object本体
├── {value-object}.small.test.ts   # Value Objectテスト
└── {entity}-repository.ts         # リポジトリインターフェース
```

### ファイル命名規則

| 種類 | パターン | 例 |
|------|---------|-----|
| Entity Small Test | `{entity}.small.test.ts` | `todo.small.test.ts`, `project.small.test.ts` |
| Value Object Small Test | `{value-object}.small.test.ts` | `project-color.small.test.ts`, `todo-status.small.test.ts` |
| Dummy Factory | `{entity}.dummy.ts` | `todo.dummy.ts`, `project.dummy.ts` |

## Value Objectテスト戦略

### テスト対象メソッド

Value Objectは以下のメソッドを持つ（`25-value-object-design.md`参照）:

**必須メソッド**:
1. **fromString()** (静的ファクトリメソッド) - 必須
2. **equals()** - 必須
3. **toString()** - 必須

**条件付きメソッド**:
4. **不変条件チェックメソッド** (`canTransitionTo()`) - 不変条件がある場合

**オプションメソッド**:
5. **default()** - ビジネス的に意味のあるデフォルト値がある場合のみ
6. **ヘルパーメソッド** (`isCompleted()`, `isTodo()`等) - 必要に応じて
7. **静的ファクトリメソッド** (`todo()`, `completed()`等) - fromString()のショートカット

**テスト不要**:
- **プライベートコンストラクタ** - 外部からアクセス不可のため直接テストしない（fromString()経由で間接的にテスト）

### 1. fromString() テスト（静的ファクトリメソッド）

**必須テストケース**:

```typescript
describe("fromString", () => {
  describe("正常系", () => {
    it("有効な値からValue Objectを作成できる", () => {
      // Act
      const result = TodoStatus.fromString("TODO");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTodo()).toBe(true);
      }
    });

    it("すべての有効なステータスから作成できる", () => {
      const todoResult = TodoStatus.fromString("TODO");
      const inProgressResult = TodoStatus.fromString("IN_PROGRESS");
      const completedResult = TodoStatus.fromString("COMPLETED");

      expect(todoResult.success).toBe(true);
      expect(inProgressResult.success).toBe(true);
      expect(completedResult.success).toBe(true);
    });

    it("小文字でも作成できる（大文字小文字の柔軟性）", () => {
      // OpenAPIではenumで大文字のみだが、Value Objectで柔軟に対応
      const result = TodoStatus.fromString("todo");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTodo()).toBe(true);
      }
    });
  });

  describe("異常系", () => {
    it("無効なステータス文字列の場合ValidationErrorを返す", () => {
      // Act
      const result = TodoStatus.fromString("INVALID_STATUS");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain("無効なステータス");
      }
    });

    it("空文字列の場合ValidationErrorを返す", () => {
      const result = TodoStatus.fromString("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it("nullやundefinedの場合ValidationErrorを返す", () => {
      const resultNull = TodoStatus.fromString(null as any);
      const resultUndefined = TodoStatus.fromString(undefined as any);

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

### 2. 不変条件チェックメソッドテスト

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
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain("完了済みTODOのステータスは変更できません");
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

### 3. equals() テスト

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
    const status1Result = TodoStatus.fromString("TODO");
    const status2Result = TodoStatus.fromString("TODO");

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

### 4. default() テスト（オプション）

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

### 5. toString() テスト

```typescript
describe("toString", () => {
  it("値の文字列表現を返す", () => {
    // Arrange
    const status = TodoStatus.todo();

    // Assert
    expect(status.toString()).toBe("TODO");
  });

  it("静的ファクトリメソッドから生成したValue Objectの文字列表現", () => {
    const statusResult = TodoStatus.fromString("COMPLETED");

    expect(statusResult.success).toBe(true);
    if (statusResult.success) {
      expect(statusResult.data.toString()).toBe("COMPLETED");
    }
  });
});
```

### 6. ヘルパーメソッドテスト

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

### 7. 静的ファクトリメソッドテスト（オプション）

**fromString()のショートカットとして提供される静的メソッド**:

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

**注**: 静的ファクトリメソッドのテストは、既知の値を簡単に生成できることを確認する程度でOK。詳細なバリデーションは`fromString()`でテスト済み。

## Entityテスト戦略

### テスト対象メソッド

Entityは以下のメソッドを持つ（`20-entity-design.md`参照）:

1. **コンストラクタ** - 必須
2. **更新メソッド** (`update()`, `changeStatus()`等) - 必須
3. **静的ファクトリメソッド** (`reconstruct()`) - オプション

### 1. コンストラクタテスト

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

  it("オプショナルプロパティを省略してインスタンスを作成できる", () => {
    const status = TodoStatus.todo();

    const todo = new Todo({
      id: "todo-123",
      title: "必須項目のみのタスク",
      status,
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
      status,
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

### 2. 更新メソッドテスト

**重要**: Entity更新メソッドは**シンプルなデータ変換のみ**（不変条件チェックなし）

```typescript
describe("update", () => {
  it("すべてのフィールドを更新した新しいインスタンスを返す", () => {
    // Arrange
    const originalStatus = TodoStatus.todo();
    const newStatus = TodoStatus.inProgress();

    const originalTodo = new Todo({
      id: "todo-123",
      title: "元のタスク",
      description: "元の説明",
      status: originalStatus,
      dueDate: "2024-12-31T23:59:59.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    const updatedTodo = originalTodo.update({
      title: "更新されたタスク",
      description: "更新された説明",
      status: newStatus,
      dueDate: "2024-12-31T23:59:59.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(updatedTodo.title).toBe("更新されたタスク");
    expect(updatedTodo.description).toBe("更新された説明");
    expect(updatedTodo.status.isInProgress()).toBe(true);
    expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(updatedTodo.id).toBe(originalTodo.id);
    expect(updatedTodo.createdAt).toBe(originalTodo.createdAt);
  });

  it("一部のフィールドのみ更新した新しいインスタンスを返す", () => {
    const status = TodoStatus.todo();

    const originalTodo = new Todo({
      id: "todo-123",
      title: "元のタスク",
      description: "元の説明",
      status,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    const updatedTodo = originalTodo.update({
      title: "更新されたタスク",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(updatedTodo.title).toBe("更新されたタスク");
    expect(updatedTodo.description).toBe(originalTodo.description);
    expect(updatedTodo.status.isTodo()).toBe(true);
    expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });

  it("元のインスタンスは変更されない（イミュータブル性）", () => {
    const originalStatus = TodoStatus.todo();
    const newStatus = TodoStatus.completed();

    const originalTodo = new Todo({
      id: "todo-123",
      title: "元のタスク",
      description: "元の説明",
      status: originalStatus,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    originalTodo.update({
      title: "更新されたタスク",
      description: "更新された説明",
      status: newStatus,
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(originalTodo.title).toBe("元のタスク");
    expect(originalTodo.description).toBe("元の説明");
    expect(originalTodo.status.isTodo()).toBe(true);
    expect(originalTodo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
    const status = TodoStatus.todo();
    const originalTodo = new Todo({
      id: "todo-123",
      title: "元のタスク",
      status,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    const updatedTodo = originalTodo.update({
      title: "更新されたタスク",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(updatedTodo).not.toBe(originalTodo);
  });

  it("Value Objectフィールドのみを更新できる", () => {
    const originalStatus = TodoStatus.todo();
    const newStatus = TodoStatus.completed();

    const originalTodo = new Todo({
      id: "todo-123",
      title: "タスク",
      status: originalStatus,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    // Act
    const updatedTodo = originalTodo.update({
      status: newStatus,
      updatedAt: "2024-01-02T00:00:00.000Z",
    });

    // Assert
    expect(updatedTodo.status.isCompleted()).toBe(true);
    expect(updatedTodo.title).toBe(originalTodo.title);
    expect(updatedTodo.description).toBe(originalTodo.description);
  });
});
```

**テストカバレッジ目標**:
- ✅ すべてのフィールド更新
- ✅ 一部のフィールドのみ更新
- ✅ イミュータブル性の検証（元のインスタンス不変）
- ✅ 新しいインスタンスが生成されること
- ✅ ID、createdAtは変更されないこと

### 3. 専用メソッドテスト（changeStatus等）

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

### Value Object Dummy

**Value Objectは通常Dummyファクトリ不要**（`fromString()`や静的ファクトリメソッドで生成）

```typescript
// テスト内で静的ファクトリメソッドで生成
const status = TodoStatus.todo();
const completed = TodoStatus.completed();

// または fromString()
const statusResult = TodoStatus.fromString("TODO");
expect(statusResult.success).toBe(true);
if (statusResult.success) {
  const status = statusResult.data;
}

// default()がある場合
const email = Email.default();
```

## テスト実行戦略

### 実行コマンド

```bash
# ドメインモデルのSmall Testのみ実行
npm run test:small -- domain/model

# 特定Entityのテスト実行
npm run test:small -- domain/model/project

# 特定ファイルのテスト実行
npm run test:small -- domain/model/project/project.small.test.ts
```

### CI/CDでの実行

| タイミング | 実行テスト | 理由 |
|-----------|----------|------|
| Pull Request作成時 | All Domain Model Tests | 高速（外部依存なし） |
| mainブランチマージ時 | All Tests | 完全な検証 |
| コミット前（pre-commit hook） | 変更ファイルのテストのみ | 高速フィードバック |

## テストカバレッジ要件

### Value Object

**必須テスト**:
```
[ ] fromString() - 正常系（代表値、境界値）
[ ] fromString() - 異常系（不正形式、空文字列、境界値外）
[ ] equals() - 同じ値、異なる値
[ ] toString() - 文字列表現の検証
[ ] Result型の正しいチェック（success分岐）
[ ] エラー型とメッセージの検証
```

**条件付きテスト**:
```
[ ] canTransitionTo() - 許可される遷移（全パターン） ※不変条件がある場合
[ ] canTransitionTo() - 禁止される遷移（全パターン） ※不変条件がある場合
[ ] default() - デフォルト値の検証 ※default()メソッドがある場合
[ ] 静的ファクトリメソッド（todo(), completed()等） ※提供される場合
[ ] ヘルパーメソッド - すべての分岐 ※ヘルパーメソッドがある場合
```

### Entity

```
[ ] constructor - すべてのプロパティ
[ ] constructor - オプショナルプロパティ省略
[ ] constructor - Value Object保持
[ ] update() - すべてのフィールド更新
[ ] update() - 一部のフィールドのみ更新
[ ] update() - イミュータブル性（元のインスタンス不変）
[ ] update() - 新しいインスタンス生成
[ ] update() - ID、createdAtは不変
[ ] 専用メソッド（changeStatus等） - 正常系
[ ] 専用メソッド - イミュータブル性
```

## Do / Don't

### ✅ Good

```typescript
// Result型を正しくチェック
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.value).toBe("#FF5733");
}

// エラー型とメッセージを検証
expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error).toBeInstanceOf(ValidationError);
  expect(result.error.message).toContain("Invalid");
}

// イミュータブル性を検証
const original = new Todo({ /* ... */ });
original.update({ title: "Updated" });
expect(original.title).toBe("元のタスク");  // 不変であることを確認

// 状態遷移パターンをテスト
const todoResult = TodoStatus.fromString("TODO");
const completedResult = TodoStatus.fromString("COMPLETED");

// Dummyファクトリを活用
const todo = todoDummyFrom({ title: "テスト" });
```

### ❌ Bad

```typescript
// Result型をチェックせずdata参照
const result = TodoStatus.fromString("TODO");
expect(result.data.isTodo()).toBe(true);  // ❌ errorの可能性

// エラー型を検証しない
expect(result.success).toBe(false);  // ❌ どのエラーかわからない

// 外部依存を使用（ドメイン層は外部依存ゼロ）
const useCase = new CreateTodoUseCaseImpl({ /* ... */ });  // ❌ ドメイン層のテストではない

// 実DBを使用
const repository = new TodoRepositoryImpl({ /* ... */ });  // ❌ ドメイン層のテストではない

// 型レベルバリデーションのテスト（Handler層の責務）
// ❌ OpenAPIでバリデーション可能な制約（Tier 3）はValue Object化不要
const colorResult = ProjectColor.fromString("#FF5733000");  // OpenAPIのpatternで検証すべき

// 不変条件チェックをEntityテストで実施
// ❌ 不変条件はValue Objectでテスト済み（MECE原則違反）
```

## MECE原則との整合性

**参照**: `26-validation-strategy.md`

ドメインモデルのテストは**第2階層：ドメインルール**のテストである。

| 階層 | テスト対象 | テスト場所 | 実施内容 |
|------|----------|-----------|---------|
| 第1階層 | 型レベルバリデーション | Handler層テスト | OpenAPI制約（minLength/maxLength/pattern） |
| **第2階層** | **ドメインルール** | **Domain層テスト（本ドキュメント）** | **Value Object不変条件、Entity不変性** |
| 第3階層 | ビジネスルール | UseCase層テスト | 権限チェック、外部依存する不変条件 |

**重要**: 型レベルバリデーション（文字列長、形式等）はHandler層でテスト済みのため、ドメイン層テストで重複しない。

## チェックリスト

### Value Objectテスト

```
[ ] fromString()の正常系・異常系テスト（必須）
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
```

### Entityテスト

```
[ ] constructorテスト（必須、オプショナル）
[ ] update()テスト（全フィールド、一部のみ）
[ ] イミュータブル性テスト（元のインスタンス不変）
[ ] 新しいインスタンス生成の検証
[ ] ID、createdAtは不変であることの検証
[ ] 専用メソッドテスト（changeStatus等）
[ ] Value Object保持の検証
[ ] Dummyファクトリ実装（{entity}.dummy.ts）
[ ] ファイル名: {entity}.small.test.ts
```

### 全般

```
[ ] 外部依存を使用していない
[ ] Small Testのみ（Medium Test不要）
[ ] MECE原則遵守（Handler層テストと重複しない）
[ ] 高速実行（外部I/Oなし）
[ ] テストが独立している（順序に依存しない）
```
