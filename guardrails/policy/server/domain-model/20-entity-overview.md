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
- **Dummyファクトリ**: `52-entity-test-patterns.md` - テストデータ生成パターン

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
- **Result型を返す**: 複数値関係性バリデーションが必要な場合のみ（Result.then()でメソッドチェーン可能）

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

  return Result.ok(new Todo({
    ...this,
    status: newStatus,
    updatedAt,
  }));
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
    return Result.err(new DomainError('期限のないTODOは完了できません'));
  }

  return Result.ok(new Todo({
    ...this,
    status: TodoStatus.completed(),  // 複数フィールド連動
    completedAt,
    updatedAt,
  }));
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

**汎用メソッドの禁止**: `update()` 等の汎用的な更新メソッドは実装しない。個別のビジネスメソッド（`changeTitle()`, `changeStatus()`, `markAsCompleted()` 等）のみを実装し、メソッドチェーンで組み合わせる。

**理由**:

- PATCHとの相性が良い（送られたフィールドのみ更新）
- シンプルで理解しやすい（意図が明確）
- analyzability原則に準拠（各メソッドの引数は必須）
- YAGNI原則（使われないパラメータを持つ汎用メソッドを避ける）

## UseCase層での使い分け

**参照**: `guardrails/policy/server/use-case/15-domain-model-interaction.md` - 詳細な使い分け基準

| パターン      | 返り値                        | 使用ケース                                  | メソッドチェーン           |
| ------------- | ----------------------------- | ------------------------------------------- | -------------------------- |
| **パターン1** | `Entity`                      | バリデーション不要なフィールド更新          | ✅ 可能                    |
| **パターン2** | `Result<Entity, DomainError>` | ドメインルール/不変条件チェックが必要な更新 | ✅ 可能（`Result.then()`） |

**重要**:

- **すべてのパターンでメソッドチェーン可能** - `Result.then()`が`Entity`を自動で`Result.ok()`に包むため
- **パターン1**: バリデーション不要な単純更新（Entity層を薄く保つ、`Result.ok()`のボイラープレート不要）
- **パターン2**: Value Objectの不変条件チェック（`canTransitionTo()`）はEntity内で実行する（ドメイン貧血症を回避）
- **パターン2**: 複数値関係性バリデーションも同じパターン（Result型を返す）

**メソッドチェーンの例**:

```typescript
// 既存Entityから始めるチェーン
const result = Result.ok(existingTodo) // EntityをResult.ok()で包む
  .then((t) => t.updateDescription("新しい", now)) // Todoを返す → 自動でResult.ok()に包む
  .then((t) => t.changeStatus(newStatus, now)) // Result<Todo>を返す → そのまま
  .then((t) => repository.save(t)); // 完全にフラット
```

## Value Objectとの関係

Entity設計の鍵は、適切にValue Objectを活用すること。

### Value Object化すべきフィールド

**参照**: `11-domain-validation-strategy.md` - Value Object化の判断基準

| Tier             | 基準                                       | Value Object化      | 例                                                                        |
| ---------------- | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------- |
| **Tier 1: 必須** | 不変条件を持つフィールド                   | ✅ 必須             | `TodoStatus`（状態遷移ルール）、`OrderStatus`（注文状態遷移）             |
| **Tier 2: 推奨** | ドメインルールを持つフィールド             | ✅ 推奨             | `Email`（会社ドメインのみ許可）、`Age`（18歳以上）、`Money`（通貨計算）   |
| **Tier 3: 不要** | 型レベル制約のみ、またはバリデーション不要 | ❌ プリミティブでOK | `title: string`（minLength/maxLength）、`id: string`、`createdAt: string` |

**重要な原則**:

- **必ず成功する（バリデーション不要な）Value Objectは作らない**
- Value Objectは**ドメインルールまたは不変条件を内包する**ために使用する
- 単なる型エイリアスや命名のためにValue Objectを作らない

### Entity内でのValue Object活用例

