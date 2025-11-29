# エンティティ設計：実装詳細

## 概要

このドキュメントは、エンティティの具体的な実装方法とベストプラクティスをまとめたものである。

**関連ドキュメント**:
- **設計概要**: `20-entity-overview.md`
- **フィールド分類**: `21-entity-field-classification.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`
- **テスト戦略**: `50-test-overview.md`

## エンティティ設計の必須要件

### 1. クラス定義

エンティティはclassで定義する。

```typescript
export class Todo {
  // プロパティとメソッド
}
```

### 2. 不変プロパティ

すべてのプロパティは `readonly` で定義する。

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;      // Value Object
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### 3. コンストラクタはPropsパターン（型エイリアス使用）

**原則**: コンストラクタの引数は `<Entity>Props` 型エイリアスで定義する。

**重要**: `analyzability-principles.md` に基づき、すべてのフィールドを `| undefined` で必須化し、型システムで実装漏れを検出可能にする。

```typescript
/**
 * Todoエンティティのコンストラクタ引数型
 */
export type TodoProps = {
  id: string;
  title: string;
  description: string | undefined;   // Tier 3: 必須で渡すが値はundefined可
  status: TodoStatus;                // Value Object
  dueDate: string | undefined;       // Tier 2: undefinedに業務的意味がある
  completedAt: string | undefined;   // Tier 2: undefinedに業務的意味がある
  createdAt: string;
  updatedAt: string;
};

export class Todo {
  readonly id: string;
  readonly title: string;
  readonly description?: string;     // フィールドはオプショナル
  readonly status: TodoStatus;
  readonly dueDate: string | undefined;
  readonly completedAt: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

**Tier 3フィールドの重要な区別**:
- **Props型（コンストラクタ引数）**: `description: string | undefined` （`?` なし - 必須で渡す）
- **クラスフィールド**: `description?: string` （`?` あり - オプショナル）

この違いにより、analyzability原則に準拠：
- コンストラクタでは全フィールドを明示的に渡すことを強制（`| undefined` で型システムが検出）
- クラス内部ではオプショナルフィールドとして扱う（`?` で実装を簡潔に）

**Props型エイリアスのメリット**:
- **再利用性**: 更新メソッドでも同じ型を使用可能
- **可読性**: 型定義が一箇所にまとまる
- **保守性**: フィールド追加時、Props型を修正するだけで全体に反映
- **analyzability-principles.md 原則1準拠**: フィールドの省略を型システムで検出
- **一貫性**: `reconstruct()` と型定義が一致

### 4. コンストラクタではバリデーションしない

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

### 5. 更新メソッドは新インスタンスを返す

エンティティの状態を変更する場合、必ず新しいインスタンスを生成して返す。

**設計原則**:
- **基本**: シンプルなデータ変換メソッドはEntityを返す（メソッドチェーン可能）
- **例外**: 複数値関係性バリデーションが必要な場合のみResult型を返す

**参照**: `20-entity-overview.md` - Entity設計の3つのパターン

```typescript
/**
 * ステータスを変更して新しいTodoインスタンスを返す
 *
 * 不変条件チェックはTodoStatus Value Object内で実施済み
 */
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  // Props型を使って新しいインスタンスを生成
  return new Todo({
    ...this,      // 既存のプロパティをスプレッド
    status: newStatus,  // Value Object（検証済み）
    updatedAt,
  });
}

```

**Props型を使った更新メソッドのパターン**:
```typescript
// スプレッド構文を使用した簡潔な実装
updateDescription(description: string | undefined, updatedAt: string): Todo {
  return new Todo({
    ...this,
    description,
    updatedAt,
  });
}

