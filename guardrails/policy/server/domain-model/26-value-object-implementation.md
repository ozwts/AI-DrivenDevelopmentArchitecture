# Value Object実装パターン

## 概要

Value Objectの具体的な実装パターンをまとめたドキュメント。

**関連ドキュメント**:

- **設計概要**: `25-value-object-overview.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`
- **テストパターン**: `51-value-object-test-patterns.md`

## 基底型定義（`server/src/domain/model/value-object.ts`）

Value Objectの基底型定義の参考実装。

```typescript
import type { Result } from "@/util/result";
import type { DomainError } from "@/util/error-util";

// Value Object基底インターフェース
export interface ValueObject<T> {
  equals(other: T): boolean;
  toString(): string;
}

// Value Objectコンストラクタ型（from()を強制）
export interface ValueObjectConstructor<T> {
  from(props: unknown): Result<T, DomainError>;
}

// 静的メソッド実装を強制するデコレーター
export function staticImplements<T>() {
  return <U extends T>(constructor: U) => {
    constructor;
  };
}
```

**重要**:

- `from()`は**常にProps型エイリアスパターン**を使用（Entityのコンストラクタと統一）
- プロパティ名は具体的な意味を持つ名前にする（`value`ではなく`email`, `status`など）
- 単一パラメータの例: `type EmailProps = { email: string }`
- 複数パラメータの例: `type FullNameProps = { firstName: string; lastName: string }`
- インラインpropsは使用しない（型エイリアスで統一）

## Value Object設計原則の詳細

### 原則1: ValueObject<T>型の実装

すべてのValue Objectは`ValueObject<T>`型を実装し、`@staticImplements`デコレーターで`from()`の実装を強制する。

**単一パラメータの例（Props型エイリアスパターン）**:

```typescript
import type { ValueObject, ValueObjectConstructor } from "../value-object";
import { staticImplements } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * TodoStatusのfrom()メソッド引数型
 */
export type TodoStatusProps = {
  status: string;
};

@staticImplements<ValueObjectConstructor<TodoStatus>>()
export class TodoStatus implements ValueObject<TodoStatus> {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    // バリデーション実装
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(props.status)) {
      return Result.err(new DomainError("無効なステータスです"));
    }
    return Result.ok(new TodoStatus(props.status));
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value; // デバッグ用
  }
}
```

**Props型エイリアスのメリット**:

- **再利用性**: 複数のメソッドで同じ型を使用可能
- **可読性**: 型定義が一箇所にまとまる、プロパティ名が明確
- **一貫性**: Entityのコンストラクタと同じパターン

**使用例**:

```typescript
const statusResult = TodoStatus.from({ status: "TODO" });
if (statusResult.success) {
  console.log(statusResult.data.toString()); // "TODO"
}
```

**複数パラメータの例（Props型エイリアスパターン）**:

```typescript
/**
 * FullNameのfrom()メソッド引数型
 */
export type FullNameProps = {
  firstName: string;
  lastName: string;
};

@staticImplements<ValueObjectConstructor<FullName>>()
export class FullName implements ValueObject<FullName> {
  private readonly _firstName: string;
  private readonly _lastName: string;

  private constructor(firstName: string, lastName: string) {
    this._firstName = firstName;
    this._lastName = lastName;
  }

  static from(props: FullNameProps): Result<FullName, DomainError> {
    // バリデーション
    if (props.firstName.length === 0 || props.lastName.length === 0) {
      return Result.err(new DomainError("姓名は必須です"));
    }
    return Result.ok(new FullName(props.firstName, props.lastName));
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  equals(other: FullName): boolean {
    return (
      this._firstName === other._firstName && this._lastName === other._lastName
    );
  }

  toString(): string {
    return `FullName(firstName=${this._firstName}, lastName=${this._lastName})`; // デバッグ用
  }

  // 表示用フォーマット（オプション）
  format(): string {
    return `${this._lastName} ${this._firstName}`;
  }
}
```

### 原則2: プライベートコンストラクタ

外部からの直接生成を防ぎ、バリデーション付きファクトリメソッド経由でのみ生成可能にする。

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * Emailのfrom()メソッド引数型
 */
export type EmailProps = {
  email: string;
};

export class Email implements ValueObject<Email> {
  readonly value: string;

  // ✅ プライベートコンストラクタ
  private constructor(value: string) {
    this.value = value;
  }

