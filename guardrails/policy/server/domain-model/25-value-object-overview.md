# Value Object設計：概要

## 概要

識別子（ID）を持たず、**値そのもので等価性が判断される**ドメインオブジェクト。

**関連ドキュメント**:
- **実装詳細**: `26-value-object-implementation.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`
- **テスト戦略**: `50-test-overview.md`

## Value Objectとは

**作成基準**:
1. **不変条件（状態遷移ルール等）を持つフィールド**（Tier 1: 必須）
2. **ドメインルールを持つフィールド**（Tier 2: 推奨）

**重要**: 必ず成功する（バリデーション不要な）Value Objectは作らない

**必須要件**:
- **`ValueObject<T>`型を実装**する（`server/src/domain/model/value-object.ts`）
- `equals(other: T): boolean`メソッドを実装する
- `toString(): string`メソッドを実装する

**Value Object徹底活用のメリット**:
- ✅ ドメインロジックがValue Objectに集約（リッチドメインモデル）
- ✅ Entity メソッドがシンプル（メソッドチェーン可能）
- ✅ Result型パターンとの整合性
- ✅ 再利用性が高い
- ✅ テストが容易
- ✅ 型安全性（インターフェースによる契約）

## エンティティとの違い

| 観点           | エンティティ                     | Value Object           |
| -------------- | -------------------------------- | ---------------------- |
| 識別子         | あり（ID）                       | なし                   |
| 等価性         | IDで判断                         | 全プロパティで判断     |
| 可変性         | 更新メソッドで新インスタンス生成 | 完全に不変             |
| ライフサイクル | 独立して存在                     | エンティティに埋め込み |

## Value Object化の判断基準

**参照**: `11-domain-validation-strategy.md` - 詳細な判断基準

| Tier | 基準 | Value Object化 | 例 |
|------|------|--------------|-----|
| **Tier 1: 必須** | 単一Value Object内で完結する不変条件を持つ | ✅ 必須 | `TodoStatus`（完了済みは変更不可）、`OrderStatus`（配送済みは変更不可） |
| **Tier 2: 推奨** | ドメインルールを持つ | ✅ 推奨 | `Email`（会社ドメインのみ許可）、`Age`（18歳以上）、`Money`（通貨計算） |
| **Tier 3: 不要** | 型レベル制約のみ（OpenAPIで表現可能） | ❌ プリミティブでOK | `title: string`（minLength/maxLength）、`priority: "LOW" \| "MEDIUM" \| "HIGH"`（OpenAPI enum、状態遷移ルールなし）、`id: string`、`createdAt: string` |

**重要**: Tier 1の「単一Value Object内で完結する」とは、他のフィールドを参照せず、Value Object自身だけで判断できる不変条件を指す。複数フィールドの関係性はEntity層の責務。

### 判断フローチャート

```
フィールドを検討
    ↓
単一Value Object内で完結する不変条件がある？
（他のフィールドを参照せずに判断できる）
    ↓ YES → Tier 1: Value Object化（必須）
    ↓ NO
OpenAPIで表現不可能なドメインルールがある？
    ↓ YES → Tier 2: Value Object化（推奨）
    ↓ NO
    → Tier 3: プリミティブでOK（OpenAPIでバリデーション）
```

**補足**: 複数フィールドの関係性チェック（例: 完了TODOは期限必須）はEntity層の責務。

**重要な原則**:
- **必ず成功する（バリデーション不要な）Value Objectは作らない**
- Value Objectは**ドメインルールまたは不変条件を内包する**ために使用する
- 単なる型エイリアスや命名のためにValue Objectを作らない

## Value Object vs Type Alias

### Value Objectを使う場合

1. **不変条件を持つフィールド**（Tier 1: 必須）
   - 状態遷移ルール
   - ビジネス不変条件
   - 例: `TodoStatus`（完了済みは変更不可）、`ProjectStatus`

2. **OpenAPIで表現不可能なドメインルール**（Tier 2: 推奨）
   - OpenAPIで表現できない複雑なビジネスルール
   - ドメイン固有の複雑な制約
   - 例: `Email`（会社ドメインのみ許可）、`Money`（通貨計算）、`DateRange`（開始日≤終了日）

3. **振る舞いが必要**
   - 比較、変換、計算等のメソッド
   - 例: `Money`、`DateRange`

### Type Aliasを使う場合（Tier 3）

- **OpenAPIで表現可能な制約**: minLength/maxLength, pattern, enum等
- **不変条件なし**: 状態遷移ルールなし
- **振る舞い不要**: ただの型チェック

```typescript
// ✅ Tier 3: OpenAPIで表現可能 → プリミティブでOK
export class Todo {
  readonly id: string;              // プリミティブ
  readonly title: string;           // OpenAPI: minLength/maxLength
  readonly color?: string;          // OpenAPI: pattern: "^#[0-9A-Fa-f]{6}$"
  readonly description?: string;    // プリミティブ
  readonly createdAt: string;       // プリミティブ
  readonly status: TodoStatus;      // Value Object（不変条件あり）
}
```

