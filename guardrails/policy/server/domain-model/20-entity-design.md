# エンティティとValue Object設計

## 概要

ドメインモデルは、ビジネスの中核概念を不変オブジェクトとして表現する。

- **エンティティ**: 識別子（ID）を持つドメインオブジェクト
- **Value Object**: 識別子を持たず、値そのもので判断されるドメインオブジェクト

## バリデーション戦略の大原則

**参照**: `constitution/validation-principles.md`

このプロジェクトでは、バリデーションをMECE（相互排他的かつ網羅的）に実施する。

### 責務の階層

```
1. OpenAPI自動生成Zod（最優先）
   ↓ 型レベルのバリデーション（必須・型・長さ・パターン・enum）

2. Value Object（必要な場合のみ）
   ↓ OpenAPIで表現できない複雑なドメインルール

3. UseCase
   ↓ ビジネスルール（権限・状態・関連チェック）

4. Entity
   ↓ 構造的整合性のみ（基本的にバリデーションしない）
```

**重要**: 同じバリデーションを複数箇所で重複実装しない

---

## エンティティ設計

### 必須要件

#### 1. クラス定義

エンティティはclassで定義する。

```typescript
export class Todo {
  // プロパティとメソッド
}
```

#### 2. 不変プロパティ

すべてのプロパティは `readonly` で定義する。

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

#### 3. コンストラクタはPropsパターン

コンストラクタの引数はオブジェクト形式（Propsパターン）。

```typescript
constructor(props: {
  id: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  createdAt: string;
  updatedAt: string;
}) {
  this.id = props.id;
  this.title = props.title;
  this.description = props.description;
  this.status = props.status ?? "TODO";
  this.priority = props.priority ?? "MEDIUM";
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
}
```

#### 4. コンストラクタではバリデーションしない

**重要**: エンティティのコンストラクタでは型レベルのバリデーションを実施しない。

**理由**:

- ハンドラー層でOpenAPI自動生成Zodによるバリデーション済み
- バリデーションの重複を避ける（MECE原則）

```typescript
// ❌ 間違い: コンストラクタでバリデーション
constructor(props: { title: string }) {
  if (props.title.length === 0) {
    throw new Error("Title is required");
  }
  this.title = props.title;
}

// ✅ 正しい: バリデーションなし（ハンドラーで完了）
constructor(props: { title: string }) {
  this.title = props.title;
}
```

#### 5. 更新メソッドは新インスタンスを返す

エンティティの状態を変更する場合、必ず新しいインスタンスを生成して返す。

```typescript
changeStatus(status: TodoStatus, updatedAt: string): Todo {
  return new Todo({
    id: this.id,
    title: this.title,
    description: this.description,
    status, // 新しいステータス
    priority: this.priority,
    createdAt: this.createdAt,
    updatedAt, // 更新日時も更新
  });
}
```

#### 6. 日時はISO 8601文字列

日時プロパティは `Date` オブジェクトではなく、ISO 8601形式の文字列（`string`）で保持する。

**理由:**

- JSON シリアライズ/デシリアライズで型安全
- DynamoDB等のストレージとの互換性
- 不変性の保証

```typescript
// ✅ 正しい
readonly createdAt: string; // "2024-01-01T00:00:00.000Z"
readonly updatedAt: string;

// ❌ 間違い
readonly createdAt: Date;
```

#### 7. JSDoc コメント

すべてのクラス、プロパティ、メソッドにJSDocコメントを記述する。

````typescript
/**
 * TODO エンティティ
 *
 * やるべきタスクを表すドメインエンティティ。
 * タイトル、説明、ステータス、優先度などの情報を持つ。
 *
 * @example
 * ```typescript
 * const todo = new Todo({
 *   id: "todo-123",
 *   title: "データベース設計",
 *   status: "TODO",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 * ```
 */
export class Todo {
  /**
   * TODO ID
   *
   * TODOを一意に識別するID。
   */
  readonly id: string;

  // ...
}
````

### 禁止事項

#### 1. mutableなプロパティ

```typescript
// ❌ 間違い: readonlyがない
class Todo {
  id: string; // 変更可能になってしまう
}

// ✅ 正しい
class Todo {
  readonly id: string;
}
```

#### 2. setter メソッド

```typescript
// ❌ 間違い: setterは使わない
setStatus(status: TodoStatus): void {
  this.status = status; // readonly なのでコンパイルエラー
}

// ✅ 正しい: 新しいインスタンスを返す
changeStatus(status: TodoStatus, updatedAt: string): Todo {
  return new Todo({ ...this, status, updatedAt });
}
```

#### 3. 外部ライブラリへの依存

```typescript
// ❌ 間違い: AWS SDKに依存
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// ❌ 間違い: Zodに依存
import { z } from "zod";

// ✅ 正しい: TypeScript標準ライブラリのみ
export class Todo {
  // ...
}
```

#### 4. 技術的な命名

```typescript
// ❌ 間違い: 技術要素が漏れている
class Attachment {
  readonly s3Key: string;
  readonly s3Bucket: string;
  readonly cognitoUserId: string;
}

// ✅ 正しい: 抽象的な名前
class Attachment {
  readonly storageKey: string;
  readonly userId: string;
  // バケット名はインフラ層で管理
}
```

#### 5. コンストラクタでの型レベルバリデーション

```typescript
// ❌ 間違い: OpenAPIで定義済みのバリデーションを重複実施
constructor(props: { title: string }) {
  if (props.title.length === 0 || props.title.length > 200) {
    throw new Error("Invalid title length");
  }
  this.title = props.title;
}

// ✅ 正しい: ハンドラーでZodバリデーション済みのため何もしない
constructor(props: { title: string }) {
  this.title = props.title;
}
```