  // ✅ 静的ファクトリメソッド（唯一の生成手段、Props型エイリアスパターン）
  static from(props: EmailProps): Result<Email, DomainError> {
    // バリデーション
    if (!props.email.endsWith("@company.com")) {
      return Result.err(
        new DomainError("会社のメールアドレスのみ許可されています"),
      );
    }
    return Result.ok(new Email(props.email));
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value; // デバッグ用
  }
}
```

### 原則3: Result型を返すファクトリメソッド

バリデーション結果を明示的に返す。例外は使わない。

```typescript
export type EmailProps = {
  email: string;
};

static from(props: EmailProps): Result<Email, DomainError> {
  // OpenAPI format: email では基本形式のみチェック済み
  // ここではドメイン固有のルールをチェック

  if (!props.email.endsWith('@company.com')) {
    return Result.err(new DomainError(
      '会社のメールアドレスのみ許可されています'
    ));
  }

  return Result.ok(new Email(props.email));
}
```

**UseCase層での使用例**:

```typescript
// 1. Value Objectでバリデーション
const emailResult = Email.from({ email: input.email });
if (!emailResult.success) {
  return emailResult; // エラーを上位層に伝播
}

// 2. バリデーション済みのValue ObjectをEntityに渡す
const user = new User({
  id: generateId(),
  name: input.name,
  email: emailResult.data, // 型安全
  createdAt: dateToIsoString(now),
  updatedAt: dateToIsoString(now),
});
```

### 原則4: equals()メソッド

値の等価性を判断するメソッドを実装する。

```typescript
equals(other: Email): boolean {
  // 大文字小文字を区別しない比較
  return this.value.toLowerCase() === other.value.toLowerCase();
}
```

### 原則5: toString()メソッド

文字列表現を返す。すべてのValue Objectで必須。

```typescript
toString(): string {
  return this.value;
}
```

### 原則6: 不変条件チェックメソッド（重要）

Value Objectが不変条件を持つ場合、検証メソッドを実装する。

```typescript
/**
 * 新しいステータスへの遷移が可能かチェック
 */
canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return Result.err(new DomainError('完了済みTODOのステータスは変更できません'));
  }
  return Result.ok(undefined);
}

/**
 * ヘルパーメソッド
 */
isCompleted(): boolean {
  return this.value === 'COMPLETED';
}

isTodo(): boolean {
  return this.value === 'TODO';
}

isInProgress(): boolean {
  return this.value === 'IN_PROGRESS';
}
```

**UseCase層での使用例**:

```typescript
// Value Object生成
const newStatusResult = TodoStatus.from({ status: input.status });
if (!newStatusResult.success) return newStatusResult;

// Value Objectで不変条件チェック
const canTransitionResult = existing.status.canTransitionTo(
  newStatusResult.data,
);
if (!canTransitionResult.success) return canTransitionResult;

// Entityメソッドはシンプル
const updated = existing.changeStatus(
  newStatusResult.data,
  dateToIsoString(now),
);
```

### 原則7: default()メソッド（オプション）

ビジネス的に意味のあるデフォルト値がある場合のみ実装する。

**注**: すべてのValue Objectに`default()`が必要なわけではない。デフォルト値がビジネス的に意味を持つ場合（例: noreplyメールアドレス）のみ実装する。

```typescript
static default(): Email {
  return new Email("noreply@company.com");
}
```

## Tier別実装例

### Tier 1: 不変条件あり → Value Object必須

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * TodoStatusのfrom()メソッド引数型
 */
export type TodoStatusProps = {
  status: string;
};

// ✅ Tier 1: 不変条件を持つ → Value Object必須
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(
    private readonly value: "TODO" | "IN_PROGRESS" | "COMPLETED",
  ) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const normalized = props.status.toUpperCase();
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(normalized)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(normalized as any));
  }

  /**
   * 不変条件: 完了済みTODOは他のステータスに変更できない
   */
  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(
        new DomainError("完了済みTODOのステータスは変更できません"),
      );
    }
    return Result.ok(undefined);
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  // ヘルパーメソッド
  isCompleted(): boolean {
    return this.value === "COMPLETED";
  }
  isTodo(): boolean {
    return this.value === "TODO";
  }
  isInProgress(): boolean {
    return this.value === "IN_PROGRESS";
  }

  // 静的ファクトリメソッド
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

### Tier 2: ドメインロジックを含む → Value Object推奨

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * Emailのfrom()メソッド引数型
 */
export type EmailProps = {
  email: string;
};

// ✅ Tier 2: ドメイン固有ルール → Value Object推奨
export class Email implements ValueObject<Email> {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(props: EmailProps): Result<Email, DomainError> {
    // OpenAPI format: email では基本形式のみチェック（ValidationError）
    // Value Object: ドメイン固有のルール（DomainError）
    if (!props.email.endsWith("@company.com")) {
      return Result.err(
        new DomainError("会社のメールアドレスのみ許可されています"),
      );
    }
    return Result.ok(new Email(props.email));
  }

  static default(): Email {
    return new Email("noreply@company.com");
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Ageのfrom()メソッド引数型
 */
export type AgeProps = {
  age: number;
};

// ✅ Tier 2: 年齢制限（ドメインロジックを含む）
export class Age implements ValueObject<Age> {
  private constructor(private readonly value: number) {}

  static from(props: AgeProps): Result<Age, DomainError> {
    // OpenAPI minimum: 0 では型レベルのみチェック（ValidationError）
    // Value Object: ドメイン固有のルール（DomainError）
    if (props.age < 18) {
      return Result.err(new DomainError("18歳以上である必要があります"));
    }
    return Result.ok(new Age(props.age));
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: Age): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
```

