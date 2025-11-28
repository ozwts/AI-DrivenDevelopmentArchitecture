# エンティティ設計

## 概要

ドメインモデルは、ビジネスの中核概念を不変オブジェクトとして表現する。

- **エンティティ**: 識別子（ID）を持つドメインオブジェクト
- **Value Object**: 識別子を持たず、値そのもので判断されるドメインオブジェクト

**関連ドキュメント**:
- **バリデーション戦略**: `26-validation-strategy.md`
- **Value Object設計**: `25-value-object-design.md`
- **テスト戦略**: `50-test-strategy.md`

## 核心原則

### Always Valid Domain Model原則

**参照**: `26-validation-strategy.md`

Entityは常に正しい状態（Valid State）でなければならない。

- **Value Objectが不変条件を内包**（自己検証）
- Entityは**Value Objectを保持**し、メソッドはシンプルなデータ変換のみ
- Entity内メソッドは**チェーン可能**（Todo返す）
- **throwは使わない**（全層でResult型パターンを徹底）

### Entity設計哲学

Entity層は薄く保ち、ドメインロジックはValue Objectに配置する。Entityはシンプルなデータ変換メソッドのみを持つ（メソッドチェーン可能）。

## 3-Tier分類によるプラグマティックアプローチ

Always Valid原則を厳密に適用しつつ、実用性を考慮した3段階のフィールド分類を採用する。

### Tier 1: Required（常に必要）

**定義**: ビジネスロジック上、常に値が必要なフィールド

**実装**:
```typescript
export class Todo {
  readonly id: string;              // Required
  readonly title: string;           // Required
  readonly status: TodoStatus;      // Required（Value Object）
  readonly createdAt: string;       // Required
  readonly updatedAt: string;       // Required
}
```

**特徴**:
- TypeScriptで非オプショナル（`?`なし）
- コンストラクタで必須引数
- 空文字列や特定値も許容しない（必ず意味のある値）

### Tier 2: Special Case（"未設定"に意味がある）

**定義**: `undefined`や空文字列が特別な意味を持つフィールド

**実装**:
```typescript
export class Todo {
  readonly dueDate?: string;        // Special Case: undefinedは"期限なし"を意味
  readonly completedAt?: string;    // Special Case: undefinedは"未完了"を意味
}
```

**特徴**:
- TypeScriptでオプショナル（`?`付き）
- `undefined`はビジネス上の意味を持つ（単なる「設定忘れ」ではない）
- 例: 期限なしTODO、完了していないTODO

**重要**: `null`は使用しない。`undefined`のみ使用する。

```typescript
// ✅ Good
readonly dueDate?: string;

// ❌ Bad
readonly dueDate: string | null;
```

### Tier 3: Optional（純粋に任意）

**定義**: あってもなくても良いフィールド（ビジネスロジックに影響しない）

**実装**:
```typescript
export class Todo {
  readonly description?: string;    // Optional: 純粋に任意の説明文
  readonly memo?: string;           // Optional: メモ（任意）
}
```

**特徴**:
- TypeScriptでオプショナル（`?`付き）
- `undefined`は単に「設定されていない」ことを意味（ビジネス的意味なし）
- 例: 説明文、メモ、タグ等の補足情報

### 設計判断: Tier 2とTier 3の違い

| 観点 | Tier 2: Special Case | Tier 3: Optional |
|------|---------------------|------------------|
| undefined の意味 | ビジネス上の意味あり | 単に未設定 |
| ビジネスルール | 未設定状態を判定に使う | ビジネスロジックに影響しない |
| 例 | dueDate（期限なし）、completedAt（未完了） | description（説明文）、memo（メモ） |

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

### 3. コンストラクタはPropsパターン

コンストラクタの引数はオブジェクト形式（Propsパターン）。

```typescript
constructor(props: {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;      // Value Object
  createdAt: string;
  updatedAt: string;
}) {
  this.id = props.id;
  this.title = props.title;
  this.description = props.description;
  this.status = props.status;
  this.createdAt = props.createdAt;
  this.updatedAt = props.updatedAt;
}
```

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

### 5. 更新メソッドは新インスタンスを返す（シンプルなデータ変換）

