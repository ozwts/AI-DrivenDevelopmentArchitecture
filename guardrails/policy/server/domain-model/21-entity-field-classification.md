# エンティティ設計：フィールド分類

## 概要

Always Valid原則を厳密に適用しつつ、実用性を考慮した3段階のフィールド分類を採用する。

**関連ドキュメント**:
- **設計概要**: `20-entity-overview.md`
- **実装詳細**: `22-entity-implementation.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`

## 3-Tier分類によるプラグマティックアプローチ

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

### Tier 2: Special Case（undefinedに意味がある）

**定義**: `undefined`が特別なビジネス的意味を持つフィールド

**実装**:
```typescript
export class Todo {
  // フィールド定義: | undefined 明示（undefinedがビジネス的意味を持つことを明確化）
  readonly dueDate: string | undefined;      // Special Case: undefinedは"期限なし"を意味
  readonly completedAt: string | undefined;  // Special Case: undefinedは"未完了"を意味

  constructor(props: {
    id: string;
    title: string;
    // コンストラクタ: | undefined で必須化（analyzability-principles.md 原則1）
    dueDate: string | undefined;      // 必須（undefinedを明示的に渡す）
    completedAt: string | undefined;  // 必須（undefinedを明示的に渡す）
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.title = props.title;
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

**特徴**:
- **フィールド定義**: `| undefined` 明示（`?`なし）- undefinedがビジネス的意味を持つことが一目で分かる
- **コンストラクタ**: `| undefined` で必須化（省略するとコンパイルエラー）
- `undefined`はビジネス上の意味を持つ（単なる「設定忘れ」ではない）
- 例: 期限なしTODO、完了していないTODO

**重要**: `null`は使用しない。`undefined`のみ使用する。

```typescript
// ✅ Good: フィールド定義（| undefined 明示）
readonly dueDate: string | undefined;

// ✅ Good: コンストラクタ引数（| undefined で必須化）
constructor(props: {
  dueDate: string | undefined;  // 省略不可
})

// ❌ Bad: ? を使用（undefinedの意味が不明確）
readonly dueDate?: string;

// ❌ Bad: null使用
readonly dueDate: string | null;

// ❌ Bad: コンストラクタで省略可能
constructor(props: {
  dueDate?: string;  // 省略可能になってしまう
})
```

### Tier 3: Optional（純粋に任意）

**定義**: あってもなくても良いフィールド（ビジネスロジックに影響しない）

**実装**:
```typescript
export class Todo {
  // フィールド定義: オプショナル（?付き）- undefinedは単に「未設定」を意味
  readonly description?: string;    // Optional: 純粋に任意の説明文
  readonly memo?: string;           // Optional: メモ（任意）