### Tier 3: OpenAPIで表現可能 → プリミティブでOK

```yaml
# OpenAPI定義
title:
  type: string
  minLength: 1
  maxLength: 200

color:
  type: string
  pattern: "^#[0-9A-Fa-f]{6}$"
```

```typescript
// ✅ Tier 3: OpenAPIでバリデーション → Value Object不要
export class Todo {
  readonly id: string; // プリミティブ（バリデーション不要）
  readonly title: string; // OpenAPI: minLength/maxLength
  readonly color: string | undefined; // OpenAPI: pattern
  readonly description: string | undefined; // プリミティブ
  readonly createdAt: string; // プリミティブ
  readonly status: TodoStatus; // Value Object（不変条件あり）
}
```

## 完全実装例: Email

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * Emailのfrom()メソッド引数型
 */
export type EmailProps = {
  email: string;
};

/**
 * メールアドレスを表す値オブジェクト
 *
 * 会社ドメイン（@company.com）のメールアドレスのみを許可する。
 * 基本的なメール形式のバリデーションはOpenAPI（format: email）で実施済み。
 */
export class Email implements ValueObject<Email> {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * 文字列からEmailを生成（ドメイン固有ルールをチェック）
   */
  static from(props: EmailProps): Result<Email, DomainError> {
    // OpenAPIのformat: emailで基本形式はチェック済み
    // ここではドメイン固有のルール（会社ドメインのみ）をチェック

    if (!props.email.endsWith("@company.com")) {
      return Result.err(
        new DomainError("会社のメールアドレスのみ許可されています"),
      );
    }

    return Result.ok(new Email(props.email));
  }

