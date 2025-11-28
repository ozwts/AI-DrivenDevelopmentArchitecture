# Value Object設計

## Value Objectとは

識別子（ID）を持たず、**値そのもので等価性が判断される**ドメインオブジェクト。

**作成基準**:
1. OpenAPIで表現できない複雑なドメインルールがある場合
2. **不変条件（状態遷移ルール等）を持つフィールド**

**必須要件**:
- **`ValueObject<T>`型を実装**する（`server/src/domain/model/value-object.ts`）
- `equals(other: T): boolean`メソッドを実装する
- `toString(): string`メソッドを実装する

**Value Object徹底活用のメリット**:
- ✅ ドメインロジックがValue Objectに集約（リッチドメインモデル）
- ✅ Entity メソッドがシンプル（メソッドチェーン可能）
- ✅ Result型パターンとの整合性
- ✅ 再利用性が高い
- ✅ テストが容易
- ✅ 型安全性（インターフェースによる契約）

## エンティティとの違い

| 観点           | エンティティ                     | Value Object           |
| -------------- | -------------------------------- | ---------------------- |
| 識別子         | あり（ID）                       | なし                   |
| 等価性         | IDで判断                         | 全プロパティで判断     |
| 可変性         | 更新メソッドで新インスタンス生成 | 完全に不変             |
| ライフサイクル | 独立して存在                     | エンティティに埋め込み |

## Value Object vs Type Alias

### Value Objectを使う場合

1. **不変条件を持つフィールド**（Tier 1: 必須）
   - 状態遷移ルール
   - ビジネス不変条件
   - 例: `TodoStatus`（完了済みは変更不可）、`ProjectStatus`

2. **OpenAPIで表現不可能なドメインルール**（Tier 2: 推奨）
   - OpenAPIで表現できない複雑なビジネスルール
   - ドメイン固有の複雑な制約
   - 例: `Email`（会社ドメインのみ許可）、`Money`（通貨計算）、`DateRange`（開始日≤終了日）

3. **振る舞いが必要**
   - 比較、変換、計算等のメソッド
   - 例: `Money`、`DateRange`

#### 実装例: Tier 1（不変条件あり）

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

// ✅ Tier 1: 不変条件を持つ → Value Object必須
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') {}

  static fromString(value: string): Result<TodoStatus, ValidationError> {
    if (!['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(value)) {
      return { success: false, error: new ValidationError('無効なステータス') };
    }
    return { success: true, data: new TodoStatus(value as any) };
  }

  canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return {
        success: false,
        error: new ValidationError('完了済みTODOのステータスは変更できません'),
      };
    }
    return { success: true, data: undefined };
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  isCompleted(): boolean { return this.value === 'COMPLETED'; }
  static todo(): TodoStatus { return new TodoStatus('TODO'); }
  static completed(): TodoStatus { return new TodoStatus('COMPLETED'); }
}
```

#### 実装例: Tier 2（OpenAPIで表現不可能）

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

// ✅ Tier 2: ドメイン固有ルール → Value Object推奨
export class Email implements ValueObject<Email> {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromString(value: string): Result<Email, ValidationError> {
    // OpenAPI format: email では基本形式のみチェック
    // Value Object: ドメイン固有のルール（会社ドメインのみ許可等）
    if (!value.endsWith("@company.com")) {
      return {
        success: false,
        error: new ValidationError("会社のメールアドレスのみ許可されています"),
      };
    }
    return { success: true, data: new Email(value) };
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}
```

### Type Aliasを使う場合（Tier 3）

- **OpenAPIで表現可能な制約**: minLength/maxLength, pattern, enum等
- **不変条件なし**: 状態遷移ルールなし
- **振る舞い不要**: ただの型チェック

```typescript
// ✅ Tier 3: OpenAPIで表現可能 → プリミティブでOK
export class Todo {
  readonly id: string;              // プリミティブ
  readonly title: string;           // OpenAPI: minLength/maxLength
  readonly color?: string;          // OpenAPI: pattern: "^#[0-9A-Fa-f]{6}$"
  readonly description?: string;    // プリミティブ
  readonly createdAt: string;       // プリミティブ
  readonly status: TodoStatus;      // Value Object（不変条件あり）
}
```

