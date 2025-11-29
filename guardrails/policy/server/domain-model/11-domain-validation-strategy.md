# バリデーション戦略

## 概要

バリデーションをMECE（相互排他的かつ網羅的）に各層で実施する。

**関連ドキュメント**:

- **Entity設計**: `20-entity-overview.md`
- **Entity実装**: `22-entity-implementation.md`
- **Value Object設計**: `25-value-object-overview.md`
- **Value Object実装**: `26-value-object-implementation.md`
- **憲法**: `constitution/validation-principles.md`

## 責務の階層（MECE原則）

```
第1階層: 型レベルバリデーション（Handler層）
   ↓ OpenAPI自動生成Zodによる自動検証
   ↓ 必須性、型、長さ、パターン、enum
   ↓ ValidationError（400 Bad Request）

第2階層: ドメインルール（Domain層（Value Object/Entity））
   ↓ OpenAPIで表現できない複雑な形式チェック
   ↓ 自己完結的な不変条件（Value Object内部で完結）
   ↓ DomainError（422 Unprocessable Entity）
   ↓ Result型を返す

第3階層: ビジネスルール（UseCase層）
   ↓ 外部依存する不変条件（DB参照、他Entityとの関連）
   ↓ 権限チェック、存在チェック等
   ↓ 各種エラー（ForbiddenError、NotFoundError等）
   ↓ Result型を返す
```

**重要**: 同じバリデーションを複数箇所で重複実装しない。

## エラー型とHTTPステータスコードのマッピング

| エラー型          | 用途                         | HTTPステータスコード      | 実装場所                         |
| ----------------- | ---------------------------- | ------------------------- | -------------------------------- |
| `ValidationError` | 型レベルバリデーションエラー | 400 Bad Request           | Handler層（OpenAPI/Zod自動生成） |
| `DomainError`     | ドメインルールエラー         | 422 Unprocessable Entity  | Domain層（Value Object/Entity）  |
| `NotFoundError`   | リソース未検出               | 404 Not Found             | UseCase層                        |
| `ForbiddenError`  | アクセス拒否                 | 403 Forbidden             | UseCase層                        |
| `ConflictError`   | データ競合                   | 409 Conflict              | UseCase層                        |
| `UnexpectedError` | 予期せぬエラー               | 500 Internal Server Error | 全層                             |

**設計原則**:

- **ValidationError（400）**: OpenAPI/Zodで自動検証される型レベルの制約違反（minLength、maxLength、pattern、enum等）
- **DomainError（422）**: ドメインロジックを含むビジネスルール違反（例: 18歳以上、会社ドメインのメールアドレスのみ、完了済みTODOのステータス変更不可等）
- OpenAPIでもドメインロジックを表現可能な場合があるが、**実施しない**（Domain層の責務）

## 各層の判断基準

| 階層    | 実装場所     | 判断基準                                                       | エラー型          | 返り値                             |
| ------- | ------------ | -------------------------------------------------------------- | ----------------- | ---------------------------------- |
| 第1階層 | Handler層    | OpenAPIで表現可能な制約（minLength、maxLength、pattern、enum） | `ValidationError` | -                                  |
| 第2階層 | Value Object | ドメインロジックを含む制約＋自己完結的な不変条件               | `DomainError`     | `Result<ValueObject, DomainError>` |
| 第3階層 | UseCase層    | 外部依存する不変条件（DB参照、他Entity参照）                   | 各種エラー        | `Result<T, Error>`                 |

## Always Valid Domain Model原則

**核心原則**: ドメインオブジェクトは常に正しい状態（Valid State）でなければならない。

DDDにおける重要な設計原則の一つ。ドメインオブジェクト（Entity、Value Object）は**作成時点から常に不変条件（Invariants）を満たす状態**でなければならない。

### このプロジェクトにおける実現方法

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

- **Value Objectが不変条件を内包**（自己検証）
- **Entity内メソッドがValue Objectの不変条件チェックを実行**（ドメイン貧血症を回避）
- **すべてのメソッドでチェーン可能**:
  - バリデーション不要 → Entityを返す
  - バリデーション必要 → Result型を返す
  - `Result.then()`が両方を吸収するため、完全フラットなチェーンが可能
- UseCase層でValue Object生成時に検証
- 外部依存する不変条件は**UseCase層で実施**
- **throwは使わない**（全層でResult型パターンを徹底）

**メリット**:

- ビジネスルール違反の早期検出
- **Value Objectが振る舞いを持つ**（リッチドメインモデル）
- **EntityとResult型を混在させた完全フラットなメソッドチェーン**（開発体験◎）
- 防御的プログラミング不要
- Result型パターンとの整合性
- Value Objectの再利用性が高い

## 不変条件チェックの配置基準

| 不変条件の種類                 | 実装場所                            | エラー型      | 返り値                                                        | 例                                                                                                    |
| ------------------------------ | ----------------------------------- | ------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **単一VO内で完結する不変条件** | Value Object内                      | `DomainError` | `Result<ValueObject, DomainError>`                            | 状態遷移ルール（`TodoStatus.canTransitionTo()`）、Email（会社ドメインのみ許可）、年齢制限（18歳以上） |
| **複数の値の関係性**           | Entity層（メソッド）またはUseCase層 | `DomainError` | `Result<Entity, DomainError>` または `Result<T, DomainError>` | 完了TODOは期限必須、ステータスと完了日の整合性、複数フィールドの連動                                  |
| **外部依存する不変条件**       | UseCase層                           | 各種エラー    | `Result<T, Error>`                                            | プロジェクト存在チェック（NotFoundError）、権限チェック（ForbiddenError）                             |