  static default(): Email {
    return new Email("noreply@company.com");
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}
```

## 完全実装例: TodoStatus

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * TodoStatusのfrom()メソッド引数型
 */
export type TodoStatusProps = {
  status: string;
};

/**
 * TODOステータスを表す値オブジェクト
 *
 * 状態遷移ルール（不変条件）を内包する。
 */
export class TodoStatus implements ValueObject<TodoStatus> {
  private readonly value: "TODO" | "IN_PROGRESS" | "COMPLETED";

  private constructor(value: "TODO" | "IN_PROGRESS" | "COMPLETED") {
    this.value = value;
  }

  /**
   * 文字列からTodoStatusを生成
   */
  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const normalized = props.status.toUpperCase();
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(normalized)) {
      return Result.err(new DomainError("無効なステータスです"));
    }
    return Result.ok(
      new TodoStatus(normalized as "TODO" | "IN_PROGRESS" | "COMPLETED"),
    );
  }

  /**
   * 不変条件: 完了済みTODOは他のステータスに変更できない
   */
  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(
        new DomainError("完了済みTODOのステータスは変更できません"),
      );
    }
    return Result.ok(undefined);
  }

  /**
   * ヘルパーメソッド
   */
  isCompleted(): boolean {
    return this.value === "COMPLETED";
  }

  isTodo(): boolean {
    return this.value === "TODO";
  }

  isInProgress(): boolean {
    return this.value === "IN_PROGRESS";
  }

  /**
   * 静的ファクトリメソッド
   */
  static todo(): TodoStatus {
    return new TodoStatus("TODO");
  }

  static inProgress(): TodoStatus {
    return new TodoStatus("IN_PROGRESS");
  }

  static completed(): TodoStatus {
    return new TodoStatus("COMPLETED");
  }

  /**
   * 等価性チェック
   */
  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value;
  }
}
```

## テスト実装例

Value Objectは必ずユニットテスト（`.small.test.ts`）を作成する。

**参照**: `51-value-object-test-patterns.md` - 詳細なテストパターン

```typescript
// todo-status.small.test.ts
import { describe, it, expect } from "vitest";
import { TodoStatus } from "./todo-status";
import { DomainError } from "@/util/error-util";

describe("TodoStatus", () => {
  describe("from", () => {
    describe("正常系", () => {
      it("有効なステータス文字列からTodoStatusを生成できる", () => {
        const result = TodoStatus.from({ value: "TODO" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isTodo()).toBe(true);
        }
      });

      it("すべての有効なステータスから作成できる", () => {
        const todoResult = TodoStatus.from({ value: "TODO" });
        const inProgressResult = TodoStatus.from({ value: "IN_PROGRESS" });
        const completedResult = TodoStatus.from({ value: "COMPLETED" });

        expect(todoResult.success).toBe(true);
        expect(inProgressResult.success).toBe(true);
        expect(completedResult.success).toBe(true);
      });

      it("小文字でも作成できる", () => {
        const result = TodoStatus.from({ value: "todo" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isTodo()).toBe(true);
        }
      });
    });

    describe("異常系", () => {
      it("無効なステータス文字列の場合DomainErrorを返す", () => {
        const result = TodoStatus.from({ value: "INVALID" });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(DomainError);
          expect(result.error.message).toContain("無効なステータス");
        }
      });

      it("空文字列の場合DomainErrorを返す", () => {
        const result = TodoStatus.from({ value: "" });

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

## Do / Don't（詳細版）

### ✅ Good

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { DomainError } from "@/util/error-util";

/**
 * TodoStatusのfrom()メソッド引数型
 */
export type TodoStatusProps = {
  status: string;
};

// ✅ ValueObject<T>型を実装、Props型エイリアス使用、具体的なプロパティ名
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: string) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    if (!['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(props.status)) {
      return Result.err(new DomainError('無効なステータスです'));
    }
    return Result.ok(new TodoStatus(props.status));
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// ✅ 不変条件をValue Object内に配置
canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return Result.err(new DomainError('完了済みTODOのステータスは変更できません'));
  }
  return Result.ok(undefined);
}

// ✅ UseCase層で使用
const statusResult = TodoStatus.from({ status: input.status });
if (!statusResult.success) return statusResult;

const canTransitionResult = existing.status.canTransitionTo(statusResult.data);
if (!canTransitionResult.success) return canTransitionResult;

const updated = existing.changeStatus(statusResult.data, dateToIsoString(now));
```

### ❌ Bad

```typescript
// ❌ ValueObject<T>型を実装していない
export class TodoStatus {  // implements ValueObject<TodoStatus>がない
  constructor(public value: string) {}  // パブリックコンストラクタ
}

// ❌ 必須メソッドの実装がない
export type TodoStatusProps = { status: string };

export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: string) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    // ...
  }

  // equals()とtoString()の実装がない
}

// ❌ Type Aliasで不変条件を表現できない
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
// 状態遷移ルールをどこに書く？
// ValueObject<T>インターフェースを実装できない

// ❌ Entity内で不変条件チェック
class Todo {
  changeStatus(status: TodoStatus): Result<Todo, DomainError> {
    // Value Objectに委譲すべき
    if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
      return Result.err(new DomainError('...'));
    }
  }
}

// ❌ throwを使用
export type TodoStatusProps = { status: string };

static from(props: TodoStatusProps): TodoStatus {
  if (!validValues.includes(props.status)) {
    throw new Error('Invalid status');  // Result型を返すべき
  }
  return new TodoStatus(props.status);
}

// ❌ 必ず成功するValue Objectを作成
export type UserIdProps = { userId: string };

export class UserId implements ValueObject<UserId> {
  private constructor(private readonly value: string) {}

  static from(props: UserIdProps): Result<UserId, DomainError> {
    // バリデーションなし - 必ず成功する
    return Result.ok(new UserId(props.userId));
  }

  // これは単なる型エイリアスと同じ - Value Object化不要
}
```

## 実装チェックリスト

```
[ ] Props型エイリアス定義（export type <ValueObject>Props = { ... }）
[ ] ValueObject<T>型を実装
[ ] プライベートコンストラクタ
[ ] Result型を返すfrom()メソッド（Props型エイリアス使用）
[ ] equals()メソッド実装
[ ] toString()メソッド実装
[ ] 不変条件チェックメソッド（不変条件がある場合）
[ ] default()メソッド（ビジネス的に意味のあるデフォルト値がある場合）
[ ] ヘルパーメソッド（必要に応じて）
[ ] 静的ファクトリメソッド（必要に応じて）
[ ] スモールテスト（.small.test.ts）作成
[ ] JSDocコメント記述
```
