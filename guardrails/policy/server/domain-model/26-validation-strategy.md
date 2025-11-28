# バリデーション戦略

## 概要

このプロジェクトでは、バリデーションをMECE（相互排他的かつ網羅的）に実施する。

**参照**: `constitution/validation-principles.md`

## バリデーション戦略の大原則

### 責務の階層

```
第1階層: 型レベルバリデーション（Handler層）
   ↓ OpenAPI自動生成Zodによる自動検証
   ↓ 必須性、型、長さ、パターン、enum

第2階層: ドメインルール（Value Object層）
   ↓ OpenAPIで表現できない複雑な形式チェック
   ↓ 自己完結的な不変条件（Value Object内部で完結）
   ↓ Result型を返す

第3階層: ビジネスルール（UseCase層）
   ↓ 外部依存する不変条件（DB参照、他Entityとの関連）
   ↓ 権限チェック、存在チェック等
   ↓ Result型を返す
```

**重要**: 同じバリデーションを複数箇所で重複実装しない

### 各層の判断基準

| 階層 | 実装場所 | 判断基準 | 返り値 |
|------|---------|---------|--------|
| 第1階層 | Handler層 | OpenAPIで表現可能な制約 | - |
| 第2階層 | Value Object | OpenAPIで表現不可能な複雑な形式チェック＋自己完結的な不変条件 | `Result<ValueObject, Error>` |
| 第3階層 | UseCase層 | 外部依存する不変条件（DB参照、他Entity参照） | `Result<T, Error>` |

**設計哲学**: Entity層は薄く保ち、ドメインロジックはValue Objectに配置する。Entityはシンプルなデータ変換メソッドのみを持つ（メソッドチェーン可能）。

## Always Valid Domain Model原則

**核心原則**: ドメインオブジェクトは常に正しい状態（Valid State）でなければならない。

### Always Valid原則とは

DDDにおける重要な設計原則の一つ。ドメインオブジェクト（Entity、Value Object）は**作成時点から常に不変条件（Invariants）を満たす状態**でなければならない。

**このプロジェクトにおける実現方法**:

```
Handler層（型レベルバリデーション）
    ↓ validated
Value Object層（ドメインルール + 自己完結的な不変条件）
    ↓ validated
UseCase層（外部依存する不変条件 + Value Object検証）
    ↓ validated
Entity層（シンプルなデータ変換のみ、Value Objectを保持）
    ↓
Entityインスタンス（常にvalid、Value Object内包）
```

**結果**:
- **Value Objectが不変条件を内包**（自己検証）
- Entityは**Value Objectを保持**し、メソッドはシンプルなデータ変換のみ
- Entity内メソッドは**チェーン可能**（Todo返す）
- UseCase層でValue Object生成時に検証
- 外部依存する不変条件は**UseCase層で実施**
- **throwは使わない**（全層でResult型パターンを徹底）

**メリット**:
- ビジネスルール違反の早期検出
- **Value Objectが振る舞いを持つ**（リッチドメインモデル）
- Entity メソッドチェーン可能（開発体験◎）
- 防御的プログラミング不要
- Result型パターンとの整合性
- Value Objectの再利用性が高い

## 不変条件チェックの配置基準

| 不変条件の種類 | 実装場所 | 返り値 | 例 |
|--------------|---------|--------|-----|
| **自己完結的な不変条件** | Value Object内 | `Result<ValueObject, Error>` | 完了済みTODOのステータス変更不可（`TodoStatus.canTransitionTo()`） |
| **外部依存する不変条件** | UseCase層 | `Result<T, Error>` | プロジェクト存在チェック、権限チェック |
| **OpenAPIで表現不可能なドメインルール** | Value Object | `Result<ValueObject, Error>` | Email（会社ドメインのみ許可）、複雑なビジネスルール |

## Value Object化の判断基準

| Tier | 基準 | Value Object化 | 例 |
|------|------|--------------|-----|
| **Tier 1: 必須** | 不変条件を持つフィールド | ✅ 必須 | `TodoStatus`（状態遷移ルール）、`OrderStatus`（注文状態遷移） |
| **Tier 2: 推奨** | OpenAPIで表現不可能なドメインルール | ✅ 推奨 | `Email`（会社ドメインのみ許可）、`Money`（通貨計算） |
| **Tier 3: 不要** | OpenAPIで表現可能な制約 | ❌ プリミティブでOK | `title: string`（minLength/maxLength）、`color: string`（pattern）、`id: string`、`createdAt: string` |

### 判断フローチャート

```
フィールドを検討
    ↓
不変条件（状態遷移ルール等）がある？
    ↓ YES → Tier 1: Value Object化（必須）
    ↓ NO
OpenAPIで表現不可能なドメインルールがある？
    ↓ YES → Tier 2: Value Object化（推奨）
    ↓ NO
    → Tier 3: プリミティブでOK（OpenAPIでバリデーション）
```

### 具体例

#### Tier 1: 不変条件あり → Value Object必須

```typescript
// ✅ 状態遷移ルールあり → Value Object化必須
export class TodoStatus {
  canTransitionTo(newStatus: TodoStatus): Result<void, ValidationError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return {
        success: false,
        error: new ValidationError('完了済みTODOのステータスは変更できません'),
      };
    }
    return { success: true, data: undefined };
  }
}
```

#### Tier 2: OpenAPIで表現不可能 → Value Object推奨

