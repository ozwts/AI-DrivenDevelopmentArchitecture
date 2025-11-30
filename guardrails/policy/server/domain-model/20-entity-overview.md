# エンティティ設計：概要と原則

## 核心原則

Entityは**識別子（ID）を持つ不変ドメインオブジェクト**であり、**Value Objectを保持**して常に正しい状態を維持する。

## 関連ドキュメント

| トピック           | ファイル                          |
| ------------------ | --------------------------------- |
| フィールド分類     | `21-entity-field-classification.md` |
| 実装詳細           | `22-entity-implementation.md`     |
| バリデーション戦略 | `11-domain-validation-strategy.md` |
| Value Object設計   | `25-value-object-overview.md`     |
| テスト戦略         | `50-test-overview.md`             |
| Dummyファクトリ    | `52-entity-test-patterns.md`      |

## 責務

### 実施すること

1. **Value Objectの保持**: 不変条件を持つフィールドはValue Object化
2. **シンプルなデータ変換**: 新しいインスタンスを返すメソッド（メソッドチェーン可能）
3. **複数値関係性チェック**: Entity全体を見た不変条件（必要最小限）
4. **不変性の保証**: すべてのプロパティを`readonly`で定義

### 実施しないこと

1. **単一Value Objectの不変条件チェック** → Value Object層
2. **型レベルバリデーション** → Handler層（OpenAPI/Zod）
3. **ビジネスルール** → UseCase層（DB参照、権限チェック等）
4. **技術的詳細** → S3キー、DynamoDBテーブル名等を含まない

## メソッド設計パターン

**原則**: 戻り値の型は**失敗可能性を正確に表現**する。チェックが不要なメソッドは`Entity`を直接返す。

### パターン1: シンプルなデータ変換（チェック不要）

チェックが不要なメソッドは**Entityを直接返す**。メソッド名は**ドメインの言葉**を使う。

```typescript
// clarify(): チェック不要 → Todoを直接返す
clarify(description: string | undefined, updatedAt: string): Todo {
  return new Todo({ ...this, description, updatedAt });
}
```

### パターン2: 操作の前提条件チェック（Result型）

メソッド固有の前提条件チェックが必要な場合のみ`Result`型を返す。

```typescript
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

### 戻り値の型まとめ

| メソッド | チェック | 戻り値 |
|---------|----------|--------|
| `from()` | あり | `Result<Entity, DomainError>` |
| `from()` | なし | `Entity` |
| 個別メソッド | あり | `Result<Entity, DomainError>` |
| 個別メソッド | なし | `Entity` |

## Value Object化の判断基準

**参照**: `11-domain-validation-strategy.md`

| Tier   | 基準                             | Value Object化 |
| ------ | -------------------------------- | -------------- |
| Tier 1 | 単一VO内で完結する不変条件を持つ | ✅ 必須        |
| Tier 2 | ドメインルールを持つ             | ✅ 推奨        |
| Tier 3 | 型レベル制約のみ                 | ❌ 不要        |

**重要**: 必ず成功する（バリデーション不要な）Value Objectは作らない。

## Dummyファクトリ

**参照**: `52-entity-test-patterns.md`

すべてのEntityには対応するDummyファクトリを実装する。テストコードで直接`new Entity()`を使わない。

## Do / Don't

### ✅ Good

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus; // Value Object（不変条件あり）
  readonly dueDate: string | undefined; // Tier 2: undefinedは"期限なし"
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: TodoProps) {
    this.id = props.id;
    // ...
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
export class Todo {
  id: string; // ❌ readonlyがない
}

// publicコンストラクタ
export class Todo {
  constructor(props: TodoProps) { // ❌ privateにしてfrom()を使う
    this.id = props.id;
  }
}

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
  return Todo.from({ ...this, ...props });
}

// 必ず成功するValue Object
export class TodoTitle {
  static from(props: { value: string }): Result<TodoTitle, never> {
    return Result.ok(new TodoTitle(props.value)); // ❌ VO化不要
  }
}
```