```

### 6. 日時はISO 8601文字列

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

### 7. JSDoc コメント

すべてのクラス、プロパティ、メソッドにJSDocコメントを記述する。

```typescript
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
 *   status: TodoStatus.todo(),
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
```

## 禁止事項

### 1. 未使用のドメインメソッド追加

**原則**: 現在のユースケースで使われていないドメインメソッドを追加してはならない（YAGNI原則）。

**理由**:
- 使われないコードは技術的負債となる
- 将来の要件は不確実であり、実際に必要になった時に追加すべき
- ビジネスの意図を表現するメソッドは、そのビジネスアクションが実装される時に追加する

```typescript
// ❌ 間違い: 現在使われていないメソッドを追加
export class Todo {
  // 現在は「完了」機能だけ必要なのに、将来使うかもしれないと予測して追加
  markAsInProgress(updatedAt: string): Todo {  // ❌ 未使用
    return new Todo({ ...this, status: TodoStatus.inProgress(), updatedAt });
  }

  markAsPending(updatedAt: string): Todo {  // ❌ 未使用
    return new Todo({ ...this, status: TodoStatus.pending(), updatedAt });
  }

  markAsCompleted(completedAt: string, updatedAt: string): Todo {  // ✅ 実際に使用
    return new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt });
  }
}

// ✅ 正しい: 実際に使用するメソッドのみ
export class Todo {
  // 現在のユースケースで必要なメソッドのみ実装
  markAsCompleted(completedAt: string, updatedAt: string): Todo {
    return new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt });
  }

  // 他のステータス変更は、必要になったユースケース実装時に追加
}
```

### 汎用メソッドと個別メソッドの使い分け

**設計方針**:
- **基本**: シンプルなデータ変換メソッドを使用（メソッドチェーン可能）
- **必要時**: reconstructまたは個別ビジネスメソッドを使用（Result型を返す）

**参照**: `guardrails/policy/server/use-case/15-domain-model-interaction.md` - 詳細な使い分け基準

#### パターンA: シンプルなデータ変換メソッド（推奨）

単一Value Objectの不変条件チェックが完了している場合、メソッドチェーンを活用。

```typescript
// ✅ 基本パターン: メソッドチェーン可能
const updated = existing
  .changeStatus(newStatusResult.data, now)
  .update({ title: input.title, updatedAt: now });
```

#### パターンB: reconstruct()で複数値関係性をチェック

`reconstruct()`は必ずResult型を返し、複数の値の関係性をチェックする。

```typescript
// ✅ 正しい: 複数の値の関係性チェック
static reconstruct(props: {
  id: string;
  title: string;
  status: TodoStatus;  // Value Objectで検証済み
  dueDate: string | undefined;  // 必須（undefinedを明示的に渡す）
  // ...
}): Result<Todo, DomainError> {
  // 複数の値の関係性チェック
  if (props.status.isCompleted() && !props.dueDate) {
    return {
      success: false,
      error: new DomainError('完了TODOには期限が必要です'),
    };
  }

  return {
    success: true,
    data: new Todo(props),
  };
}

// UseCase層で使用
const updatedResult = Todo.reconstruct({
  ...existing,
  title: titleResult.data,  // Value Objectで検証済み
  status: statusResult.data,
  updatedAt: now,
});

if (!updatedResult.success) {
  return updatedResult;  // DomainError
}