```typescript
// ✅ 会社ドメインのみ許可（OpenAPIで表現不可能）
export class Email {
  static fromString(value: string): Result<Email, ValidationError> {
    // OpenAPI format: email では基本形式のみチェック
    // Value Object: ドメイン固有のルール
    if (!value.endsWith("@company.com")) {
      return {
        success: false,
        error: new ValidationError("会社のメールアドレスのみ許可されています"),
      };
    }
    return { success: true, data: new Email(value) };
  }
}
```

#### Tier 3: OpenAPIで表現可能 → プリミティブでOK

```yaml
# OpenAPI定義
title:
  type: string
  minLength: 1
  maxLength: 200

color:
  type: string
  pattern: "^#[0-9A-Fa-f]{6}$"
```

```typescript
// ✅ OpenAPIでバリデーション → Value Object不要
export class Todo {
  readonly title: string;           // OpenAPI: minLength/maxLength
  readonly color?: string;          // OpenAPI: pattern
  readonly status: TodoStatus;      // Value Object（不変条件あり）
}
```

## UseCase層での呼び出しパターン

Value Objectで不変条件をチェックし、EntityはValue Objectを保持する。

```typescript
// ✅ UseCase層でのValue Object検証パターン
export class UpdateTodoUseCaseImpl {
  async execute(input: UpdateTodoInput): Promise<UpdateTodoResult> {
    // 既存TODO取得
    const existingResult = await this.#todoRepository.findById({
      id: input.id,
    });
    if (!existingResult.success) {
      return existingResult;
    }
    const existing = existingResult.data;

    // 外部依存する不変条件（UseCase層の責務）
    if (existing.assigneeUserId !== input.userSub) {
      return {
        success: false,
        error: new ForbiddenError('他人のTODOは変更できません'),
      };
    }

    // Value Object生成（型レベルバリデーション）
    const newStatusResult = TodoStatus.fromString(input.status);
    if (!newStatusResult.success) {
      return newStatusResult;
    }

    // Value Objectで不変条件チェック
    const canTransitionResult = existing.status.canTransitionTo(newStatusResult.data);
    if (!canTransitionResult.success) {
      return canTransitionResult;
    }

    // Entityメソッドはシンプル（メソッドチェーン可能！）
    const updated = existing
      .changeStatus(newStatusResult.data, dateToIsoString(now))
      .update({
        title: input.title,  // OpenAPIでバリデーション済み（string）
        updatedAt: dateToIsoString(now),
      });

    return await this.#todoRepository.save({ todo: updated });
  }
}
```

## バリデーション実装チェックリスト

新しいエンティティ追加時の確認事項：

**Always Valid原則**:
- [ ] フィールドを3-Tier分類（Required/Special Case/Optional）
- [ ] Requiredフィールドは非オプショナル（`?`なし）
- [ ] Special CaseとOptionalは`?`付き、`null`は使わない
- [ ] 不変条件を持つフィールドはValue Object化（必須）
- [ ] ビジネス的意味を持つフィールドはValue Object化（推奨）
- [ ] Entity内メソッドはシンプルなデータ変換のみ（メソッドチェーン可能）
- [ ] 外部依存する不変条件はUseCase層で実施
- [ ] Entity内メソッドでthrowは使わない
- [ ] コンストラクタは受け取った値をそのまま設定（バリデーション不要）

**Value Object設計**:
- [ ] 不変条件を持つフィールドはValue Object化（Tier 1: 必須）
- [ ] OpenAPIで表現不可能なドメインルールはValue Object化（Tier 2: 推奨）
- [ ] Value Objectはプライベートコンストラクタ + Result型を返す静的ファクトリメソッド
- [ ] Value Objectに不変条件チェックメソッドを実装（例: `canTransitionTo()`）
- [ ] OpenAPIで表現可能な制約（minLength/maxLength/pattern）はプリミティブでOK（Tier 3）

**バリデーション階層（MECE原則）**:
- [ ] OpenAPIに型制約を定義（required, type, minLength, maxLength, pattern, enum等）
- [ ] エンティティのコンストラクタでは型レベルのバリデーションをしない
- [ ] Value Objectで不変条件チェックを実施
- [ ] UseCase層でValue Object生成時に検証

**設計原則**:
- [ ] すべてのプロパティを `readonly` で定義
- [ ] Entity内メソッドは新しいインスタンスを返す（メソッドチェーン可能）
- [ ] JSDocコメントを記述
- [ ] スモールテスト（`.small.test.ts`）を作成

## レイヤー間の関係

```
HTTP Request
    ↓
Handler層
  - リクエスト取得
  - 入力バリデーション（Zod）
    ↓
UseCase層
  - Value Object生成＋検証
  - ビジネスロジック実行
    ↓
Domain層
  - Value Object（不変条件）
  - Entity（シンプルなデータ変換）
    ↓
Infrastructure層
  - データ永続化
    ↓（Result型）
UseCase層
    ↓（Result型）
Handler層
  - レスポンス変換
  - 出力バリデーション（Zod）
  - エラー変換
    ↓
HTTP Response
```

## 設計思想: Result型との統合

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
const colorResult = ProjectColor.fromString(value);
if (!colorResult.success) { ... }
```

### メリット

1. **エラーハンドリングの強制**: コンパイラが処理を強制
2. **型安全性**: エラーケースを見逃さない
3. **テスタビリティ**: エラーケースのテストが容易
4. **一貫性**: 全レイヤーで同じパターン
5. **MECE**: 各層で重複なく適切にバリデーション