**OpenAPI定義例**:

```yaml
title:
  type: string
  minLength: 1
  maxLength: 200
color:
  type: string
  pattern: "^#[0-9A-Fa-f]{6}$"
```

**重要**: ステータスなど、一見シンプルなenumでも**不変条件（状態遷移ルール）がある場合はValue Object化必須**。逆に、長さ制限や形式チェックのみの場合はOpenAPIで表現し、Value Object化は不要。

## Value Objectメソッド一覧

Value Objectは以下のメソッドを実装する。

| メソッド/要件 | 必須/オプション | 説明 | 例 |
|---------|--------------|------|-----|
| **ValueObject<T>型実装** | 必須 | 基底型を実装 | `implements ValueObject<TodoStatus>` |
| **プライベートコンストラクタ** | 必須 | 外部からの直接生成を防ぐ | `private constructor(value: string)` |
| **fromString()** | 必須 | 文字列からValue Objectを生成、Result型を返す | `static fromString(value: string): Result<Email, ValidationError>` |
| **equals()** | 必須 | 値の等価性を判断 | `equals(other: Email): boolean` |
| **toString()** | 必須 | 文字列表現を返す | `toString(): string` |
| **不変条件チェックメソッド** | 不変条件がある場合 | 不変条件を検証 | `canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError>` |
| **default()** | オプション | ビジネス的に意味のあるデフォルト値を返す | `static default(): Email` |
| **ヘルパーメソッド** | オプション | ビジネスロジックを補助 | `isCompleted(): boolean`, `isTodo(): boolean` |
| **静的ファクトリメソッド** | オプション | 頻繁に使う値を簡単に生成 | `static todo(): TodoStatus`, `static completed(): TodoStatus` |

**参照**: `50-test-strategy.md` - Value Objectテスト戦略

## Value Object設計原則

### 0. ValueObject<T>型の実装

すべてのValue Objectは`ValueObject<T>`型を実装し、`@staticImplements`デコレーターで`fromString()`の実装を強制する。

```typescript
import type { ValueObject, ValueObjectConstructor } from "../value-object";
import { staticImplements } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

@staticImplements<ValueObjectConstructor<TodoStatus>>()
export class TodoStatus implements ValueObject<TodoStatus> {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromString(value: string): Result<TodoStatus, ValidationError> {
    // バリデーション実装
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

### 1. プライベートコンストラクタ

外部からの直接生成を防ぎ、バリデーション付きファクトリメソッド経由でのみ生成可能にする。

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

export class Email implements ValueObject<Email> {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromString(value: string): Result<Email, ValidationError> {
    // バリデーション
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}
```

### 2. Result型を返すファクトリメソッド

バリデーション結果を明示的に返す。例外は使わない。

```typescript
static fromString(value: string): Result<Email, ValidationError> {
  // OpenAPI format: email では基本形式のみチェック済み
  // ここではドメイン固有のルールをチェック

  if (!value.endsWith('@company.com')) {
    return {
      success: false,
      error: new ValidationError(
        '会社のメールアドレスのみ許可されています',
      ),
    };
  }

  return {
    success: true,
    data: new Email(value),
  };
}
```

**使用例（UseCase層）**:

```typescript
// 1. Value Objectでバリデーション
const emailResult = Email.fromString(input.email);
if (!emailResult.success) {
  return emailResult; // エラーを上位層に伝播
}

// 2. バリデーション済みのValue ObjectをEntityに渡す
const user = new User({
  id: ...,
  name: input.name,
  email: emailResult.data, // 型安全
});
```

### 3. equals() メソッド

値の等価性を判断するメソッドを実装する。

```typescript
equals(other: Email): boolean {
  return this.value.toLowerCase() === other.value.toLowerCase();
}
```

### 4. default() メソッド（オプション）

