# ドメインモデル - 全体概要

## 目的

ビジネスロジックとドメインルールを表現する純粋なTypeScriptコードを設計・実装するためのガイドライン。

**関連ドキュメント**:
- **Entity設計**: `20-entity-overview.md`
- **Entityフィールド分類**: `21-entity-field-classification.md`
- **Entity実装**: `22-entity-implementation.md`
- **Value Object設計**: `25-value-object-overview.md`
- **Value Object実装**: `26-value-object-implementation.md`
- **バリデーション戦略**: `11-domain-validation-strategy.md`
- **リポジトリ**: `30-repository-overview.md`
- **集約パターン**: `40-aggregate-overview.md`
- **テスト戦略**: `50-test-overview.md`

## ドメインモデルの構成要素

### Entity（エンティティ）

識別子（ID）を持つドメインオブジェクト。

**特徴**:
- 識別子（ID）で等価性を判断
- ライフサイクルを持つ
- Value Objectを保持
- 不変性（readonlyプロパティ、更新メソッドは新インスタンス返却）

**詳細**: `20-entity-overview.md`

### Value Object（値オブジェクト）

識別子を持たず、値そのもので等価性が判断されるドメインオブジェクト。

**特徴**:
- 識別子なし
- 完全に不変
- ドメインルールまたは不変条件を内包
- equals()、toString()メソッド必須

**詳細**: `25-value-object-overview.md`

## 設計原則

### 1. Always Valid Domain Model

**参照**: `11-domain-validation-strategy.md`

ドメインオブジェクト（Entity、Value Object）は**常に正しい状態（Valid State）**でなければならない。

**実現方法**:
```
Handler層（型レベルバリデーション）
    ↓ validated
Value Object層（ドメインルール + 単一VO内で完結する不変条件）
    ↓ validated
UseCase層（外部依存する不変条件 + Value Object生成）
    ↓ validated
Entity層（Value Object不変条件チェック + 複数値関係性チェック）
    ↓
Entityインスタンス（常にvalid、Value Object内包）
```

**結果**:
- Value Objectが不変条件を内包（自己検証）
- Entity内メソッドがValue Objectの不変条件チェックを実行（ドメイン貧血症を回避）
- バリデーション不要なメソッドはチェーン可能（Entity返す）
- 不変条件チェックが必要なメソッドはResult型を返す
- throwは使わない（全層でResult型パターンを徹底）

### 2. Entityフィールドの3-Tier分類

**参照**: `21-entity-field-classification.md`

Entityのフィールドは必須性とundefinedの意味で分類する。

| Tier | 分類 | フィールド定義 | コンストラクタ | 例 |
|------|------|--------------|--------------|-----|
| **Tier 1** | Required（常に必要） | `?`なし | 通常の必須引数 | `id`, `title`, `status`, `createdAt` |
| **Tier 2** | Special Case（undefinedに意味がある） | `\| undefined`明示（`?`なし） | `\| undefined`で必須化 | `dueDate`（期限なし）、`completedAt`（未完了） |
| **Tier 3** | Optional（純粋に任意） | `?`付き | `\| undefined`で必須化 | `description`, `memo` |

**重要**:
- **Tier 2**: フィールド定義は `| undefined` 明示（undefinedがビジネス的意味を持つことを明確化）
- **Tier 3**: フィールド定義は `?` オプショナル（undefinedは単に未設定）
- **両方とも**: コンストラクタは `| undefined` で必須化（省略不可、analyzability-principles.md 原則1）
- `null`は使用しない、`undefined`のみ

**マージロジックの統一**:

```typescript
// Tier 2: Special Case - undefinedに意味がある
const dueDate: string | undefined;      // フィールド定義
const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;

// Tier 3: Optional - 純粋に任意
readonly description?: string;          // フィールド定義
const description = input.description !== undefined ? input.description : existing.description;

// ❌ 間違い: ?? 演算子を使うとundefinedが上書きされない
const dueDate = input.dueDate ?? existing.dueDate;
// inputで意図的にundefinedを送信（"期限なし"にする）しても、existing.dueDateで上書きされる
```

**理由**:
- **マージロジックは統一**: Tier 2もTier 3も `!== undefined` を使用（安全性・シンプルさ）
- **フィールド定義で区別**: Tier 2は `| undefined` 明示、Tier 3は `?` でundefinedの意味を明確化

### 3. Value Object化の判断基準

**参照**: `11-domain-validation-strategy.md`, `25-value-object-overview.md`

フィールドをValue Object化するかプリミティブのままにするかの判断基準。

