# エンティティ設計：実装詳細

## 核心原則

Entityは**classで定義**し、**すべてのプロパティをreadonly**で宣言、**更新メソッドは新インスタンスを返す**。

## 関連ドキュメント

| トピック           | ファイル                          |
| ------------------ | --------------------------------- |
| Entity設計概要     | `20-entity-overview.md`           |
| フィールド分類     | `21-entity-field-classification.md` |
| バリデーション戦略 | `11-domain-validation-strategy.md` |
| テスト戦略         | `50-test-overview.md`             |

## 実装要件

### 1. クラス定義とreadonly

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### 2. Props型パターン

コンストラクタ引数は`<Entity>Props`型エイリアスで定義。すべてのフィールドを`| undefined`で必須化。

```typescript
export type TodoProps = {
  id: string;
  title: string;
  description: string | undefined;
  status: TodoStatus;
  dueDate: string | undefined;
  completedAt: string | undefined;
  createdAt: string;
  updatedAt: string;
};

export class Todo {
  private constructor(props: TodoProps) {
    this.id = props.id;
    // ...
  }
}
```

### 3. privateコンストラクタとファクトリメソッド

Value Object同様、Entityもprivateコンストラクタと`from()`ファクトリメソッドを使用する。

```typescript
export class Todo {
  private constructor(props: TodoProps) {
    this.id = props.id;
    // ...
  }

  static from(props: TodoProps): Result<Todo, DomainError> {
    // データ整合性チェック（不変条件）
    if (props.status.isCompleted() && props.completedAt === undefined) {
      return Result.err(new DomainError("完了済みTODOには完了日時が必要です"));
    }
    return Result.ok(new Todo(props));
  }
}
```

### 4. バリデーションの責務分担

`from()`と個別メソッドで検証の責務を明確に分ける。

| 検証場所 | 責務 | 検証内容 |
|---------|------|----------|
| `from()` | データ整合性（不変条件） | 「このデータは整合性があるか？」 |
| 個別メソッド | 操作の前提条件（ビジネスルール） | 「この操作は今の状態から可能か？」 |

**`from()` の検証例**（DBからの復元、外部入力）:
- `status`が完了なら`completedAt`が必須
- `status`が完了なら`completedAt`は`createdAt`以降

**個別メソッドの検証例**（状態遷移の前提条件）:
- 「期限がないTODOは完了できない」
- 「完了済みTODOは再完了できない」

### 5. 戻り値の型は失敗可能性を正確に表現する

**原則**: チェックが必要な場合のみ`Result`型を返す。不要な場合は`Entity`を直接返す。

```typescript
// from(): データ整合性チェックあり → Result
static from(props: TodoProps): Result<Todo, DomainError> {
  if (props.status.isCompleted() && props.completedAt === undefined) {
    return Result.err(new DomainError("完了済みTODOには完了日時が必要です"));
  }
  return Result.ok(new Todo(props));
}

// from(): チェック不要なEntity → Entityを直接返す
static from(props: AttachmentProps): Attachment {
  return new Attachment(props);
}

// clarify(): チェック不要 → Todoを直接返す
clarify(description: string | undefined, updatedAt: string): Todo {
  return new Todo({ ...this, description, updatedAt });
}

// complete(): 操作の前提条件チェックあり → Result
complete(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  if (!this.dueDate) {
    return Result.err(new DomainError("期限のないTODOは完了できません"));
  }
  return Result.ok(new Todo({
    ...this,
    status: TodoStatus.completed(),
    completedAt,
    updatedAt,
  }));
}
```

| メソッド | チェック | 戻り値 |
|---------|----------|--------|
| `from()` | あり | `Result<Entity, DomainError>` |
| `from()` | なし | `Entity` |
| 個別メソッド | あり | `Result<Entity, DomainError>` |
| 個別メソッド | なし | `Entity` |

### 6. コンストラクタではバリデーションしない

Handler層でOpenAPI/Zodバリデーション済みのため、コンストラクタでは型レベルバリデーションを行わない（MECE原則）。

### 7. メソッド命名はドメインの言葉を使う

メソッド名は**ビジネス上の意図**を表現する。`set`、`change`、`update`などの汎用的な動詞は避ける。

```typescript
// Good: ドメインの言葉（チェックがある場合のみResult型）
approve(updatedAt: string): Todo                                     // 承認する
reject(reason: string, updatedAt: string): Todo                      // 却下する
complete(completedAt: string): Result<Todo, DomainError>             // 完了する（前提条件チェックあり）
cancel(updatedAt: string): Todo                                      // キャンセルする
assign(userId: string, updatedAt: string): Todo                      // 担当者をアサインする
clarify(description: string): Todo                                   // 説明を明確化する
reschedule(dueDate: string): Todo                                    // 期限を再設定する

// Bad: 汎用的な動詞
setStatus(status: TodoStatus)             // ❌ 何をしているか不明
changeStatus(status: TodoStatus)          // ❌ ビジネス意図が不明
updateDescription(description: string)    // ❌ updateは汎用的すぎる
```

**例外**: Tier 3フィールド（単なるオプション値）の更新は`with{Field}()`パターンを許容。