ビジネス的に意味のあるデフォルト値がある場合のみ実装する。安全なフォールバック値を提供する。

**注**: すべてのValue Objectに`default()`が必要なわけではない。デフォルト値がビジネス的に意味を持つ場合（例: noreplyメールアドレス）のみ実装する。

```typescript
static default(): Email {
  return new Email("noreply@company.com");
}
```

### 5. toString() メソッド

文字列表現を返す。すべてのValue Objectで必須。

```typescript
toString(): string {
  return this.value;
}
```

### 6. 不変条件チェックメソッド（重要）

Value Objectが不変条件を持つ場合、検証メソッドを実装する。

```typescript
/**
 * 新しいステータスへの遷移が可能かチェック
 */
canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return {
      success: false,
      error: new ValidationError('完了済みTODOのステータスは変更できません'),
    };
  }
  return { success: true, data: undefined };
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
```

**UseCase層での使用例**:

```typescript
// Value Object生成
const newStatusResult = TodoStatus.fromString(input.status);
if (!newStatusResult.success) return newStatusResult;

// Value Objectで不変条件チェック
const canTransitionResult = existing.status.canTransitionTo(newStatusResult.data);
if (!canTransitionResult.success) return canTransitionResult;

// Entityメソッドはシンプル
const updated = existing.changeStatus(newStatusResult.data, now);
```

## バリデーション責務の明確化

### Handler層: 基本的な型チェック（OpenAPI自動生成Zod）

```yaml
# OpenAPI: 基本的な形式チェック
email:
  type: string
  format: email # RFC 5322準拠の基本チェック
```

### Value Object層: ドメイン固有のルール

```typescript
// ✅ Value Object: ドメイン固有のバリデーション
Email.fromString("user@gmail.com"); // エラー: 会社ドメインのみ許可
Email.fromString("user@company.com"); // OK
```

### UseCase層: ビジネスルール（必須チェック・権限等）

```typescript
// ✅ UseCase: ビジネスバリデーション
if (input.email === undefined) {
  return { success: false, error: new ValidationError("メールアドレスは必須です") };
}

// ハンドラーで基本形式チェック済み（format: email）
// Value Objectでドメイン固有ルールをチェック
const emailResult = Email.fromString(input.email);
if (!emailResult.success) {
  return emailResult;
}
```

**MECE原則の実現**:

1. OpenAPI: 基本形式（RFC 5322準拠）
2. Value Object: ドメイン固有ルール（会社ドメインのみ等）
3. UseCase: ビジネスルール（権限等）

→ 各層で異なる責務を担当し、重複なし

