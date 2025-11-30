# ドメインモデル - 全体概要

## 核心原則

ドメインモデルは**常に正しい状態（Always Valid）**で、**外部依存ゼロ**の純粋なTypeScriptコードである。

## 関連ドキュメント

| トピック             | ファイル                              |
| -------------------- | ------------------------------------- |
| Entity設計           | `20-entity-overview.md`               |
| Entityフィールド分類 | `21-entity-field-classification.md`   |
| Entity実装           | `22-entity-implementation.md`         |
| Value Object設計     | `25-value-object-overview.md`         |
| Value Object実装     | `26-value-object-implementation.md`   |
| バリデーション戦略   | `11-domain-validation-strategy.md`    |
| リポジトリIF         | `30-repository-interface-overview.md` |
| 集約パターン         | `40-aggregate-overview.md`            |
| テスト戦略           | `50-test-overview.md`                 |

## 構成要素

### Entity（エンティティ）

識別子（ID）を持つドメインオブジェクト。

- 識別子（ID）で等価性を判断
- ライフサイクルを持つ
- Value Objectを保持
- 不変性（readonlyプロパティ、更新メソッドは新インスタンス返却）

**詳細**: `20-entity-overview.md`

### Value Object（値オブジェクト）

識別子を持たず、値そのもので等価性が判断されるドメインオブジェクト。

- 識別子なし
- 完全に不変
- ドメインルールまたは不変条件を内包
- equals()、toString()メソッド必須

**詳細**: `25-value-object-overview.md`

## 設計原則

### Always Valid Domain Model

**参照**: `11-domain-validation-strategy.md`

ドメインオブジェクトは**常に正しい状態**でなければならない。

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

### 外部依存ゼロ

**許可**: TypeScript標準ライブラリ、同じドメイン層内のEntity/Value Object、util層のResult型

**禁止**: AWS SDK、外部ライブラリ（Hono, Zod等）、インフラ・ユースケース・ハンドラ層のコード

### 不変性（Immutability）

すべてのプロパティは`readonly`。更新メソッドは新しいインスタンスを返す。

### Result型による明示的エラーハンドリング

例外を使わず、`Result<T, E>`で成功/失敗を明示的に返す。throwは使わない。

### 技術的詳細の漏洩防止

ドメインモデルにAWS、S3、DynamoDB、Cognito等の技術要素を含めない。

## ディレクトリ構成

### 設計思想

**フラットなディレクトリ構造 + 適切な境界**:

- **アグリゲートごとに1ディレクトリ**: 集約単位でファイルをまとめる（`40-aggregate-overview.md`参照）
- **ファイル数の抑制**: MECEなバリデーション戦略により、型レベルバリデーション用のValue Objectは不要（不変条件・ドメインルールを持つ場合のみValue Object化）。「将来必要になるかも」でVO化しない（`constitution/implementation-minimization-principles.md`参照）
- **ドット表記で種類を明示**: ディレクトリを深くせず、ファイル名で種類を判別

### 構成

```
domain/
├── model/
│   └── {aggregate}/                           # アグリゲートごとにディレクトリ
│       ├── {entity}.entity.ts                 # Entity定義
│       ├── {entity}.entity.small.test.ts      # Entityテスト
│       ├── {entity}.entity.dummy.ts           # Entityダミー
│       ├── {value-object}.vo.ts               # Value Object定義（.vo.ts）
│       ├── {value-object}.vo.small.test.ts    # Value Objectテスト
│       ├── {value-object}.vo.dummy.ts         # Value Objectダミー（Entity Dummyから使用）
│       ├── {entity}.repository.ts             # リポジトリインターフェース
│       └── {entity}.repository.dummy.ts       # リポジトリモック
│
└── support/                                   # サポートインターフェース
    └── .../                                   # logger, fetch-now, auth-client等
```

## ファイル命名規則

ドット表記（dot notation）を採用する。

| 種類                       | パターン                 | 例                          |
| -------------------------- | ------------------------ | --------------------------- |
| Entity                     | `{entity}.entity.ts`     | `todo.entity.ts`            |
| Value Object               | `{value-object}.vo.ts`   | `todo-status.vo.ts`         |
| リポジトリインターフェース | `{entity}.repository.ts` | `todo.repository.ts`        |
| ダミー                     | `{name}.dummy.ts`        | `todo.entity.dummy.ts`      |
| テスト                     | `{name}.small.test.ts`   | `todo.entity.small.test.ts` |

**使い分け**:

- **ハイフン（kebab-case）**: 機能名の単語を区切る（例: `todo-item`, `user-role`）
- **ドット**: 機能名と種類を区切る（例: `.entity`, `.repository`, `.vo`）

### この規則の利点

1. **可読性**: ファイル名から種類が即座に判別可能
2. **Globパターン**: `**/*.entity.ts`のようなパターンで種類別にファイルを検出可能
3. **カスタムLint設定**: ESLintルールで種類別にルールを適用しやすい（例: `.vo.ts`ファイルにはValue Object固有のルールを適用）

## Do / Don't

### ✅ Good

```typescript
// Entity: private constructor + from()ファクトリ、readonlyプロパティ、Value Object保持
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus; // Value Object
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

// Value Object: ドメインルール内包、Result型を返すfrom()
export class TodoStatus {
  private constructor(private readonly value: string) {}

  static from(props: { value: string }): Result<TodoStatus, DomainError> {
    if (!validValues.includes(props.value)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.value));
  }

  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(
        new DomainError("完了済みTODOのステータスは変更できません"),
      );
    }
    return Result.ok(undefined);
  }
}
```

### ❌ Bad

```typescript
// mutableなプロパティ
export class Todo {
  id: string; // ❌ readonlyがない
}

// 外部ライブラリ依存
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"; // ❌

// 技術的詳細の漏洩
export class Attachment {
  readonly s3Key: string; // ❌ 技術的詳細
  readonly cognitoUserId: string; // ❌ 技術的詳細
}

// throwを使用
static from(props: { value: string }): TodoStatus {
  if (!validValues.includes(props.value)) {
    throw new Error("無効なステータス"); // ❌ throwは使わない
  }
  return new TodoStatus(props.value);
}

// nullを使用
readonly dueDate: string | null; // ❌ undefinedを使うべき

// 必ず成功するValue Object
export class TodoTitle {
  // ❌ バリデーションがないならValue Object化不要
  static from(props: { value: string }): Result<TodoTitle, never> {
    return Result.ok(new TodoTitle(props.value));
  }
}
```