const updated = updatedResult.data;
```

**reconstruct()の引数設計**:

オプショナルフィールドも `| undefined` として型レベルで必須化する：

```typescript
static reconstruct(props: {
  id: string;
  description: string | undefined;  // ✅ 省略不可、undefinedを明示的に渡す
  dueDate: string | undefined;      // ✅ 省略不可、undefinedを明示的に渡す
  // ...
}): Result<Todo, DomainError>
```

**メリット**:
- TypeScriptレベルで省略を防ぐ（型安全性）
- `undefined`を明示的に渡すことで意図が明確
- マージロジックがUseCase層にあることが一目で分かる

#### パターンC: 個別メソッドでビジネス意図を表現

以下のいずれかに該当する場合、ビジネスの意図を表現する個別メソッドを実装:

1. 複数フィールドの連動（例: 完了時にcompletedAtとstatusを同時変更）
2. Entity全体を見た不変条件（例: 完了TODOは期限必須）
3. ビジネス上の意図を明確にすべき重要な操作（例: markAsCompleted）

```typescript
// ✅ 正しい: ビジネスロジックを持つ個別メソッド
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  // Entity全体を見た不変条件（複数値関係性）
  if (!this.dueDate) {
    return {
      success: false,
      error: new DomainError('期限のないTODOは完了できません'),
    };
  }

  return {
    success: true,
    data: new Todo({
      ...this,
      status: TodoStatus.completed(),  // 複数フィールド連動
      completedAt,
      updatedAt,
    }),
  };
}
```

**使い分けの判断基準**:

| パターン | 返り値 | 使用ケース | メリット |
|---------|-------|-----------|---------|
| **パターンA** | `Entity` | バリデーション不要な基本的な更新 | Entity層が薄い、`Result.ok()`のボイラープレート不要 |
| **パターンB** | `Result<Entity, DomainError>` | PATCH更新・リポジトリ復元（`reconstruct`）<br/>※ドメインバリデーションの有無に関わらず常にResult型 | 型安全性（フィールド省略を検出）、一貫性、実装漏れ防止 |
| **パターンC** | `Result<Entity, DomainError>` | 重要なビジネス操作（複数値関係性チェックあり） | ビジネス意図が明確 |

**重要**:
- **すべてのパターンでメソッドチェーン可能** - `Result.then()`が`Entity`を自動で`Result.ok()`に包むため
- **基本はパターンA**を使用（Entity層が薄く、ボイラープレート最小）
- 複数値関係性バリデーションは必要最小限にとどめる
- 複数値関係性バリデーションはDomainErrorを返す
- 単一Value Objectの不変条件はValue Object層に委譲

**メソッドチェーンの例**:

```typescript
// ✅ EntityとResult型を混在させてフラットにチェーン可能
const result = Todo.reconstruct(props)                // Result<Todo>
  .then(t => t.updateDescription("新しい", now))       // Todoを返す → 自動でResult.ok()に包む
  .then(t => t.markAsCompleted(now, now))            // Result<Todo>を返す → そのまま
  .then(t => repository.save(t));                    // 完全にフラット
```

### ResultとEntityの返り値設計方針

**設計判断**: reconstructは常にResult型、インスタンスメソッドは柔軟に使い分ける。

#### reconstruct静的メソッド: ドメインバリデーションの有無に関わらず常にResult型

```typescript
static reconstruct(props: {
  id: string;
  description: string | undefined;  // ✅ undefinedを明示的に渡す必要がある
  dueDate: string | undefined;      // ✅ 省略するとコンパイルエラー
  // ...
}): Result<Todo, DomainError> {
  // ドメインバリデーション（複数値関係性チェック）がある場合
  if (props.status.isCompleted() && !props.dueDate) {
    return Result.err(new DomainError('完了TODOには期限が必要です'));
  }

  // ドメインバリデーションがなくても、Result型を返す
  return Result.ok(new Todo(props));
}
```

**理由（reconstructの特殊性）**:

reconstructは、**インスタンスメソッドとは異なり、ドメインバリデーションの有無に関わらず常にResult型を返す**。

1. **型安全性（最重要）**: オプショナルフィールドも `| undefined` として必須化し、省略を型システムで検出（analyzability-principles.md 原則1）
   - リポジトリ復元時・PATCH更新時のフィールド省略を防ぐ
   - `undefined`を明示的に渡すことで、マージロジックがUseCase層にあることが一目で分かる
2. **一貫性**: reconstructは常にResult型という明確なルール（ドメインバリデーションの有無を気にせず使える）
3. **実装漏れ防止**: リポジトリ復元・PATCH更新の信頼性を担保

**パターンAとの違い**:
- **パターンA（インスタンスメソッド）**: バリデーション不要ならEntityを返す（柔軟性・ボイラープレート削減）
- **reconstruct**: 常にResult型を返す（型安全性・一貫性を優先）

#### インスタンスメソッド: バリデーションの有無で使い分け

```typescript
// ✅ バリデーション不要 → Entityを返す
updateDescription(description: string, updatedAt: string): Todo {
  return new Todo({ ...this, description, updatedAt });
}