### 型エイリアス

列挙型のような型は `type` で定義する。

```typescript
/**
 * TODOステータス
 *
 * TODOの進捗状況を表す列挙型。
 */
export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE";

/**
 * TODO優先度
 */
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";
```

**注**: これらはOpenAPI定義でenum指定し、自動生成Zodスキーマで検証される。

### テストファイル

エンティティには必ずユニットテスト（`*.small.test.ts`）を作成する。

```
domain/model/todo/
├── todo.ts              # エンティティ本体
├── todo.small.test.ts   # ユニットテスト
├── todo.dummy.ts        # テスト用ファクトリ
└── todo-repository.ts   # リポジトリインターフェース
```

---

## Value Object設計

### Value Objectとは

識別子（ID）を持たず、**値そのもので等価性が判断される**ドメインオブジェクト。

**作成基準**: OpenAPIで表現できない複雑なドメインルールがある場合のみ作成する。

### エンティティとの違い

| 観点           | エンティティ                     | Value Object           |
| -------------- | -------------------------------- | ---------------------- |
| 識別子         | あり（ID）                       | なし                   |
| 等価性         | IDで判断                         | 全プロパティで判断     |
| 可変性         | 更新メソッドで新インスタンス生成 | 完全に不変             |
| ライフサイクル | 独立して存在                     | エンティティに埋め込み |

### Value Object vs Type Alias

#### Value Objectを使う場合

- **複雑なバリデーション**: OpenAPIで表現できない形式・制約
- **ドメインルール**: 正規表現パターン、複雑な範囲チェック等
- **振る舞い**: 比較、変換、計算等のメソッドが必要

**例**: 金額（Money）、メールアドレス（ドメイン固有ルール）、日付範囲等

```typescript
// ✅ Value Object: OpenAPIで表現できない複雑なルール
export class Email {
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
}
```

#### Type Aliasを使う場合

- **シンプルな列挙型**: 固定値のリスト
- **OpenAPIで定義可能**: enum, minLength, maxLength等で表現可能
- **振る舞い不要**: ただの型チェック

**例**: ステータス、優先度、カテゴリ等

```typescript
// ✅ Type Alias: OpenAPIのenumで表現可能
export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";
```

**対応するOpenAPI定義**:

```yaml
TodoStatus:
  type: string
  enum: [TODO, IN_PROGRESS, DONE]
```

### Value Object設計原則

#### 1. プライベートコンストラクタ

外部からの直接生成を防ぎ、バリデーション付きファクトリメソッド経由でのみ生成可能にする。

```typescript
export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromString(value: string): Result<Email, ValidationError> {
    // バリデーション
  }
}
```

#### 2. Result型を返すファクトリメソッド

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

#### 3. equals() メソッド

値の等価性を判断するメソッドを実装する。

```typescript
equals(other: Email): boolean {
  return this.value.toLowerCase() === other.value.toLowerCase();
}
```

#### 4. default() メソッド（オプション）

安全なフォールバック値を提供する。

```typescript
static default(): Email {
  return new Email("noreply@company.com");
}
```

#### 5. toString() メソッド（オプション）

文字列表現を返す。

```typescript
toString(): string {
  return this.value;
}
```

### バリデーション責務の明確化

**ハンドラー**: 基本的な型チェック（OpenAPI自動生成Zod）

```yaml
# OpenAPI: 基本的な形式チェック
email:
  type: string
  format: email # RFC 5322準拠の基本チェック
```

**Value Object**: ドメイン固有のルール

```typescript
// ✅ Value Object: ドメイン固有のバリデーション
Email.fromString("user@gmail.com"); // エラー: 会社ドメインのみ許可
Email.fromString("user@company.com"); // OK
```

**UseCase**: ビジネスルール（必須チェック・権限等）

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

### 実装例: Email (Value Object)

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

### Value Objectの配置

エンティティと同じディレクトリに配置する。

```
domain/model/user/
├── user.ts              # エンティティ
├── email.ts             # Value Object
├── user.small.test.ts
├── user.dummy.ts
└── user-repository.ts
```

---

## 設計思想: Result型との統合

このプロジェクトでは、**例外を使わず、Result型で明示的にエラーハンドリング**する方針を採用している。

### 全レイヤーでの一貫性

```typescript
// ハンドラー層: Zodバリデーション
app.post("/todos", zValidator("json", schemas.RegisterTodoParamsSchema), ...);
// ↓ バリデーション済み

// UseCase層
const result = await useCase.execute(input);
if (!result.success) { ... }

// Repository層
const result = await repository.findById({ id });
if (!result.success) { ... }

// Value Object層
const colorResult = ProjectColor.fromString(value);
if (!colorResult.success) { ... }
```

### メリット

1. **エラーハンドリングの強制**: コンパイラが処理を強制
2. **型安全性**: エラーケースを見逃さない
3. **テスタビリティ**: エラーケースのテストが容易
4. **一貫性**: 全レイヤーで同じパターン
5. **MECE**: 各層で重複なく適切にバリデーション

---

## バリデーション実装チェックリスト

新しいエンティティ追加時の確認事項：

- [ ] OpenAPIに型制約を定義（required, type, minLength, maxLength, pattern, enum等）
- [ ] エンティティのコンストラクタでは型レベルのバリデーションをしない
- [ ] 複雑なドメインルールがある場合のみValue Objectを作成
- [ ] Value ObjectはResult型を返す静的ファクトリメソッドで生成
- [ ] Type Aliasで十分な場合はValue Objectを作らない
- [ ] すべてのプロパティを `readonly` で定義
- [ ] 更新メソッドは新しいインスタンスを返す
- [ ] JSDocコメントを記述
- [ ] スモールテスト（`.small.test.ts`）を作成