  constructor(props: {
    id: string;
    title: string;
    // コンストラクタ: | undefined で必須化（analyzability-principles.md 原則1）
    description: string | undefined;  // 必須（undefinedを明示的に渡す）
    memo: string | undefined;         // 必須（undefinedを明示的に渡す）
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.memo = props.memo;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

**特徴**:
- **フィールド定義**: オプショナル（`?`付き）- undefinedは単に「未設定」を意味
- **コンストラクタ**: `| undefined` で必須化（省略するとコンパイルエラー）
- `undefined`は単に「設定されていない」ことを意味（ビジネス的意味なし）
- 例: 説明文、メモ、タグ等の補足情報

### 設計判断: Tier 2とTier 3の違い

| 観点 | Tier 2: Special Case | Tier 3: Optional |
|------|---------------------|------------------|
| **フィールド定義** | `string \| undefined`（`?`なし） | `?`付き |
| **コンストラクタ** | `string \| undefined`（必須） | `string \| undefined`（必須） |
| **undefined の意味** | ビジネス上の意味あり | 単に未設定 |
| **ビジネスルール** | 未設定状態を判定に使う | ビジネスロジックに影響しない |
| **マージロジック** | `!== undefined` | `!== undefined`（統一） |
| **例** | dueDate（期限なし）、completedAt（未完了） | description（説明文）、memo（メモ） |

**重要**: マージロジックは両方とも `!== undefined` で統一（安全性・シンプルさを優先）

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

// Tier 3: Optional - 純粋に任意（Tier 2と同じマージロジックで統一）
const description = input.description !== undefined ? input.description : existing.description;
const memo = input.memo !== undefined ? input.memo : existing.memo;

// 3. reconstruct()にマージ済みの値を渡す（Result型を返す）
const updatedResult = Todo.reconstruct({
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

// 4. Result型チェック
if (!updatedResult.success) {
  return updatedResult;  // DomainError（例: 完了TODOは期限必須）
}

const updated = updatedResult.data;
```

## マージロジックの統一

**重要**: Tier 2とTier 3のマージロジックは両方とも `!== undefined` で統一する（安全性・シンプルさを優先）。

### 統一されたマージロジック

```typescript
// Tier 2: Special Case - undefinedに意味がある
const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
const completedAt = input.completedAt !== undefined ? input.completedAt : existing.completedAt;

// Tier 3: Optional - 純粋に任意（Tier 2と同じロジックで統一）
const description = input.description !== undefined ? input.description : existing.description;
const memo = input.memo !== undefined ? input.memo : existing.memo;
```

### なぜ統一するのか

**安全性**:
```typescript
// ❌ ?? 演算子の落とし穴
const dueDate = input.dueDate ?? existing.dueDate;
// inputで意図的にundefinedを送信（"期限なし"にする）しても、existing.dueDateで上書きされる

// ✅ !== undefined なら安全
const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
// inputでundefinedを送信すれば、dueDateがundefined（"期限なし"）になる
```

**シンプルさ**:
- すべてのオプショナルフィールドで同じロジック
- Tier 2からTier 3への変更（またはその逆）でマージロジック変更不要
- 将来の仕様変更に強い

## OpenAPI定義との対応

### Tier 1: Required

```yaml
TodoResponse:
  type: object
  required:
    - id
    - title
    - status
    - createdAt
    - updatedAt
  properties:
    id:
      type: string
    title:
      type: string
      minLength: 1
      maxLength: 200
    status:
      $ref: '#/components/schemas/TodoStatus'
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

### Tier 2: Special Case

```yaml
TodoResponse:
  properties:
    dueDate:
      type: string
      format: date-time
      description: 期限（undefinedは"期限なし"を意味する）
    completedAt:
      type: string
      format: date-time
      description: 完了日時（undefinedは"未完了"を意味する）
```

**重要**: requiredには含めない（オプショナル）

### Tier 3: Optional

```yaml
TodoResponse:
  properties:
    description:
      type: string
      description: 説明文（任意）
    memo:
      type: string
      description: メモ（任意）
```

**重要**: requiredには含めない（オプショナル）

## PATCH更新パラメータとの対応

### OpenAPI: UpdateTodoParams

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
      description: TODOのタイトル
    description:
      type: string
      description: 説明文（オプショナル）
    status:
      $ref: '#/components/schemas/TodoStatus'
    dueDate:
      type: string
      format: date-time
      description: 期限（ISO 8601形式、undefinedで"期限なし"）
    # ... 他のフィールド
```

**重要**: すべてのフィールドがオプショナル（requiredフィールドは空）

### TypeScript型との対応

```typescript
// Zodから自動生成される型
type UpdateTodoParams = {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  // ...
};
```

### UseCase層での処理

```typescript
export class UpdateTodoUseCaseImpl {
  async execute(input: UpdateTodoInput): Promise<UpdateTodoResult> {
    // 既存TODO取得
    const existingResult = await this.#todoRepository.findById({ id: input.id });
    if (!existingResult.success) return existingResult;
    const existing = existingResult.data;

    // Tier 1: Required - Value Object生成
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

    // Tier 2: Special Case - undefinedに意味がある
    const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
    const completedAt = input.completedAt !== undefined ? input.completedAt : existing.completedAt;

    // Tier 3: Optional - 純粋に任意（Tier 2と同じマージロジックで統一）
    const description = input.description !== undefined ? input.description : existing.description;
    const memo = input.memo !== undefined ? input.memo : existing.memo;

    // reconstruct()にマージ済みの値を渡す
    const updatedResult = Todo.reconstruct({
      id: existing.id,
      title,
      status,
      dueDate,
      completedAt,
      description,
      memo,
      userSub: existing.userSub,
      createdAt: existing.createdAt,
      updatedAt: dateToIsoString(this.#props.fetchNow()),
    });

    if (!updatedResult.success) {
      return updatedResult;  // DomainError
    }

    return await this.#todoRepository.save({ todo: updatedResult.data });
  }
}
```

## チェックリスト

### フィールド分類

```
[ ] Tier 1（Required）: ビジネスロジック上、常に必要なフィールド
    - フィールド定義: TypeScriptで非オプショナル（`?`なし）
    - コンストラクタ: 通常の必須引数
    - OpenAPIでrequired指定
    - 例: id, title, status, createdAt, updatedAt

[ ] Tier 2（Special Case）: undefinedがビジネス上の意味を持つ
    - フィールド定義: `| undefined` 明示（`?`なし）
    - コンストラクタ: `| undefined` で必須化（省略するとコンパイルエラー）
    - OpenAPIでrequired指定しない
    - マージ時は `!== undefined` でチェック
    - 例: dueDate（期限なし）、completedAt（未完了）

[ ] Tier 3（Optional）: 純粋に任意のフィールド
    - フィールド定義: オプショナル（`?`付き）
    - コンストラクタ: `| undefined` で必須化（省略するとコンパイルエラー）
    - OpenAPIでrequired指定しない
    - マージ時は `!== undefined` でチェック（Tier 2と統一）
    - 例: description、memo
```

### マージロジック

```
[ ] Tier 2もTier 3も `!== undefined` でチェック（統一）
[ ] マージロジックはUseCase層で実施
[ ] Entity層（reconstruct）はマージ済みの値を受け取る
[ ] `??` 演算子は使用しない（undefinedが上書きされる危険性がある）
```

### OpenAPI定義

```
[ ] Tier 1はrequired指定
[ ] Tier 2/Tier 3はrequired指定しない
[ ] PATCH更新パラメータはすべてオプショナル
[ ] descriptionでフィールドの意味を明記
```
