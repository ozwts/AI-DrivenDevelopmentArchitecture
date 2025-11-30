# エンティティ設計：フィールド分類

## 核心原則

Entityフィールドは**必須性とundefinedの意味**で3段階に分類し、**コンストラクタでは全フィールドを必須化**する（analyzability原則）。

## 関連ドキュメント

| トピック           | ファイル                       |
| ------------------ | ------------------------------ |
| Entity設計概要     | `20-entity-overview.md`        |
| Entity実装詳細     | `22-entity-implementation.md`  |
| バリデーション戦略 | `11-domain-validation-strategy.md` |
| PATCH更新パターン  | `../use-case/20-use-case-implementation.md` |

## 3-Tier分類

| Tier   | 分類         | フィールド定義       | コンストラクタ             | undefined の意味 | 例                    |
| ------ | ------------ | -------------------- | -------------------------- | ---------------- | --------------------- |
| Tier 1 | Required     | `string`             | `string`（必須）           | -                | id, title, status     |
| Tier 2 | Special Case | `string \| undefined` | `string \| undefined`（必須） | ビジネス上の意味 | dueDate, completedAt  |
| Tier 3 | Optional     | `string \| undefined` | `string \| undefined`（必須） | 単に未設定       | description, memo     |

### Tier 1: Required

ビジネスロジック上、常に値が必要なフィールド。

```typescript
readonly id: string;
readonly title: string;
readonly status: TodoStatus;
readonly createdAt: string;
readonly updatedAt: string;
```

### Tier 2: Special Case

`undefined`がビジネス上の意味を持つフィールド。**JSDocでundefinedの意味を必ず記載する**。

```typescript
/**
 * 期限日
 * - 値あり: 期限が設定されている
 * - undefined: 「期限なし」を意味する（明示的な業務状態）
 */
readonly dueDate: string | undefined;

/**
 * 完了日時
 * - 値あり: 完了済み
 * - undefined: 「未完了」を意味する（明示的な業務状態）
 */
readonly completedAt: string | undefined;
```

### Tier 3: Optional

あってもなくても良いフィールド。undefinedは単に「未設定」を意味する。

```typescript
/**
 * 説明
 * TODOの詳細説明。
 */
readonly description: string | undefined;
```

## コンストラクタ

**analyzability原則**: すべてのフィールドを`| undefined`で必須化し、省略不可にする。

```typescript
constructor(props: {
  id: string;
  title: string;
  status: TodoStatus;
  dueDate: string | undefined;      // Tier 2: 必須（undefinedを明示的に渡す）
  completedAt: string | undefined;  // Tier 2: 必須
  description: string | undefined;  // Tier 3: 必須
  createdAt: string;
  updatedAt: string;
}) {
  this.id = props.id;
  // ...
}
```

## PATCH更新との対応

**参照**: `../use-case/20-use-case-implementation.md`

| Tier   | UseCase層での処理                                    |
| ------ | ---------------------------------------------------- |
| Tier 1 | Value Object生成後、個別メソッドで更新               |
| Tier 2 | そのまま個別メソッドに渡す（`undefined`=クリア）     |
| Tier 3 | そのまま個別メソッドに渡す（`undefined`=クリア）     |

```typescript
// 送られたフィールドのみ更新
return Result.ok(existing)
  .then((t) =>
    "title" in input
      ? TodoTitle.from({ title: input.title }).then((v) => t.rename(v, now))
      : t  // 送られていない → 既存値のまま
  )
  .then((t) =>
    "dueDate" in input
      ? t.reschedule(input.dueDate, now)  // undefined可（クリア）
      : t
  );
```

**重要**: `??`演算子は使用しない。`'in'`演算子でフィールド存在を判定する。

## OpenAPI定義との対応

```yaml
# Tier 1: required指定
required:
  - id
  - title
  - status
  - createdAt
  - updatedAt

# Tier 2/Tier 3: required指定しない、PATCH時はnullable: true
properties:
  dueDate:
    type: string
    format: date-time
    nullable: true  # PATCH時のクリア用
    description: 期限（undefinedは"期限なし"を意味する）
```

## Do / Don't

### ✅ Good

```typescript
// Tier 2: JSDocでundefinedの意味を明示
/**
 * 期限日
 * - undefined: 「期限なし」を意味する
 */
readonly dueDate: string | undefined;

// コンストラクタで全フィールド必須化
constructor(props: {
  dueDate: string | undefined;  // 省略不可
})

// PATCH更新: 'in'演算子で存在確認
.then((t) =>
  "dueDate" in input
    ? t.reschedule(input.dueDate, now)
    : t
)
```

### ❌ Bad

```typescript
// nullを使用
readonly dueDate: string | null;  // ❌ undefinedを使う

// コンストラクタで省略可能
constructor(props: {
  dueDate?: string;  // ❌ 省略可能になってしまう
})

// ??演算子を使用
const dueDate = input.dueDate ?? existing.dueDate;  // ❌ undefinedを意図的に送信しても上書きされない

// Tier 2でJSDocなし
readonly dueDate: string | undefined;  // ❌ undefinedの意味が不明確
```
