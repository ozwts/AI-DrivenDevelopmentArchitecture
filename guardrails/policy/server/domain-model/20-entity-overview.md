# エンティティ設計：概要と原則

## 概要

ドメインモデルは、ビジネスの中核概念を不変オブジェクトとして表現する。

- **エンティティ**: 識別子（ID）を持つドメインオブジェクト
- **Value Object**: 識別子を持たず、値そのもので判断されるドメインオブジェクト

**関連ドキュメント**:
- **フィールド分類**: `21-entity-field-classification.md`
- **実装詳細**: `22-entity-implementation.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`
- **Value Object設計**: `25-value-object-overview.md`
- **テスト戦略**: `50-test-overview.md`

## 核心原則

### Always Valid Domain Model原則

**参照**: `11-domain-validation-strategy.md`

Entityは常に正しい状態（Valid State）でなければならない。

- **Value Objectが不変条件を内包**（自己検証）
- Entityは**Value Objectを保持**し、メソッドはシンプルなデータ変換のみ
- Entity内メソッドは**チェーン可能**（Todo返す）
- **throwは使わない**（全層でResult型パターンを徹底）

### Entity設計哲学

**基本方針**: Entity層は薄く保ち、メソッドチェーン可能な状態を維持する。

**バリデーション配置の原則**:
- **単一Value Objectの不変条件**: Value Object層に配置（積極的に活用）
- **複数の値の関係性・状態遷移**: Entity層で実施可能（必要最小限）
- **シンプルなデータ変換**: メソッドチェーン可能（基本的にこのパターンを使用）

**メソッド設計の原則**:
- **Entityを返す**: シンプルなデータ変換（メソッドチェーン可能）
- **Result型を返す**: 複数値関係性バリデーションが必要な場合のみ（メソッドチェーン不可）
- **reconstructは必ずResult型**: 一貫性のため（複数値関係性チェックの有無に関わらず）

## Entity層の責務

### 実施すること

1. **Value Objectの保持**: 不変条件を持つフィールドはValue Object化
2. **シンプルなデータ変換**: 新しいインスタンスを返すメソッド（メソッドチェーン可能）
3. **複数値関係性チェック**: Entity全体を見た不変条件（必要最小限）
4. **不変性の保証**: すべてのプロパティを`readonly`で定義

### 実施しないこと

1. **単一Value Objectの不変条件チェック**: Value Object層に委譲
2. **型レベルバリデーション**: Handler層（OpenAPI/Zod）で実施済み
3. **ビジネスルール**: UseCase層の責務（DB参照、権限チェック等）
4. **技術的詳細**: S3キー、DynamoDBテーブル名等の技術要素を含まない

## Entity設計の3つのパターン

### パターン1: シンプルなデータ変換（バリデーション不要）

不変条件チェックが不要なフィールドの更新。Entityを返す（メソッドチェーン可能）。

```typescript
/**
 * 説明文を更新して新しいTodoインスタンスを返す
 *
 * バリデーション不要（OpenAPIで型チェック済み）
 */
updateDescription(description: string | undefined, updatedAt: string): Todo {
  return new Todo({
    ...this,
    description,
    updatedAt,
  });
}
```

**メソッドチェーンの例**:

```typescript
// ✅ バリデーション不要な更新はメソッドチェーン可能
const updated = existing
  .updateDescription("新しい説明", now)
  .updateMemo("メモ追加", now);
```

### パターン2: ドメインルール/不変条件チェック

単一Value Objectの不変条件チェックまたは複数値関係性チェックが必要な場合、Result型を返す。

**例1: 単一Value Object内の不変条件チェック**

```typescript
/**
 * ステータスを変更して新しいTodoインスタンスを返す
 *
 * TodoStatus内のcanTransitionTo()で不変条件チェック
 */
changeStatus(newStatus: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
  // Entity内でValue Objectの不変条件チェックを実行
  const canTransitionResult = this.status.canTransitionTo(newStatus);
  if (!canTransitionResult.success) {
    return canTransitionResult;
  }

  return {
    success: true,
    data: new Todo({
      ...this,
      status: newStatus,
      updatedAt,
    }),
  };
}
```

**例2: 複数値関係性チェック**

```typescript
/**
 * TODOを完了としてマークする
 *
 * 複数値関係性チェック: 完了TODOは期限必須
 */
markAsCompleted(completedAt: string, updatedAt: string): Result<Todo, DomainError> {
  // Entity全体を見た不変条件（複数の値の関係性）
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

**UseCase層での使用**:

```typescript
// メソッドチェーン不可だが、ビジネス意図が明確
const completedResult = existing.markAsCompleted(now, now);
if (!completedResult.success) {
  return completedResult;
}
const completed = completedResult.data;
```

**設計判断**: 複数値関係性バリデーションは必要最小限にとどめ、可能な限りValue Objectに委譲してEntity層を薄く保つ。

### パターン3: reconstruct静的メソッド（必ずResult型）

`reconstruct()`は複数値関係性チェックの有無に関わらず、一貫してResult型を返す。

```typescript
/**
 * 再構成用の静的メソッド
 *
 * リポジトリからの復元、PATCH更新時に使用
 */