**重要**: ステータスなど、一見シンプルなenumでも**不変条件（状態遷移ルール）がある場合はValue Object化必須**。逆に、長さ制限や形式チェックのみの場合はOpenAPIで表現し、Value Object化は不要。

## Value Objectメソッド一覧

Value Objectは以下のメソッドを実装する。

| メソッド/要件 | 必須/オプション | 説明 | 例 |
|---------|--------------|------|-----|
| **ValueObject<T>型実装** | 必須 | 基底型を実装 | `implements ValueObject<TodoStatus>` |
| **プライベートコンストラクタ** | 必須 | 外部からの直接生成を防ぐ | `private constructor(value: string)` |
| **from()** | 必須 | Value Objectを生成、Result型を返す（**常にProps型エイリアス**） | `export type TodoStatusProps = { status: string };`<br>`static from(props: TodoStatusProps): Result<TodoStatus, DomainError>`<br>`export type FullNameProps = { firstName: string; lastName: string };`<br>`static from(props: FullNameProps): Result<FullName, DomainError>` |
| **equals()** | 必須 | 値の等価性を判断 | `equals(other: Email): boolean` |
| **toString()** | 必須 | デバッグ・ログ用の文字列表現を返す（`from()`との対称性は不要） | `toString(): string` |
| **getter** | 複数パラメータの場合 | 個別の値にアクセス | `get firstName(): string`, `get lastName(): string` |
| **不変条件チェックメソッド** | 不変条件がある場合 | 不変条件を検証 | `canTransitionTo(newStatus: TodoStatus): Result<void, DomainError>` |
| **default()** | オプション | ビジネス的に意味のあるデフォルト値を返す | `static default(): Email` |
| **ヘルパーメソッド** | オプション | ビジネスロジックを補助 | `isCompleted(): boolean`, `isTodo(): boolean` |
| **静的ファクトリメソッド** | オプション | 頻繁に使う値を簡単に生成 | `static todo(): TodoStatus`, `static completed(): TodoStatus` |

**参照**: `26-value-object-implementation.md` - 詳細な実装例

## Value Object設計原則

### 1. ValueObject<T>型の実装

すべてのValue Objectは`ValueObject<T>`型を実装し、`@staticImplements`デコレーターで`from()`の実装を強制する。

### 2. プライベートコンストラクタ

外部からの直接生成を防ぎ、バリデーション付きファクトリメソッド経由でのみ生成可能にする。

### 3. Result型を返すファクトリメソッド `from()`

バリデーション結果を明示的に返す。例外は使わない。

**重要**: `from()`は**常にProps型エイリアスパターン**を使用する（Entityのコンストラクタと統一）。

**単一パラメータの例**:
```typescript
export type TodoStatusProps = {
  status: string;
};

static from(props: TodoStatusProps): Result<TodoStatus, DomainError>
```

**複数パラメータの例**:
```typescript
export type FullNameProps = {
  firstName: string;
  lastName: string;
};

static from(props: FullNameProps): Result<FullName, DomainError>
```

### 4. equals()メソッド

値の等価性を判断するメソッドを実装する。

### 5. toString()メソッド

デバッグ・ログ出力用の文字列表現を返す。すべてのValue Objectで必須。

**重要**: `toString()`は`from()`との対称性を期待しない。目的が異なる（入力 vs 出力）。

**推奨フォーマット**:
- 単一パラメータ: 値そのまま（例: `"TODO"`）
- 複数パラメータ: `ClassName(field1=value1, field2=value2)` 形式（例: `"FullName(firstName=太郎, lastName=山田)"`）

**値の取り出し**: `toString()`ではなく、getterまたは個別メソッドを使用する。

### 6. 不変条件チェックメソッド（重要）

Value Objectが不変条件を持つ場合、検証メソッドを実装する。

**参照**: `26-value-object-implementation.md` - 各原則の具体的な実装例

## バリデーション責務の明確化

**参照**: `11-domain-validation-strategy.md` - 詳細なバリデーション戦略

### Handler層: 基本的な型チェック（OpenAPI自動生成Zod）

```yaml
# OpenAPI: 基本的な形式チェック
email:
  type: string
  format: email # RFC 5322準拠の基本チェック
```

### Value Object層: ドメイン固有のルール

```typescript
// ✅ Value Object: ドメイン固有のバリデーション
Email.from({ email: "user@gmail.com" }); // エラー: 会社ドメインのみ許可
Email.from({ email: "user@company.com" }); // OK
```

### UseCase層: ビジネスルール（必須チェック・権限等）

```typescript
// ✅ UseCase: ビジネスバリデーション
const emailResult = Email.from({ email: input.email });
if (!emailResult.success) {
  return emailResult;
}
```

**MECE原則の実現**:

1. OpenAPI: 基本形式（RFC 5322準拠）
2. Value Object: ドメイン固有ルール（会社ドメインのみ等）
3. UseCase: ビジネスルール（権限等）

