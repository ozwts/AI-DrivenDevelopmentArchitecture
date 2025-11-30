# Value Object設計：実装詳細

## 核心原則

Value Objectは**プライベートコンストラクタ**と**Props型エイリアス**を使用し、**Result型を返すfrom()メソッド**で生成する。

## 関連ドキュメント

| トピック         | ファイル                       |
| ---------------- | ------------------------------ |
| 設計概要         | `25-value-object-overview.md`  |
| バリデーション   | `11-domain-validation-strategy.md` |
| テストパターン   | `51-value-object-test-patterns.md` |

## 実装要件

### 1. ファイル命名規則

Value Objectのファイル名は**`.vo.ts`で終わる**。

```
domain/model/todo/
├── todo.entity.ts           # Entity
├── todo-status.vo.ts        # Value Object
```

### 2. Props型エイリアスパターン

`from()`は常にProps型エイリアスを使用（Entityのコンストラクタと統一）。

```typescript
// 単一パラメータ
export type TodoStatusProps = {
  status: string;
};

// 複数パラメータ
export type FullNameProps = {
  firstName: string;
  lastName: string;
};
```

### 3. プライベートコンストラクタとfrom()

```typescript
export class TodoStatus {
  private constructor(private readonly value: string) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(props.status)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.status));
  }
}
```

### 4. equals()とtoString()

```typescript
equals(other: TodoStatus): boolean {
  return this.value === other.value;
}

toString(): string {
  return this.value; // デバッグ用
}
```

### 5. 不変条件チェックメソッド

不変条件を持つ場合は検証メソッドを実装する。

```typescript
canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
  }
  return Result.ok(undefined);
}
```

### 6. JSDocコメント

すべてのValue Object、メソッドにJSDocを記載する。

```typescript
/**
 * TODOステータスを表す値オブジェクト
 *
 * 状態遷移ルール（不変条件）を内包する。
 * - TODO → IN_PROGRESS → COMPLETED の順に遷移可能
 * - COMPLETED からは他のステータスに変更不可
 */
export class TodoStatus {
  private constructor(private readonly value: string) {}

  /**
   * 文字列からTodoStatusを生成
   * @param props ステータス文字列を含むオブジェクト
   * @returns 成功時はTodoStatus、失敗時はDomainError
   */
  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> { ... }

  /**
   * 新しいステータスへの遷移が可能かチェック
   * @param newStatus 遷移先のステータス
   * @returns 遷移可能ならResult.ok、不可ならDomainError
   */
  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> { ... }

  /** 完了済みかどうか */
  isCompleted(): boolean { ... }
}
```

## Tier別実装例

### Tier 1: 不変条件あり（必須）

```typescript
// todo-status.vo.ts
export type TodoStatusProps = {
  status: string;
};

export class TodoStatus {
  private constructor(private readonly value: "TODO" | "IN_PROGRESS" | "COMPLETED") {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const normalized = props.status.toUpperCase();
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(normalized)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(normalized as any));
  }

  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    return Result.ok(undefined);
  }

  equals(other: TodoStatus): boolean { return this.value === other.value; }
  toString(): string { return this.value; }

  isCompleted(): boolean { return this.value === "COMPLETED"; }
  isTodo(): boolean { return this.value === "TODO"; }

  static todo(): TodoStatus { return new TodoStatus("TODO"); }
  static completed(): TodoStatus { return new TodoStatus("COMPLETED"); }
}
```

### Tier 2: ドメインルールあり（推奨）

```typescript
// email.vo.ts
export type EmailProps = {
  email: string;
};

export class Email {
  private constructor(readonly value: string) {}

  static from(props: EmailProps): Result<Email, DomainError> {
    // OpenAPI format: emailで基本形式はチェック済み
    // ドメイン固有ルール: 会社ドメインのみ許可
    if (!props.email.endsWith("@company.com")) {
      return Result.err(new DomainError("会社のメールアドレスのみ許可"));
    }
    return Result.ok(new Email(props.email));
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string { return this.value; }
}
```

### Tier 3: OpenAPIで表現可能（VO化不要）

```typescript
// Entity内でプリミティブとして保持
export class Todo {
  readonly id: string;                    // プリミティブ
  readonly title: string;                 // OpenAPI: minLength/maxLength
  readonly color: string | undefined;     // OpenAPI: pattern
  readonly status: TodoStatus;            // Value Object（不変条件あり）
}
```

## 禁止事項

### パブリックコンストラクタ

```typescript
// ❌ 外部から直接生成可能
export class TodoStatus {
  constructor(public value: string) {}
}
```

### throwを使用

```typescript
// ❌ 例外を投げる
static from(props: TodoStatusProps): TodoStatus {
  if (!validValues.includes(props.status)) {
    throw new Error("Invalid"); // ❌
  }
}
```

### 必ず成功するValue Object

```typescript
// ❌ バリデーションなし = VO化不要
static from(props: { value: string }): Result<UserId, never> {
  return Result.ok(new UserId(props.value));
}
```

## Do / Don't

### Good

```typescript
// todo-status.vo.ts
export type TodoStatusProps = {
  status: string;
};

export class TodoStatus {
  private constructor(private readonly value: string) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    if (!validValues.includes(props.status)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.status));
  }

  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    return Result.ok(undefined);
  }

  equals(other: TodoStatus): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
```

### Bad

```typescript
// パブリックコンストラクタ
constructor(public value: string) {} // ❌ privateでない

// Type Aliasで不変条件を表現不可
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED"; // ❌

// throwを使用
throw new Error("Invalid"); // ❌ Result型を返すべき

// 必ず成功するVO
static from(props): Result<UserId, never> {
  return Result.ok(new UserId(props.value)); // ❌ VO化不要
}
```
