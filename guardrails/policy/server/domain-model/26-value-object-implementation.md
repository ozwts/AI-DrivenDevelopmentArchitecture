# Value Object設計：実装詳細

## 核心原則

Value Objectは**ES2022プライベートフィールド（#）**と**Props型エイリアス**を使用し、**Result型を返すfrom()メソッド**で生成する。

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

### 3. ES2022プライベートフィールドとプライベートコンストラクタ

**ES2022のプライベートフィールド（#）を使用**する。これによりESLint違反を回避しつつ、真のプライベート性を実現する。

```typescript
// 値の型を定義
type TodoStatusValue = "TODO" | "IN_PROGRESS" | "COMPLETED";

export class TodoStatus {
  // ES2022プライベートフィールド（意味のある名前を使用）
  readonly #status: TodoStatusValue;

  // コンストラクタにボディを持たせる（パラメータプロパティを使わない）
  private constructor(status: TodoStatusValue) {
    this.#status = status;
  }

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
    if (!validStatuses.includes(props.status as TodoStatusValue)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.status as TodoStatusValue));
  }

  // getterで値を公開（フィールド名と同じ名前）
  get status(): TodoStatusValue {
    return this.#status;
  }
}
```

**理由**:
- `private readonly _value` はESLintの `no-underscore-dangle` に違反
- パラメータプロパティ `private constructor(private readonly value)` はESLintの `no-useless-constructor`, `no-empty-function` に違反
- ES2022の `#field` は言語レベルの真のプライベート性を提供し、ESLint違反なし
- フィールド名は意味のある名前を使用（`#status`, `#email` など、`#value` は避ける）

### 4. equals()とtoString()

```typescript
equals(other: TodoStatus): boolean {
  return this.#status === other.#status;
}

toString(): string {
  return this.#status; // デバッグ用
}
```

### 5. 不変条件チェックメソッド

不変条件を持つ場合は検証メソッドを実装する。**インスタンスメソッド**として`this`を使用することで、DDDの慣習に沿った自然なAPIを提供する。

```typescript
canTransitionTo(to: AttachmentStatus): Result<void, DomainError> {
  // PREPARED -> UPLOADED のみ許可
  if (this.#status === "PREPARED" && to.#status === "UPLOADED") {
    return Result.ok(undefined);
  }
  // 同じステータスへの遷移は許可
  if (this.#status === to.#status) {
    return Result.ok(undefined);
  }
  return Result.err(new DomainError(`Cannot transition from ${this.#status} to ${to.#status}`));
}
```

**注意**: すべての遷移を許可する場合（`TodoStatus`のように）は、メソッド自体が不要。

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
  readonly #status: TodoStatusValue;

  private constructor(status: TodoStatusValue) {
    this.#status = status;
  }

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

type TodoStatusValue = "TODO" | "IN_PROGRESS" | "COMPLETED";

export class TodoStatus {
  readonly #status: TodoStatusValue;

  private constructor(status: TodoStatusValue) {
    this.#status = status;
  }

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
    if (!validStatuses.includes(props.status as TodoStatusValue)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.status as TodoStatusValue));
  }

  get status(): TodoStatusValue {
    return this.#status;
  }

  // 不変条件チェック（thisを使用するのでインスタンスメソッド）
  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    return Result.ok(undefined);
  }

  equals(other: TodoStatus): boolean {
    return this.#status === other.#status;
  }

  toString(): string {
    return this.#status;
  }

  isCompleted(): boolean {
    return this.#status === "COMPLETED";
  }

  isTodo(): boolean {
    return this.#status === "TODO";
  }

  isInProgress(): boolean {
    return this.#status === "IN_PROGRESS";
  }

  // ファクトリメソッド
  static todo(): TodoStatus {
    return new TodoStatus("TODO");
  }

  static inProgress(): TodoStatus {
    return new TodoStatus("IN_PROGRESS");
  }

  static completed(): TodoStatus {
    return new TodoStatus("COMPLETED");
  }
}
```

### Tier 2: ドメインルールあり（推奨）

```typescript
// email.vo.ts
export type EmailProps = {
  email: string;
};

export class Email {
  readonly #email: string;

  private constructor(email: string) {
    this.#email = email;
  }

  static from(props: EmailProps): Result<Email, DomainError> {
    // OpenAPI format: emailで基本形式はチェック済み
    // ドメイン固有ルール: 会社ドメインのみ許可
    if (!props.email.endsWith("@company.com")) {
      return Result.err(new DomainError("会社のメールアドレスのみ許可"));
    }
    return Result.ok(new Email(props.email));
  }

  get email(): string {
    return this.#email;
  }

  equals(other: Email): boolean {
    return this.#email.toLowerCase() === other.#email.toLowerCase();
  }

  toString(): string {
    return this.#email;
  }
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

### アンダースコアプレフィックス（_value）

```typescript
// ❌ ESLintのno-underscore-dangleに違反
export class TodoStatus {
  private constructor(private readonly _value: string) {}
}

// ✅ ES2022プライベートフィールドを使用
export class TodoStatus {
  readonly #value: string;
  private constructor(value: string) {
    this.#value = value;
  }
}
```

### パラメータプロパティ

```typescript
// ❌ ESLintのno-useless-constructor, no-empty-functionに違反
export class TodoStatus {
  private constructor(private readonly value: string) {}
}

// ✅ コンストラクタにボディを持たせる
export class TodoStatus {
  readonly #value: string;
  private constructor(value: string) {
    this.#value = value;
  }
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

type TodoStatusValue = "TODO" | "IN_PROGRESS" | "COMPLETED";

export class TodoStatus {
  readonly #status: TodoStatusValue;

  private constructor(status: TodoStatusValue) {
    this.#status = status;
  }

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
    if (!validStatuses.includes(props.status as TodoStatusValue)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.status as TodoStatusValue));
  }

  get status(): TodoStatusValue {
    return this.#status;
  }

  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    return Result.ok(undefined);
  }

  equals(other: TodoStatus): boolean {
    return this.#status === other.#status;
  }

  toString(): string {
    return this.#status;
  }
}
```

### Bad

```typescript
// パブリックコンストラクタ
constructor(public value: string) {} // ❌ privateでない

// アンダースコアプレフィックス
private readonly _value: string; // ❌ ESLint違反

// パラメータプロパティ
private constructor(private readonly value: string) {} // ❌ ESLint違反

// Type Aliasで不変条件を表現不可
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED"; // ❌

// throwを使用
throw new Error("Invalid"); // ❌ Result型を返すべき

// 必ず成功するVO
static from(props): Result<UserId, never> {
  return Result.ok(new UserId(props.value)); // ❌ VO化不要
}
```
