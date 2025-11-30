# Value Object設計：概要

## 核心原則

Value Objectは**識別子を持たず値で等価性を判断**する不変オブジェクトであり、**ドメインルールまたは不変条件を内包**する。

## 関連ドキュメント

| トピック           | ファイル                          |
| ------------------ | --------------------------------- |
| 実装詳細           | `26-value-object-implementation.md` |
| バリデーション戦略 | `11-domain-validation-strategy.md`  |
| テスト戦略         | `50-test-overview.md`               |

## 責務

### 実施すること

1. **ドメインルールの内包**: OpenAPIで表現不可能な複雑な制約
2. **不変条件の内包**: 状態遷移ルール等の自己完結的な検証
3. **Result型によるファクトリ**: `from()`で生成、例外を使わない

### 実施しないこと

1. **型レベルバリデーション** → Handler層（OpenAPI/Zod）
2. **複数値の関係性チェック** → Entity層
3. **必ず成功するバリデーション** → Value Object化不要

## Value Object化の判断基準

**参照**: `11-domain-validation-strategy.md`, `constitution/implementation-minimization-principles.md`

| Tier   | 基準                             | Value Object化 | 例                                       |
| ------ | -------------------------------- | -------------- | ---------------------------------------- |
| Tier 1 | 単一VO内で完結する不変条件を持つ | 必須           | `TodoStatus`（完了済みは変更不可）       |
| Tier 2 | ドメインルールを持つ             | 推奨           | `Email`（会社ドメインのみ）、`Money`     |
| Tier 3 | 型レベル制約のみ                 | 不要           | `title: string`（OpenAPIで表現可能）     |

### 最低限の実装の原則

**重要**: バリデーションが不要ならValue Object化しない。「将来必要になるかも」で先行実装しない。

- **現在バリデーションがない** → VO化しない（プリミティブ型のまま）
- **将来バリデーションが必要になった** → その時点でVO化する
- **必ず成功するValue Object** → 作らない

```typescript
// ❌ バリデーションがないのにVO化
export class TodoTitle {
  static from(props: { value: string }): Result<TodoTitle, never> {
    return Result.ok(new TodoTitle(props.value)); // 必ず成功 → VO化不要
  }
}

// ✅ バリデーションがないならプリミティブ型のまま
export class Todo {
  readonly title: string; // VO化しない
}
```

## Entityとの違い

| 観点           | Entity                           | Value Object           |
| -------------- | -------------------------------- | ---------------------- |
| 識別子         | あり（ID）                       | なし                   |
| 等価性         | IDで判断                         | 全プロパティで判断     |
| 可変性         | 更新メソッドで新インスタンス生成 | 完全に不変             |
| ライフサイクル | 独立して存在                     | エンティティに埋め込み |

## 必須メソッド

| メソッド                   | 説明                                         |
| -------------------------- | -------------------------------------------- |
| ES2022プライベートフィールド | `readonly #value` で真のプライベート性を実現 |
| プライベートコンストラクタ | 外部からの直接生成を防ぐ                     |
| `from(props)`              | Props型エイリアスを受け取り、Result型を返す  |
| `equals(other)`            | 値の等価性を判断                             |
| `toString()`               | デバッグ・ログ用の文字列表現                 |

**参照**: `26-value-object-implementation.md` - 詳細な実装パターン

## ファイル構成

```
domain/model/todo/
├── todo.entity.ts              # Entity本体
├── todo.entity.small.test.ts   # Entityテスト
├── todo.entity.dummy.ts        # Entityダミー
├── todo-status.vo.ts           # Value Object（.vo.ts）
├── todo-status.vo.small.test.ts
├── todo-status.vo.dummy.ts     # Entity Dummyから使用
└── todo.repository.ts
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
  // ES2022プライベートフィールド（意味のある名前を使用）
  readonly #status: TodoStatusValue;

  // コンストラクタにボディを持たせる
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

  // 不変条件チェック
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
export class TodoStatus {
  constructor(public value: string) {} // ❌ privateでない
}

// アンダースコアプレフィックス（ESLint違反）
export class TodoStatus {
  private constructor(private readonly _value: string) {} // ❌ no-underscore-dangle
}

// パラメータプロパティ（ESLint違反）
export class TodoStatus {
  private constructor(private readonly value: string) {} // ❌ no-useless-constructor
}

// Type Aliasで不変条件を表現できない
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED"; // ❌ 状態遷移ルールを表現不可

// throwを使用
static from(props: TodoStatusProps): TodoStatus {
  if (!validValues.includes(props.status)) {
    throw new Error("Invalid"); // ❌ Result型を返すべき
  }
}

// Entity内で単一VOの不変条件チェック（VOに委譲すべき）
approve(approvedAt: string): Result<Todo, DomainError> {
  if (this.status.isCompleted()) {
    return Result.err(new DomainError("...")); // ❌ VOのcanTransitionTo()に委譲
  }
}

// 必ず成功するValue Object
static from(props: { value: string }): Result<TodoTitle, never> {
  return Result.ok(new TodoTitle(props.value)); // ❌ VO化不要
}
```