// ✅ バリデーション必要 → Result型を返す
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  if (!this.dueDate) {
    return Result.err(new DomainError('期限のないTODOは完了できません'));
  }
  return Result.ok(new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt }));
}
```

**理由**:
1. **YAGNI原則**: バリデーション不要な場合、冗長な`Result.ok()`を書かない
2. **Entity層を薄く保つ**: シンプルなデータ変換はEntityを直接返す
3. **メソッドの意図が明確**: Result型を返す = バリデーションあり
4. **実用上の問題なし**: `Result.then()`が`Entity`を自動で`Result.ok()`に包むため、メソッドチェーンで混在可能

**設計のメリット**:
- ✅ reconstructの型安全性とインスタンスメソッドの柔軟性を両立
- ✅ `Result.then()`により、EntityとResult型を自然にチェーン可能
- ✅ ボイラープレートの最小化（バリデーション不要なら`Result.ok()`不要）

### 2. mutableなプロパティ

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

### 3. setter メソッド

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

### 4. 外部ライブラリへの依存

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

### 5. 技術的な命名

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

### 6. コンストラクタでの型レベルバリデーション

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

### 7. 単一Value Objectの不変条件をEntity内でチェック

```typescript
// ❌ 間違い: 単一Value Objectの不変条件をEntity内でチェック（Value Objectに委譲すべき）
changeStatus(status: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
  // ❌ 状態遷移ルールはTodoStatus Value Object内で実施すべき
  if (this.status.isCompleted() && !status.isCompleted()) {
    return Result.err(new DomainError('完了済みTODOのステータスは変更できません'));
  }
  return Result.ok(new Todo({ ...this, status, updatedAt }));
}

// ✅ 正しい: 単一Value Objectの不変条件はValue Objectでチェック
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  // 不変条件チェックはTodoStatus.canTransitionTo()で実施済み
  return new Todo({ ...this, status: newStatus, updatedAt });
}

// ✅ 正しい: 複数の値の関係性チェックはEntity内でOK
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  // ✅ 複数の値の関係性チェック（Entity全体を見た不変条件）
  if (!this.dueDate) {
    return Result.err(new DomainError('期限のないTODOは完了できません'));
  }
  return Result.ok(new Todo({ ...this, status: TodoStatus.completed(), completedAt, updatedAt }));
}
```

## テストファイル

エンティティには必ずユニットテスト（`*.small.test.ts`）を作成する。

**参照**: `50-test-overview.md` - 詳細なテスト戦略とテストパターン

```
domain/model/todo/
├── todo.ts                   # エンティティ本体
├── todo.small.test.ts        # Entityユニットテスト
├── todo.dummy.ts             # Entityテスト用ファクトリ
├── todo-status.ts            # Value Object
├── todo-status.small.test.ts # Value Objectユニットテスト
└── todo-repository.ts        # リポジトリインターフェース
```

**注**: Value Objectは通常Dummyファクトリ不要（`fromString()`や静的ファクトリメソッドで生成）

## Do / Don't

### ✅ Good

```typescript
// Value Objectを保持するEntity
export class Todo {
  // Tier 1: Required
  readonly id: string;              // プリミティブ
  readonly title: string;           // OpenAPI: minLength/maxLength
  readonly status: TodoStatus;      // Value Object（不変条件あり）

  // Tier 2: Special Case
  readonly dueDate: string | undefined;      // undefinedは"期限なし"
  readonly completedAt: string | undefined;  // undefinedは"未完了"

  // Tier 3: Optional（プリミティブでOK）
  readonly description?: string;    // 純粋に任意