| 判断基準 | Value Object化 | 理由 | 例 |
|---------|--------------|------|-----|
| **単一VO内で完結する不変条件を持つ** | ✅ 必須 | 他のフィールドを参照せず、VO自身だけで判断できる不変条件がある | `TodoStatus`（完了済みは変更不可）、`OrderStatus` |
| **ドメインルールを持つ** | ✅ 推奨 | OpenAPIで表現不可能なドメイン固有ルールがある | `Email`（会社ドメインのみ）、`Age`（18歳以上） |
| **型レベル制約のみ** | ❌ 不要（プリミティブでOK） | OpenAPIで表現可能な制約のみ | `title`（minLength/maxLength）、`priority: "LOW" \| "MEDIUM" \| "HIGH"`（OpenAPI enum、状態遷移ルールなし）、`id`、`createdAt` |

**重要な原則**:
- **必ず成功する（バリデーション不要な）Value Objectは作らない**
- Value Objectは**ドメインルールまたは不変条件を内包する**ために使用
- 単なる型エイリアスや命名のためにValue Objectを作らない
- 複数フィールドの関係性チェック（例: 完了TODOは期限必須）はEntity層の責務

**判断フローチャート**:
```
フィールドを検討
    ↓
単一Value Object内で完結する不変条件がある？
（他のフィールドを参照せずに判断できる）
    ↓ YES → Value Object化（必須）
    ↓ NO
OpenAPIで表現不可能なドメインルールがある？
    ↓ YES → Value Object化（推奨）
    ↓ NO
    → プリミティブでOK（OpenAPIでバリデーション）
```

### 4. 外部依存ゼロ

**許可**:
- TypeScript標準ライブラリ
- 同じドメイン層内のEntity/Value Object
- util層のResult型

**禁止**:
- AWS SDK
- 外部ライブラリ（Hono, Zod等）
- インフラ・ユースケース・ハンドラ層のコード

### 5. 不変性（Immutability）

すべてのプロパティは`readonly`。更新メソッドは新しいインスタンスを返す。

```typescript
// ✅ Good: バリデーション不要な更新
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: TodoStatus;
  readonly createdAt: string;
  readonly updatedAt: string;

  updateDescription(description: string | undefined, updatedAt: string): Todo {
    return new Todo({ ...this, description, updatedAt });
  }

  // ✅ Good: 不変条件チェックあり → Result型を返す
  changeStatus(newStatus: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
    // Entity内でValue Objectの不変条件チェックを実行
    const canTransitionResult = this.status.canTransitionTo(newStatus);
    if (!canTransitionResult.success) {
      return canTransitionResult;
    }

    return Result.ok(new Todo({ ...this, status: newStatus, updatedAt }));
  }
}
```

### 6. Result型による明示的エラーハンドリング

例外を使わず、`Result<T, E>`で成功/失敗を明示的に返す。

```typescript
// ✅ Good（常にpropsパターン）
static from(props: { value: string }): Result<TodoStatus, DomainError> {
  if (!validValues.includes(props.value)) {
    return Result.err(new DomainError('無効なステータス'));
  }
  return Result.ok(new TodoStatus(props.value));
}

// ❌ Bad
static from(props: { value: string }): TodoStatus {
  if (!validValues.includes(props.value)) {
    throw new Error('無効なステータス');  // throwは使わない
  }
  return new TodoStatus(props.value);
}
```

### 7. Propsパターン

コンストラクタとメソッドの引数はオブジェクト形式（将来の拡張性のため）。

```typescript
// ✅ Good
constructor(props: {
  id: string;
  title: string;
  status: TodoStatus;
  dueDate: string | undefined;
  createdAt: string;
  updatedAt: string;
}) {
  // ...
}

// ❌ Bad
constructor(id: string, title: string, status: TodoStatus, ...) {
  // 引数が多い、拡張しづらい
}
```

### 8. 技術的詳細の漏洩防止

ドメインモデルにAWS、S3、DynamoDB、Cognito等の技術要素を含めない。

```typescript
// ❌ Bad
export class Todo {
  readonly s3Key: string;          // 技術的詳細
  readonly cognitoUserId: string;  // 技術的詳細
}

// ✅ Good
export class Todo {
  readonly id: string;      // ドメイン概念
  readonly userSub: string; // ドメイン概念（技術的詳細を抽象化）
}
```

## Entity設計の3つのパターン

**参照**: `20-entity-overview.md`

| パターン | メソッド返り値 | 使用ケース | メソッドチェーン |
|---------|--------------|-----------|----------------|
| **パターン1** | `Entity` | バリデーション不要なフィールド更新 | ✅ 可能 |
| **パターン2** | `Result<Entity, DomainError>` | ドメインルール/不変条件チェックが必要な更新 | ✅ 可能（`Result.then()`） |