エンティティの状態を変更する場合、必ず新しいインスタンスを生成して返す。

**設計原則**: Entity内メソッドは**シンプルなデータ変換のみ**。不変条件チェックはValue Objectに委譲。

```typescript
/**
 * ステータスを変更して新しいTodoインスタンスを返す
 *
 * 不変条件チェックはTodoStatus Value Object内で実施済み
 */
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  return new Todo({
    id: this.id,
    title: this.title,
    description: this.description,
    status: newStatus,  // Value Object（検証済み）
    createdAt: this.createdAt,
    updatedAt,
  });
}

/**
 * 汎用的な更新メソッド（メソッドチェーン可能）
 */
update(props: {
  title?: string;           // OpenAPIでバリデーション済み
  status?: TodoStatus;      // Value Object（不変条件あり）
  description?: string;
  dueDate?: string;
  updatedAt: string;
}): Todo {
  return new Todo({
    id: this.id,
    title: props.title ?? this.title,
    status: props.status ?? this.status,
    description: props.description ?? this.description,
    dueDate: props.dueDate ?? this.dueDate,
    createdAt: this.createdAt,
    updatedAt: props.updatedAt,
  });
}
```

**メソッドチェーンの例**:

```typescript
const updated = existing
  .changeStatus(newStatus, now)      // Value Object（検証済み）
  .update({ title: "新しいタイトル", updatedAt: now });  // OpenAPIでバリデーション済み
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

**設計方針**: ビジネスロジックの複雑さに応じて、`reconstruct()`静的メソッドと個別ビジネスメソッドを使い分ける。

**参照**: `guardrails/policy/server/use-case/15-domain-model-interaction.md` - 詳細な使い分け基準

#### パターンA: reconstruct()使用可能

以下の条件をすべて満たす場合、`reconstruct()`による全フィールド受け取りを許可:

1. Entity内にビジネスロジックがない（Value Objectで検証完了）
2. 複数フィールドの連動ルールがない
3. 状態遷移の制約がValue Object内で表現可能

```typescript
// ✅ 正しい: シンプルなフィールド更新
static reconstruct(props: {
  id: string;
  title: string;
  status: TodoStatus;  // Value Objectで検証済み
  // ...
}): Todo {
  return new Todo(props);
}