## 実装例: Email (Value Object)

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

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
  static fromString(value: string): Result<Email, ValidationError> {
    // OpenAPIのformat: emailで基本形式はチェック済み
    // ここではドメイン固有のルール（会社ドメインのみ）をチェック

    if (!value.endsWith("@company.com")) {
      return {
        success: false,
        error: new ValidationError("会社のメールアドレスのみ許可されています"),
      };
    }

    return {
      success: true,
      data: new Email(value),
    };
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

## 実装例: TodoStatus (Value Object with 不変条件)

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

/**
 * TODOステータスを表す値オブジェクト
 *
 * 状態遷移ルール（不変条件）を内包する。
 */
export class TodoStatus implements ValueObject<TodoStatus> {
  private readonly value: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

  private constructor(value: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') {
    this.value = value;
  }

  /**
   * 文字列からTodoStatusを生成
   */
  static fromString(value: string): Result<TodoStatus, ValidationError> {
    if (!['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(value)) {
      return {
        success: false,
        error: new ValidationError('無効なステータスです'),
      };
    }
    return {
      success: true,
      data: new TodoStatus(value as 'TODO' | 'IN_PROGRESS' | 'COMPLETED'),
    };
  }

  /**
   * 不変条件: 完了済みTODOは他のステータスに変更できない
   */
  canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return {
        success: false,
        error: new ValidationError(
          '完了済みTODOのステータスは変更できません'
        ),
      };
    }
    return { success: true, data: undefined };
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

  /**
   * 静的ファクトリメソッド
   */
  static todo(): TodoStatus {
    return new TodoStatus('TODO');
  }

  static inProgress(): TodoStatus {
    return new TodoStatus('IN_PROGRESS');
  }

  static completed(): TodoStatus {
    return new TodoStatus('COMPLETED');
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

## Value Objectの配置

エンティティと同じディレクトリに配置する。

```
domain/model/user/
├── user.ts                # エンティティ
├── user.small.test.ts     # Entityテスト
├── user.dummy.ts          # Entityダミー
├── email.ts               # Value Object
├── email.small.test.ts    # Value Objectテスト
└── user-repository.ts

domain/model/todo/
├── todo.ts                   # エンティティ
├── todo.small.test.ts        # Entityテスト
├── todo.dummy.ts             # Entityダミー
├── todo-status.ts            # Value Object
├── todo-status.small.test.ts # Value Objectテスト
└── todo-repository.ts
```

**注**: Value Objectは通常Dummyファクトリ不要（`fromString()`や静的ファクトリメソッドで生成）

## Do / Don't

### ✅ Good

```typescript
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: string) {}

  static fromString(value: string): Result<TodoStatus, ValidationError> {
    // バリデーション
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// 不変条件をValue Object内に
canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return {
      success: false,
      error: new ValidationError('完了済みTODOのステータスは変更できません'),
    };
  }
  return { success: true, data: undefined };
}

// UseCase層で使用
const statusResult = TodoStatus.fromString(input.status);
if (!statusResult.success) return statusResult;

const canTransitionResult = existing.status.canTransitionTo(statusResult.data);
if (!canTransitionResult.success) return canTransitionResult;

const updated = existing.changeStatus(statusResult.data, now);
```

### ❌ Bad

```typescript
// ValueObject<T>型を実装していない
export class TodoStatus {  // ❌ implements ValueObject<TodoStatus>がない
  constructor(public value: string) {}  // ❌ パブリックコンストラクタ
}

// 必須メソッドの実装がない
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: string) {}

  static fromString(value: string): Result<TodoStatus, ValidationError> {
    // ...
  }

  // ❌ equals()とtoString()の実装がない
}

// Type Aliasで不変条件を表現できない
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
// ❌ 状態遷移ルールをどこに書く？
// ❌ ValueObject<T>インターフェースを実装できない

// Entity内で不変条件チェック
class Todo {
  changeStatus(status: TodoStatus): Result<Todo, ValidationError> {
    // ❌ Value Objectに委譲すべき
    if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
      return { success: false, error: ... };
    }
  }
}

// throwを使用
static fromString(value: string): TodoStatus {
  if (!validValues.includes(value)) {
    throw new Error('Invalid status');  // ❌ Result型を返すべき
  }
  return new TodoStatus(value);
}
```

## テスト戦略

Value Objectは必ずユニットテスト（`.small.test.ts`）を作成する。

**参照**: `50-test-strategy.md` - 詳細なテスト戦略とテストパターン

```typescript
// todo-status.small.test.ts
import { describe, it, expect } from 'vitest';
import { TodoStatus } from './todo-status';

describe('TodoStatus', () => {
  describe('fromString', () => {
    it('有効なステータス文字列からTodoStatusを生成できる', () => {
      const result = TodoStatus.fromString('TODO');
      expect(result.success).toBe(true);
    });

    it('無効なステータス文字列はエラーを返す', () => {
      const result = TodoStatus.fromString('INVALID');
      expect(result.success).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('完了済みTODOは他のステータスに変更できない', () => {
      const completed = TodoStatus.completed();
      const todo = TodoStatus.todo();

      const result = completed.canTransitionTo(todo);
      expect(result.success).toBe(false);
    });

    it('未完了TODOは完了状態に変更できる', () => {
      const todo = TodoStatus.todo();
      const completed = TodoStatus.completed();

      const result = todo.canTransitionTo(completed);
      expect(result.success).toBe(true);
    });
  });
});
```
