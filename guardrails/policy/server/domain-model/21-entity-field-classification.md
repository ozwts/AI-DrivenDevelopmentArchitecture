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

**重要**: PATCHでは送られたフィールドのみ更新する。個別の更新メソッドをメソッドチェーンで組み合わせる。

**3-Tier分類ごとの処理**:

| Tier | フィールド例 | UseCase層での処理 |
|------|------------|------------------|
| **Tier 1: Required** | `title`, `status` | Value Object生成後、個別メソッドで更新 |
| **Tier 2: Special Case** | `dueDate`, `completedAt` | そのまま個別メソッドに渡す（`undefined`=クリア） |
| **Tier 3: Optional** | `description`, `memo` | そのまま個別メソッドに渡す（`undefined`=クリア） |

**実装詳細**: `guardrails/policy/server/use-case/20-use-case-implementation.md` - PATCH更新時の個別メソッド更新パターン参照

## PATCH更新での自然なマージ

**メソッドチェーンによる自然なマージ**:

PATCH更新では、送られたフィールドのみ個別メソッドで更新し、送られなかったフィールドは既存値のまま残る = **明示的なマージロジック不要**。

```typescript
// 送られたフィールドのみ更新、送られなかったフィールドは既存値のまま
return Result.ok(existing)
  .then(t => 'title' in input
    ? TodoTitle.from({ title: input.title }).then(v => t.changeTitle(v, now))
    : t  // 送られていない → existingのtitleのまま
  )
  .then(t => 'dueDate' in input
    ? t.changeDueDate(input.dueDate, now)  // undefined可（クリア）
    : t  // 送られていない → existingのdueDateのまま
  );
```

**重要**: `??`演算子は使用しない（`undefined`を意図的に送信した場合に上書きされる危険性）。`'in'`演算子でフィールド存在を判定する。

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
    # Tier 1: Required（更新時はオプショナル）
    title:
      type: string
      minLength: 1
      maxLength: 200
    status:
      $ref: '#/components/schemas/TodoStatus'

    # Tier 2: Special Case（nullable: trueでクリア可能）
    dueDate:
      type: string
      format: date-time
      nullable: true
      description: 期限（nullで\"期限なし\"に設定）
    completedAt:
      type: string
      format: date-time
      nullable: true
      description: 完了日時（nullで\"未完了\"に設定）

    # Tier 3: Optional（nullable: trueでクリア可能）
    description:
      type: string
      nullable: true
      description: 説明文（nullでクリア）
    memo:
      type: string
      nullable: true
      description: メモ（nullでクリア）
```

**重要**:
- すべてのフィールドがオプショナル（requiredフィールドは空）
- Tier 2/Tier 3は`nullable: true`でフィールドクリア可能
- Handler層で`null` → `undefined`変換

**実装詳細**:
- **Handler層**: `policy/server/handler/10-handler-overview.md` - null → undefined 変換パターン
- **UseCase層**: `guardrails/policy/server/use-case/20-use-case-implementation.md` - PATCH更新時の個別メソッド更新

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

### PATCH更新

```
[ ] OpenAPI: Tier 2/Tier 3は`nullable: true`（フィールドクリア可能）
[ ] Handler層: `'in'`演算子で存在確認、`null` → `undefined`変換
[ ] UseCase層: Result.then()メソッドチェーンで更新
[ ] Entity層: 個別メソッド（`changeXxx()`）で値を受け取る
[ ] `??`演算子は使用しない（`'in'`演算子を使用）
```

### OpenAPI定義

```
[ ] Tier 1はrequired指定
[ ] Tier 2/Tier 3はrequired指定しない
[ ] PATCH更新パラメータはすべてオプショナル
[ ] Tier 2/Tier 3にnullable: true（クリア用）
[ ] descriptionでフィールドの意味を明記
```