// UseCase層で使用
const updated = Todo.reconstruct({
  ...existing,
  title: titleResult.data,  // Value Objectで検証済み
  status: statusResult.data,
  updatedAt: now,
});
```

#### パターンB: 個別メソッド必須

以下のいずれかに該当する場合、ビジネスの意図を表現する個別メソッドを実装:

1. 複数フィールドの連動（例: 完了時にcompletedAtとstatusを同時変更）
2. Entity全体を見た不変条件（例: 完了TODOは期限必須）
3. ビジネス上の意図を明確にすべき操作（例: markAsCompleted）

```typescript
// ✅ 正しい: ビジネスロジックを持つ個別メソッド
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, ValidationError> {
  // Entity全体を見た不変条件
  if (!this.dueDate) {
    return {
      success: false,
      error: new ValidationError('期限のないTODOは完了できません'),
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

**重要**: この使い分けにより、ドメインモデル貧血症を防ぎつつ、PATCH更新の実用性を保つ

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

### 7. Entity内で不変条件チェック

```typescript
// ❌ 間違い: Entity内で不変条件チェック（Value Objectに委譲すべき）
changeStatus(status: TodoStatus, updatedAt: string): Result<Todo, ValidationError> {
  if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
    return {
      success: false,
      error: new ValidationError('完了済みTODOのステータスは変更できません'),
    };
  }
  return { success: true, data: new Todo({ ...this, status, updatedAt }) };
}

// ✅ 正しい: Value Objectで不変条件チェック
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  // 不変条件チェックはTodoStatus.canTransitionTo()で実施済み
  return new Todo({ ...this, status: newStatus, updatedAt });
}
```

## 3-Tierと PATCH統一の関係

**参照**:
- `policy/contract/api/20-endpoint-design.md` - HTTPメソッド統一ポリシー
- `guardrails/policy/server/use-case/20-use-case-implementation.md` - PATCH更新時のマージロジック

PATCH統一により、3-Tier分類を自然に表現できる。

**重要**: 以下のマージロジックはUseCase層で実施する。Entity層はreconstruct()でマージ済みの値を受け取るのみ。

```typescript
// UseCase層でのPATCH更新マージロジック例

// 1. 変更されたフィールドのみValue Object生成・マージ
let title = existing.title;
if (input.title !== undefined) {
  const titleResult = TodoTitle.fromString(input.title);
  if (!titleResult.success) return titleResult;
  title = titleResult.data;
}

let status = existing.status;
if (input.status !== undefined) {
  const statusResult = TodoStatus.fromString(input.status);
  if (!statusResult.success) return statusResult;
  status = statusResult.data;
}

// 2. プリミティブフィールドのマージ
// Tier 2: Special Case - undefinedに意味がある
const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
const completedAt = input.completedAt !== undefined ? input.completedAt : existing.completedAt;

// Tier 3: Optional - 純粋に任意
const description = input.description ?? existing.description;
const memo = input.memo ?? existing.memo;

// 3. reconstruct()にマージ済みの値を渡す
const updated = Todo.reconstruct({
  id: existing.id,
  title,              // Tier 1: Required (マージ済み)
  status,             // Tier 1: Required (マージ済み)
  dueDate,            // Tier 2: Special Case (マージ済み)
  completedAt,        // Tier 2: Special Case (マージ済み)
  description,        // Tier 3: Optional (マージ済み)
  memo,               // Tier 3: Optional (マージ済み)
  userSub: existing.userSub,     // 変更不可
  createdAt: existing.createdAt, // 変更不可
  updatedAt: dateToIsoString(now),
});
```

## テストファイル

エンティティには必ずユニットテスト（`*.small.test.ts`）を作成する。

**参照**: `50-test-strategy.md` - 詳細なテスト戦略とテストパターン

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
  readonly dueDate?: string;        // undefinedは"期限なし"
  readonly completedAt?: string;    // undefinedは"未完了"

  // Tier 3: Optional（プリミティブでOK）
  readonly description?: string;    // 純粋に任意

  // 変更不可
  readonly createdAt: string;
  readonly updatedAt: string;
}

// undefinedのみ使用（nullは使わない）
readonly dueDate?: string;

// Entityメソッドはシンプルなデータ変換のみ（チェーン可能）
changeStatus(newStatus: TodoStatus, updatedAt: string): Todo {
  return new Todo({ ...this, status: newStatus, updatedAt });
}

update(props: {
  title?: string;           // OpenAPIでバリデーション済み
  status?: TodoStatus;      // Value Object（不変条件あり）
  description?: string;
  updatedAt: string;
}): Todo {
  return new Todo({
    ...this,
    title: props.title ?? this.title,
    status: props.status ?? this.status,
    description: props.description ?? this.description,
    updatedAt: props.updatedAt,
  });
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
changeStatus(status: TodoStatus, updatedAt: string): Result<Todo, ValidationError> {
  // ❌ Entity内で不変条件チェック（Value Objectに委譲すべき）
  if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
    return {
      success: false,
      error: new ValidationError('完了済みTODOのステータスは変更できません'),
    };
  }
  return { success: true, data: new Todo({ ...this, status, updatedAt }) };
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
  readonly description?: string;
  readonly status: TodoStatus;
  readonly dueDate?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: {
    id: string;
    title: string;
    description?: string;
    status: TodoStatus;
    dueDate?: string;
    completedAt?: string;
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
   * 汎用的な更新メソッド
   */
  update(props: {
    title?: string;
    description?: string;
    status?: TodoStatus;
    dueDate?: string;
    updatedAt: string;
  }): Todo {
    return new Todo({
      ...this,
      title: props.title ?? this.title,
      description: props.description ?? this.description,
      status: props.status ?? this.status,
      dueDate: props.dueDate ?? this.dueDate,
      updatedAt: props.updatedAt,
    });
  }

  /**
   * 再構成用の静的メソッド（リポジトリから復元時に使用）
   */
  static reconstruct(props: {
    id: string;
    title: string;
    description?: string;
    status: TodoStatus;
    dueDate?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  }): Todo {
    return new Todo(props);
  }
}
```