**設計原則**:
- **パターン1**: バリデーション不要な単純更新のみ（メソッドチェーン可能）
- **パターン2**: Value Objectの不変条件チェック（`canTransitionTo()`）はEntity内で実行（ドメイン貧血症を回避）

## バリデーション階層（MECE原則）

**参照**: `11-domain-validation-strategy.md`

| 階層 | 実装場所 | 判断基準 | エラー型 | HTTPステータス |
|------|---------|---------|---------|---------------|
| **第1階層** | Handler層 | OpenAPIで表現可能な制約（minLength、maxLength、pattern、enum） | `ValidationError` | 400 Bad Request |
| **第2階層** | Value Object | ドメインルール + 自己完結的な不変条件 | `DomainError` | 422 Unprocessable Entity |
| **第3階層** | UseCase層 | 外部依存する不変条件（DB参照、権限チェック） | 各種エラー | 403/404/409等 |

**重要**: 同じバリデーションを複数箇所で重複実装しない。

## ディレクトリ構成

```
domain/
├── model/
│   ├── value-object.ts                   # Value Object基底型
│   └── {entity}/                         # エンティティごとにディレクトリ
│       ├── {entity}.ts                   # Entity定義
│       ├── {entity}.small.test.ts        # Entityテスト
│       ├── {entity}.dummy.ts             # Entityダミー
│       ├── {value-object}.ts             # Value Object定義
│       ├── {value-object}.small.test.ts  # Value Objectテスト
│       ├── {value-object}.dummy.ts       # Value Objectダミー（Entity Dummyから使用）
│       ├── {entity}-repository.ts        # リポジトリインターフェース
│       └── {entity}-repository.dummy.ts  # リポジトリモック
│
└── support/                              # サポートインターフェース
    └── .../                             # logger, fetch-now, auth-client等
```

**注**: Value ObjectテストではDummyファクトリ不要（静的ファクトリメソッドで生成）。ただし、Entity Dummyファクトリから使用するため`{value-object}.dummy.ts`は作成する。

## レビュー対象ファイル

**対象**:
- `server/src/domain/model/**/*.ts` - Entity、Value Object、リポジトリインターフェース

**除外**:
- `*.small.test.ts` - テストファイル
- `*.dummy.ts` - ダミーファクトリ

## チェックリスト

### Entity設計

```
[ ] フィールドを3-Tier分類（Required/Special Case/Optional）
[ ] Tier 2（Special Case）: フィールド定義は `| undefined` 明示、constructorは `| undefined` で必須化
[ ] Tier 3（Optional）: フィールド定義は `?` 付き、constructorは `| undefined` で必須化
[ ] Value Object化すべきフィールドを判断（単一VO内完結の不変条件/ドメインルール）
[ ] すべてのプロパティをreadonlyで定義
[ ] シンプルなデータ変換メソッドはEntityを返す（メソッドチェーン可能）
[ ] 複数値関係性バリデーションが必要な場合のみResult型を返す
[ ] すべてのメソッドはResult.then()でメソッドチェーン可能
[ ] Value Object不変条件チェックはEntity内メソッドで実行（ドメイン貧血症を回避）
[ ] 外部依存ゼロ
[ ] 技術的詳細を含めない
```

### Value Object設計

```
[ ] 単一VO内完結の不変条件またはドメインルールを持つフィールドのみValue Object化
[ ] 必ず成功する（バリデーション不要な）Value Objectは作らない
[ ] ValueObject<T>型を実装
[ ] プライベートコンストラクタ
[ ] Result型を返すfrom()（常にpropsパターン：`props: { value: string }` または `props: { ... }`）
[ ] equals()、toString()メソッド実装（toString()はデバッグ用）
[ ] getter実装（複数パラメータの場合）
[ ] 不変条件チェックメソッド（不変条件がある場合、例: canTransitionTo()）
```

### バリデーション階層（MECE原則）

```
[ ] OpenAPIに型制約を定義（required, type, minLength, maxLength, pattern, enum等）
[ ] OpenAPIではドメインロジックを含むバリデーションを実施しない
[ ] Value Objectでドメインルール・不変条件チェック（DomainErrorを返す）
[ ] UseCase層で外部依存する不変条件をチェック
[ ] 同じバリデーションを複数箇所で重複実装しない
```

### テスト

```
[ ] Entity Small Test（.small.test.ts）作成
[ ] Value Object Small Test（.small.test.ts）作成
[ ] Entity Dummyファクトリ（{entity}.dummy.ts）作成
[ ] Value Object Dummyファクトリ（{value-object}.dummy.ts）作成
[ ] Repository Dummy（{entity}-repository.dummy.ts）作成
[ ] Repository DummyはEntity Dummyファクトリを内部で使用
[ ] 外部依存なし（純粋なユニットテスト）
```