```typescript
// Tier 3フィールドの更新（ビジネス上の特別な意味がない場合）
withMemo(memo: string | undefined, updatedAt: string): Todo {
  return new Todo({ ...this, memo, updatedAt });
}
```

### 8. 日時はISO 8601文字列

```typescript
readonly createdAt: string; // "2024-01-01T00:00:00.000Z"
readonly updatedAt: string;
```

### 9. JSDocコメント

すべてのEntity、フィールド、メソッドにJSDocを記載する。

```typescript
/**
 * TODOエンティティ
 *
 * タスク管理の中心となるエンティティ。
 * 添付ファイル（Attachment）を子エンティティとして保持する。
 */
export class Todo {
  /** TODOの一意識別子 */
  readonly id: string;

  /** TODOのタイトル */
  readonly title: string;

  /**
   * 期限日
   * - 値あり: 期限が設定されている
   * - undefined: 「期限なし」を意味する（Tier 2）
   */
  readonly dueDate: string | undefined;

  /**
   * 説明を明確化する
   * @param description 新しい説明（undefinedでクリア）
   * @param updatedAt 更新日時
   * @returns 更新されたTodoインスタンス
   */
  clarify(description: string | undefined, updatedAt: string): Todo {
    return new Todo({ ...this, description, updatedAt });
  }
}
```

**Tier 2フィールド（undefinedがビジネス上の意味を持つ）**: 値ありとundefinedの両方の意味を必ず記載。

## 禁止事項

### 未使用のドメインメソッド追加（YAGNI原則）

現在のユースケースで使われていないメソッドを追加しない。

### 単一VOの不変条件をEntity内でチェック

単一Value Objectの不変条件はValue Object層に委譲する。

```typescript
// ❌ Entity内で状態遷移チェック
approve(approvedAt: string, updatedAt: string): Result<Todo, DomainError> {
  if (this.status.isCompleted()) {
    return Result.err(new DomainError("...")); // ❌ VOのcanTransitionTo()に委譲すべき
  }
}

// ✅ VOの不変条件チェック後にEntityメソッドを呼ぶ（UseCase層で）
// UseCase層: status.canTransitionTo(newStatus) でチェック後
// Entity層: approve(approvedAt, updatedAt) を呼ぶ
// チェック不要 → Todoを直接返す
approve(approvedAt: string, updatedAt: string): Todo {
  return new Todo({ ...this, status: TodoStatus.approved(), approvedAt, updatedAt });
}
```

## ファイル構成

```
domain/model/todo/
├── todo.entity.ts              # Entity本体
├── todo.entity.small.test.ts   # Entityテスト
├── todo.entity.dummy.ts        # Dummyファクトリ
├── todo-status.vo.ts           # Value Object
├── todo-status.vo.small.test.ts
├── todo-status.vo.dummy.ts
└── todo.repository.ts          # リポジトリIF
```

## Do / Don't

### ✅ Good

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;

  /**
   * 期限日
   * - undefined: 「期限なし」を意味する
   */
  readonly dueDate: string | undefined;

  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.status = props.status;
    this.dueDate = props.dueDate;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // from(): データ整合性チェックあり → Result
  static from(props: TodoProps): Result<Todo, DomainError> {
    if (props.status.isCompleted() && props.completedAt === undefined) {
      return Result.err(new DomainError("完了済みTODOには完了日時が必要です"));
    }
    return Result.ok(new Todo(props));
  }

  // clarify(): チェック不要 → Todoを直接返す
  clarify(description: string | undefined, updatedAt: string): Todo {
    return new Todo({ ...this, description, updatedAt });
  }

  // complete(): 操作の前提条件チェックあり → Result
  complete(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
    if (!this.dueDate) {
      return Result.err(new DomainError("期限のないTODOは完了できません"));
    }
    return Result.ok(new Todo({
      ...this,
      status: TodoStatus.completed(),
      completedAt,
      updatedAt,
    }));
  }
}
```

### ❌ Bad

```typescript
// mutableなプロパティ
id: string; // ❌ readonlyがない

// nullを使用
readonly dueDate: string | null; // ❌ undefinedを使う

// publicコンストラクタ
constructor(props: TodoProps) { // ❌ privateにしてファクトリメソッドを使う
  this.id = props.id;
}

// コンストラクタでバリデーション
private constructor(props: { title: string }) {
  if (props.title.length === 0) { // ❌ Handler層で実施済み
    throw new Error("Invalid");
  }
}

// setterメソッド
setStatus(status: TodoStatus): void { // ❌ 新インスタンスを返す
  this.status = status;
}

// 外部ライブラリ依存
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"; // ❌

// 技術的な命名
readonly s3Key: string; // ❌ storageKey等の抽象名を使う

// throwを使用
complete(): Todo {
  if (this.status.isCompleted()) {
    throw new Error("Already completed"); // ❌ Result型を使う
  }
}

// 汎用的な動詞を使用
setStatus(status: TodoStatus): void { ... }     // ❌ ビジネス意図が不明
changeStatus(status: TodoStatus): void { ... }  // ❌ ドメインの言葉を使うべき
updateDescription(description: string): Todo { ... } // ❌ clarifyなど

// 汎用updateメソッド
update(props: Partial<TodoProps>): Todo { // ❌ 個別メソッドを使う
  return new Todo({ ...this, ...props });
}
```