**重要**: 単一VO内で完結する不変条件とは、他のフィールドを参照せず、Value Object自身だけで判断できる不変条件を指す。

### 実装場所の判断基準

**Value Object層**:

- 単一Value Objectの自己完結的な不変条件
- 外部依存なし（他のValue ObjectやEntityを参照しない）
- 例: メールアドレス形式、年齢制限、状態遷移ルール

**Entity層**:

- 複数のプロパティ（Value ObjectまたはプリミティブValue）の関係性チェック
- Entity全体を見た不変条件
- 例: 完了TODOは期限必須、ステータスと完了日の整合性
- **Result型を返す**

**UseCase層**:

- 外部依存する不変条件（DB参照、他Entityとの関連）
- ビジネスルール（権限チェック、存在チェック）
- 複雑なビジネスロジック

## Value Object化の判断基準

| Tier             | 基準                                  | Value Object化      | 例                                                                                                                                                     |
| ---------------- | ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tier 1: 必須** | 単一VO内で完結する不変条件を持つ      | ✅ 必須             | `TodoStatus`（状態遷移ルール）、`OrderStatus`（注文状態遷移）                                                                                          |
| **Tier 2: 推奨** | ドメインルールを持つ                  | ✅ 推奨             | `Email`（会社ドメインのみ許可）、`Age`（18歳以上）、`Money`（通貨計算）                                                                                |
| **Tier 3: 不要** | 型レベル制約のみ（OpenAPIで表現可能） | ❌ プリミティブでOK | `title: string`（minLength/maxLength）、`priority: "LOW" \| "MEDIUM" \| "HIGH"`（OpenAPI enum、状態遷移ルールなし）、`id: string`、`createdAt: string` |

**重要な原則**:

- **必ず成功する（バリデーション不要な）Value Objectは作らない**
- Value Objectは**ドメインルールまたは不変条件を内包する**ために使用する
- 単なる型エイリアスや命名のためにValue Objectを作らない
- 複数フィールドの関係性チェック（例: 完了TODOは期限必須）はEntity層の責務

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

## Entity層の設計方針

**基本方針**: Entity層は薄く保ち、メソッドチェーンを維持する。複数値関係性バリデーションが必要な場合のみResult型を返す。

**設計哲学**: ドメインロジックは積極的にValue Objectに配置する。

**Entityメソッドの設計方針**:

- **基本方針**: Entity層は薄く保つ
- **シンプルなデータ変換メソッド**: Entityを返す（`Result.ok()`のボイラープレート不要）
- **複数値関係性バリデーションが必要な場合**: Result型を返す
- **すべてのメソッドでチェーン可能**: `Result.then()`がEntityとResult型を吸収
- **積極的にValue Object活用**: 単一フィールドの不変条件はValue Objectに委譲してEntity層を薄く保つ

## Result型との統合

このプロジェクトでは、**例外を使わず、Result型で明示的にエラーハンドリング**する方針を採用している。

### 全レイヤーでの一貫性

```typescript
// ハンドラー層: Zodバリデーション
app.post("/todos", zValidator("json", schemas.RegisterTodoParamsSchema), ...);
// ↓ バリデーション済み

// UseCase層
const result = await useCase.execute(input);
if (!result.success) { ... }

// Repository層
const result = await repository.findById({ id });
if (!result.success) { ... }

// Value Object層
const statusResult = TodoStatus.from({ value });
if (!statusResult.success) { ... }
```

### メリット

1. **エラーハンドリングの強制**: コンパイラが処理を強制
2. **型安全性**: エラーケースを見逃さない
3. **テスタビリティ**: エラーケースのテストが容易
4. **一貫性**: 全レイヤーで同じパターン
5. **MECE**: 各層で重複なく適切にバリデーション

## チェックリスト

### バリデーション階層（MECE原則）

```
[ ] OpenAPIに型制約を定義（required, type, minLength, maxLength, pattern, enum等）
[ ] OpenAPIではドメインロジックを含むバリデーションを実施しない（例: 18歳以上）
[ ] エンティティのコンストラクタでは型レベルのバリデーションをしない
[ ] Value Objectで不変条件とドメインルールチェックを実施（DomainErrorを返す）
[ ] UseCase層でValue Object生成時に検証
[ ] 同じバリデーションを複数箇所で重複実装しない
```

### Value Object化判断

```
[ ] 単一VO内で完結する不変条件を持つフィールドはValue Object化（Tier 1: 必須）
[ ] ドメインルールを含むフィールドはValue Object化（Tier 2: 推奨）
[ ] 必ず成功する（バリデーション不要な）Value Objectは作らない
[ ] 型レベル制約のみのフィールドはプリミティブでOK（Tier 3）
```

### Entity設計

```
[ ] 基本方針: Entity層は薄く保つ（メソッドチェーン可能な状態を維持）
[ ] シンプルなデータ変換メソッドはEntityを返す（メソッドチェーン可能）
[ ] 複数値関係性バリデーションが必要な場合のみResult型を返す
[ ] すべてのメソッドはResult.then()でメソッドチェーン可能
[ ] Value Object不変条件チェックはEntity内メソッドで実行（ドメイン貧血症を回避）
[ ] 複数値関係性バリデーションは必要最小限にとどめる
[ ] 単一Value Objectの不変条件チェックはValue Object層で定義し、Entity層で呼び出す
```