```typescript
export class Todo {
  // Tier 1: Required
  readonly id: string; // プリミティブ（バリデーション不要）
  readonly title: string; // プリミティブ（OpenAPI: minLength/maxLength）
  readonly status: TodoStatus; // Value Object（不変条件あり）

  // Tier 2: Special Case
  readonly dueDate: string | undefined; // プリミティブ（undefinedは"期限なし"）
  readonly completedAt: string | undefined; // プリミティブ（undefinedは"未完了"）

  // Tier 3: Optional
  readonly description: string | undefined; // プリミティブ（純粋に任意）

  // 変更不可
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

## Dummyファクトリ（テスト用ファクトリ）

すべてのEntityには対応する**Dummyファクトリ**を実装する。Dummyファクトリはテストコードでのエンティティ生成を簡略化し、モデル変更時のテストコード修正負荷を下げる。

**参照**: `52-entity-test-patterns.md` - Dummyファクトリの詳細実装パターン

### 核心原則

1. **全テストでDummyファクトリを使用** - テストコードで直接`new Entity()`を使わない
2. **ランダム値を使用** - faker等を使い、実世界的なテストデータを生成
3. **オプショナルフィールドもランダム化** - 50%の確率で値を設定/undefined
4. **部分オーバーライド可能** - テストごとに必要なフィールドのみ指定

### 基本パターン

**重要**: Value Objectのランダム生成は**Value Object Dummyファクトリ**（`{valueObject}DummyFrom()`）を使用する。

```typescript
// {entity}.dummy.ts
import { todoStatusDummyFrom } from "./todo-status.dummy"; // ✅ Value Object Dummy
import {
  getDummyId,
  getDummyShortText,
  getDummyRecentDate,
  getDummyDueDate,
} from "@/util/testing-util/dummy-data";

export type TodoDummyProps = Partial<{
  id: string;
  title: string;
  status: TodoStatus;
  dueDate: string | undefined; // オプショナル
  createdAt: string;
  updatedAt: string;
}>;

export const todoDummyFrom = (props?: TodoDummyProps): Todo => {
  const now = getDummyRecentDate();

  return new Todo({
    id: props?.id ?? getDummyId(),
    title: props?.title ?? getDummyShortText(),
    status: props?.status ?? todoStatusDummyFrom(), // ✅ Value Object Dummy
    dueDate: props?.dueDate ?? getDummyDueDate(), // 50%でundefined
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
```

**参照**: `51-value-object-test-patterns.md` - Value Object Dummyファクトリの実装パターン

### テストでの使用

```typescript
// ✅ Good: Dummyファクトリを使用
describe("UpdateTodoUseCase", () => {
  it("TODOのタイトルを更新できる", async () => {
    const todo = todoDummyFrom({ title: "古いタイトル" });
    // テスト実装...
  });
});

// ❌ Bad: 直接new Todo()を使用
const todo = new Todo({
  id: "todo-1",
  title: "古いタイトル",
  status: TodoStatus.todo(),
  // ... 全フィールドを手動で指定（モデル変更時に全修正が必要）
});
```

### 利点

1. **保守性向上**: Entityにフィールド追加時、Dummyファクトリのみ修正すればよい
2. **テストの可読性向上**: テストの意図（どのフィールドが重要か）が明確になる
3. **ランダム値でエッジケース発見**: 様々なデータパターンで自動的にテストされる
4. **統一されたテストデータ**: プロジェクト全体で一貫したテストデータ生成

## チェックリスト

### Entity設計

```
[ ] 基本方針: Entity層は薄く保つ（メソッドチェーン可能な状態を維持）
[ ] シンプルなデータ変換メソッドはEntityを返す（メソッドチェーン可能）
[ ] 複数値関係性バリデーションが必要な場合のみResult型を返す
[ ] すべてのメソッドはResult.then()でメソッドチェーン可能
[ ] 複数値関係性バリデーションは必要最小限にとどめる
[ ] 単一Value Objectの不変条件チェックはValue Object層に委譲
```

### Dummyファクトリ

```
[ ] すべてのEntityにDummyファクトリを実装（{entity}.dummy.ts）
[ ] Partial<>型でProps定義（全フィールドオプション）
[ ] 基本データは共通ヘルパーを使用（getDummyId, getDummyShortText等）
[ ] fakerを使ってランダム値を生成
[ ] オプショナルフィールドは確率的にundefined（例: 50%）
[ ] Value ObjectはDummyファクトリを使用
[ ] Value Object Dummyファクトリをインポート（{valueObject}DummyFrom()）
[ ] テストコードでは常にDummyファクトリを使用（new Entity()を直接使わない）
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