→ 各層で異なる責務を担当し、重複なし

## Value Objectの配置

エンティティと同じディレクトリに配置する。

```
domain/model/user/
├── user.ts                # エンティティ
├── user.small.test.ts     # Entityテスト
├── user.dummy.ts          # Entityダミー
├── email.ts               # Value Object
├── email.small.test.ts    # Value Objectテスト
├── email.dummy.ts         # Value Objectダミー（Entity Dummyから使用）
└── user-repository.ts

domain/model/todo/
├── todo.ts                   # エンティティ
├── todo.small.test.ts        # Entityテスト
├── todo.dummy.ts             # Entityダミー
├── todo-status.ts            # Value Object
├── todo-status.small.test.ts # Value Objectテスト
├── todo-status.dummy.ts      # Value Objectダミー（Entity Dummyから使用）
└── todo-repository.ts
```

**注**: Value ObjectテストではDummyファクトリ不要（静的ファクトリメソッドで生成）。ただし、Entity Dummyファクトリから使用するため`{value-object}.dummy.ts`は作成する。

## テスト戦略

Value Objectは必ずユニットテスト（`.small.test.ts`）を作成する。

**参照**: `50-test-overview.md` - 詳細なテスト戦略とテストパターン

**必須テスト**:
```
[ ] from() - 正常系（代表値、境界値）
[ ] from() - 異常系（不正形式、空文字列、境界値外）
[ ] equals() - 同じ値、異なる値
[ ] toString() - 文字列表現の検証
[ ] Result型の正しいチェック（success分岐）
[ ] エラー型とメッセージの検証
```

**条件付きテスト**:
```
[ ] canTransitionTo() - 許可される遷移（全パターン） ※不変条件がある場合
[ ] canTransitionTo() - 禁止される遷移（全パターン） ※不変条件がある場合
[ ] default() - デフォルト値の検証 ※default()メソッドがある場合
[ ] 静的ファクトリメソッド（todo(), completed()等） ※提供される場合
[ ] ヘルパーメソッド - すべての分岐 ※ヘルパーメソッドがある場合
```

## Do / Don't

### ✅ Good

```typescript
// Props型エイリアス定義
export type TodoStatusProps = {
  status: string;
};

// ValueObject<T>型を実装（Props型エイリアス使用）
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly value: string) {}

  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    // バリデーション
  }

  equals(other: TodoStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value; // デバッグ用
  }
}

// 不変条件をValue Object内に配置
canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
  if (this.isCompleted() && !newStatus.isCompleted()) {
    return Result.err(
      new DomainError('完了済みTODOのステータスは変更できません')
    );
  }
  return Result.ok(undefined);
}
```

### ❌ Bad

```typescript
// ValueObject<T>型を実装していない
export class TodoStatus {  // ❌ implements ValueObject<TodoStatus>がない
  constructor(public value: string) {}  // ❌ パブリックコンストラクタ
}

// Type Aliasで不変条件を表現できない
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
// ❌ 状態遷移ルールをどこに書く？
// ❌ ValueObject<T>インターフェースを実装できない

// Entity内で不変条件チェック
class Todo {
  changeStatus(status: TodoStatus): Result<Todo, DomainError> {
    // ❌ Value Objectに委譲すべき
    if (this.status === 'COMPLETED' && status !== 'COMPLETED') {
      return Result.err(new DomainError('...'));
    }
  }
}

// throwを使用
export type TodoStatusProps = { status: string };

static from(props: TodoStatusProps): TodoStatus {
  if (!validValues.includes(props.status)) {
    throw new Error('Invalid status');  // ❌ Result型を返すべき
  }
  return new TodoStatus(props.status);
}
```

## チェックリスト

### Value Object設計

```
[ ] 不変条件を持つフィールドはValue Object化（Tier 1: 必須）
[ ] ドメインルールを含むフィールドはValue Object化（Tier 2: 推奨）
[ ] 必ず成功する（バリデーション不要な）Value Objectは作らない
[ ] 型レベル制約のみのフィールドはプリミティブでOK（Tier 3）
```

### 実装要件

```
[ ] ValueObject<T>型を実装
[ ] プライベートコンストラクタ
[ ] Props型エイリアス定義（`export type <ValueObject>Props = { ... }`）
[ ] Result型を返すfrom()（Props型エイリアス使用、具体的なプロパティ名）
[ ] equals()メソッド実装
[ ] toString()メソッド実装（デバッグ用、from()との対称性不要）
[ ] getter実装（複数パラメータの場合）
[ ] 不変条件チェックメソッド（不変条件がある場合）
[ ] スモールテスト（.small.test.ts）作成
```

### バリデーション階層（MECE原則）

```
[ ] OpenAPIで基本形式チェック（format, pattern等）
[ ] Value Objectでドメイン固有ルールチェック（DomainErrorを返す）
[ ] UseCase層でビジネスルールチェック
[ ] 同じバリデーションを複数箇所で重複実装しない
```