static reconstruct(props: {
  id: string;
  title: string;
  status: TodoStatus;              // Value Object
  dueDate: string | undefined;     // 必須（undefinedを明示的に渡す）
  completedAt: string | undefined; // 必須（undefinedを明示的に渡す）
  createdAt: string;
  updatedAt: string;
}): Result<Todo, DomainError> {
  // 複数の値の関係性チェック（ある場合）
  if (props.status.isCompleted() && !props.dueDate) {
    return {
      success: false,
      error: new DomainError('完了TODOには期限が必要です'),
    };
  }

  // チェックがない場合でも一貫してResult型を返す
  return {
    success: true,
    data: new Todo(props),
  };
}
```

**reconstructの引数設計**:

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

## UseCase層での使い分け

**参照**: `guardrails/policy/server/use-case/15-domain-model-interaction.md` - 詳細な使い分け基準

| パターン | 返り値 | 使用ケース | メソッドチェーン |
|---------|-------|-----------|----------------|
| **パターン1** | `Entity` | バリデーション不要なフィールド更新 | ✅ 可能 |
| **パターン2** | `Result<Entity, DomainError>` | ドメインルール/不変条件チェックが必要な更新 | ❌ 不可 |
| **パターン3** | `Result<Entity, DomainError>` | PATCH更新、リポジトリ復元（reconstruct） | ❌ 不可 |

**重要**:
- **パターン1**: バリデーション不要な単純更新のみ（メソッドチェーン可能）
- **パターン2**: Value Objectの不変条件チェック（`canTransitionTo()`）はEntity内で実行する（ドメイン貧血症を回避）
- **パターン2**: 複数値関係性バリデーションも同じパターン（Result型を返す）
- **パターン3**: reconstructは必ずResult型（一貫性のため）

## Value Objectとの関係

Entity設計の鍵は、適切にValue Objectを活用すること。

### Value Object化すべきフィールド

**参照**: `11-domain-validation-strategy.md` - Value Object化の判断基準

| Tier | 基準 | Value Object化 | 例 |
|------|------|--------------|-----|
| **Tier 1: 必須** | 不変条件を持つフィールド | ✅ 必須 | `TodoStatus`（状態遷移ルール）、`OrderStatus`（注文状態遷移） |
| **Tier 2: 推奨** | ドメインルールを持つフィールド | ✅ 推奨 | `Email`（会社ドメインのみ許可）、`Age`（18歳以上）、`Money`（通貨計算） |
| **Tier 3: 不要** | 型レベル制約のみ、またはバリデーション不要 | ❌ プリミティブでOK | `title: string`（minLength/maxLength）、`id: string`、`createdAt: string` |

**重要な原則**:
- **必ず成功する（バリデーション不要な）Value Objectは作らない**
- Value Objectは**ドメインルールまたは不変条件を内包する**ために使用する
- 単なる型エイリアスや命名のためにValue Objectを作らない

### Entity内でのValue Object活用例

```typescript
export class Todo {
  // Tier 1: Required
  readonly id: string;              // プリミティブ（バリデーション不要）
  readonly title: string;           // プリミティブ（OpenAPI: minLength/maxLength）
  readonly status: TodoStatus;      // Value Object（不変条件あり）

  // Tier 2: Special Case
  readonly dueDate: string | undefined;      // プリミティブ（undefinedは"期限なし"）
  readonly completedAt: string | undefined;  // プリミティブ（undefinedは"未完了"）

  // Tier 3: Optional
  readonly description?: string;    // プリミティブ（純粋に任意）

  // 変更不可
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

## チェックリスト

### Entity設計

```
[ ] 基本方針: Entity層は薄く保つ（メソッドチェーン可能な状態を維持）
[ ] シンプルなデータ変換メソッドはEntityを返す（メソッドチェーン可能）
[ ] 複数値関係性バリデーションが必要な場合のみResult型を返す
[ ] reconstructメソッドは必ずResult型を返す（一貫性のため）
[ ] 複数値関係性バリデーションは必要最小限にとどめる
[ ] 単一Value Objectの不変条件チェックはValue Object層に委譲
```

### Value Object活用

```
[ ] 不変条件を持つフィールドはValue Object化（Tier 1: 必須）
[ ] ドメインルールを含むフィールドはValue Object化（Tier 2: 推奨）
[ ] 必ず成功する（バリデーション不要な）Value Objectは作らない
[ ] 型レベル制約のみのフィールドはプリミティブでOK（Tier 3）
```

### バリデーション責務

```
[ ] 型レベルバリデーションはHandler層（OpenAPI/Zod）
[ ] 単一Value Objectの不変条件はValue Object層
[ ] 複数値関係性チェックはEntity層（必要最小限）
[ ] ビジネスルールはUseCase層
[ ] Entity層でthrowは使わない
```