  // 変更不可
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Tier 2: undefinedのみ使用（nullは使わない）
readonly dueDate: string | undefined;

// Entityメソッドはシンプルなデータ変換のみ（チェーン可能）
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  return new Todo({ ...this, status: newStatus, updatedAt });
}
```

### ❌ Bad

```typescript
// nullを使用
readonly dueDate: string | null;  // ❌ undefinedを使うべき

// Tier分類を考慮しない
readonly title?: string;           // ❌ titleは常に必要（Required）

// Value Object化すべきフィールドをプリミティブで保持
readonly status: string;           // ❌ TodoStatus Value Objectにすべき

// Entity内で不変条件チェック
changeStatus(status: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
  // ❌ Entity内で不変条件チェック（Value Objectに委譲すべき）
  if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
    return Result.err(new DomainError('完了済みTODOのステータスは変更できません'));
  }
  return Result.ok(new Todo({ ...this, status, updatedAt }));
}

// Entity内メソッドでthrowを使用
markAsCompleted(completedAt: string, updatedAt: string): Todo {
  if (this.status === 'COMPLETED') {
    throw new Error('Already completed');  // ❌ throwは使わない
  }
  return new Todo({ ...this, status: 'COMPLETED', completedAt, updatedAt });
}

// コンストラクタで型レベルバリデーション（重複）
constructor(props: { title: string }) {
  if (props.title.length === 0) {  // ❌ Handler層で実施済み
    throw new Error("Invalid");
  }
  this.title = props.title;
}

// Type AliasをValue Objectにすべきケース
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
// ❌ 状態遷移ルールがあるため、Value Objectにすべき
```

## 完全な実装例

```typescript
import type { TodoStatus } from './todo-status';

/**
 * TODO エンティティ
 *
 * やるべきタスクを表すドメインエンティティ。
 */
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly description?: string;             // Tier 3: Optional
  readonly status: TodoStatus;
  readonly dueDate: string | undefined;      // Tier 2: Special Case
  readonly completedAt: string | undefined;  // Tier 2: Special Case
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: {
    id: string;
    title: string;
    description: string | undefined;
    status: TodoStatus;
    dueDate: string | undefined;
    completedAt: string | undefined;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * ステータスを変更
   */
  changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
    return new Todo({
      ...this,
      status: newStatus,
      updatedAt,
    });
  }

  /**
   * 再構成用の静的メソッド（リポジトリから復元時に使用）
   */
  static reconstruct(props: {
    id: string;
    title: string;
    description: string | undefined;
    status: TodoStatus;
    dueDate: string | undefined;
    completedAt: string | undefined;
    createdAt: string;
    updatedAt: string;
  }): Result<Todo, DomainError> {
    // 複数値関係性チェック（ある場合）
    if (props.status.isCompleted() && !props.dueDate) {
      return {
        success: false,
        error: new DomainError('完了TODOには期限が必要です'),
      };
    }

    return {
      success: true,
      data: new Todo(props),
    };
  }
}
```

## チェックリスト

### 実装要件

```
[ ] クラス定義を使用
[ ] すべてのプロパティを readonly で定義
[ ] コンストラクタはPropsパターン
[ ] すべてのフィールドを | undefined で必須化（analyzability-principles.md 原則1）
[ ] コンストラクタではバリデーションしない
[ ] 更新メソッドは新インスタンスを返す
[ ] 日時はISO 8601文字列
[ ] JSDocコメントを記述
```

### 禁止事項

```
[ ] 未使用のドメインメソッドは追加しない（YAGNI原則）
[ ] mutableなプロパティは使わない
[ ] setterメソッドは使わない
[ ] 外部ライブラリに依存しない
[ ] 技術的な命名を避ける（s3Key, cognitoUserId等）
[ ] コンストラクタで型レベルバリデーションしない
[ ] 単一Value Objectの不変条件をEntity内でチェックしない
```

### テスト

```
[ ] ユニットテスト（*.small.test.ts）を作成
[ ] Dummyファクトリ（*.dummy.ts）を作成
[ ] すべてのメソッドをテスト
[ ] エッジケースをカバー
```
