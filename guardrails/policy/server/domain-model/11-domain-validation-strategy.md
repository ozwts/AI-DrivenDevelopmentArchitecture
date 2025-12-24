# バリデーション戦略

## 核心原則

バリデーションを**MECE（相互排他的かつ網羅的）**に各層で実施し、**同じバリデーションを複数箇所で重複実装しない**。

## 関連ドキュメント

| トピック         | ファイル                       |
| ---------------- | ------------------------------ |
| Entity設計       | `20-entity-overview.md`        |
| Value Object設計 | `25-value-object-overview.md`  |
| 憲法             | `constitution/structural-discipline/responsibility-principles.md` |

## 責務の階層（MECE原則）

```
第1階層: 型レベルバリデーション（Handler層）
   ↓ OpenAPI自動生成Zodによる自動検証
   ↓ 必須性、型、長さ、パターン、enum
   ↓ ValidationError（400 Bad Request）

第2階層: ドメインルール（Domain層）
   ↓ OpenAPIで表現できない複雑な形式チェック
   ↓ 自己完結的な不変条件（Value Object内部で完結）
   ↓ DomainError（422 Unprocessable Entity）

第3階層: ビジネスルール（UseCase層）
   ↓ 外部依存する不変条件（DB参照、他Entityとの関連）
   ↓ 権限チェック、存在チェック等
   ↓ 各種エラー（ForbiddenError、NotFoundError等）
```

## エラー型とHTTPステータスコードのマッピング

| エラー型          | 用途                         | HTTPステータス            | 実装場所     |
| ----------------- | ---------------------------- | ------------------------- | ------------ |
| `ValidationError` | 型レベルバリデーションエラー | 400 Bad Request           | Handler層    |
| `DomainError`     | ドメインルールエラー         | 422 Unprocessable Entity  | Domain層     |
| `NotFoundError`   | リソース未検出               | 404 Not Found             | UseCase層    |
| `ForbiddenError`  | アクセス拒否                 | 403 Forbidden             | UseCase層    |
| `ConflictError`   | データ競合                   | 409 Conflict              | UseCase層    |
| `UnexpectedError` | 予期せぬエラー               | 500 Internal Server Error | 全層         |

## Always Valid Domain Model原則

ドメインオブジェクトは**常に正しい状態（Valid State）**でなければならない。

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
- Entity内メソッドがValue Objectの不変条件チェックを実行
- throwは使わない（全層でResult型パターンを徹底）

## 不変条件チェックの配置基準

| 不変条件の種類           | 実装場所     | 例                                           |
| ------------------------ | ------------ | -------------------------------------------- |
| 単一VO内で完結する不変条件 | Value Object | 状態遷移ルール、会社ドメインのみのEmail、年齢制限 |
| 複数の値の関係性         | Entity層     | 完了TODOは期限必須、ステータスと完了日の整合性 |
| 外部依存する不変条件     | UseCase層    | プロジェクト存在チェック、権限チェック        |

## Value Object化の判断基準

| Tier     | 基準                             | Value Object化 |
| -------- | -------------------------------- | -------------- |
| Tier 1   | 単一VO内で完結する不変条件を持つ | ✅ 必須        |
| Tier 2   | ドメインルールを持つ             | ✅ 推奨        |
| Tier 3   | 型レベル制約のみ                 | ❌ 不要        |

**重要**: 必ず成功する（バリデーション不要な）Value Objectは作らない。

```
フィールドを検討
    ↓
単一VO内で完結する不変条件がある？ → YES → Value Object化（必須）
    ↓ NO
ドメインルールがある？ → YES → Value Object化（推奨）
    ↓ NO
    → プリミティブでOK
```

## Do / Don't

### ✅ Good

```typescript
// 第1階層: Handler層（OpenAPI/Zod）
// minLength, maxLength, pattern等はOpenAPIで定義

// 第2階層: Value Object（ドメインルール + 不変条件）
export class TodoStatus {
  static from(props: { value: string }): Result<TodoStatus, DomainError> {
    if (!validValues.includes(props.value)) {
      return Result.err(new DomainError("無効なステータス"));
    }
    return Result.ok(new TodoStatus(props.value));
  }

  // 不変条件: 完了済みからは他のステータスに変更不可
  canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
    if (this.isCompleted() && !newStatus.isCompleted()) {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    return Result.ok(undefined);
  }
}

// 第3階層: UseCase層（外部依存する不変条件）
const projectResult = await projectRepository.findById({ id: input.projectId });
if (projectResult.data === undefined) {
  return Result.err(new NotFoundError("プロジェクトが見つかりません"));
}
```

### ❌ Bad

```typescript
// 同じバリデーションを複数箇所で実装（MECE違反）
// Handler層
if (title.length < 1) { ... }  // ❌ OpenAPIで定義済み

// UseCase層
if (title.length < 1) { ... }  // ❌ 重複

// Entity層
if (title.length < 1) { ... }  // ❌ 重複

// 必ず成功するValue Object
export class TodoTitle {
  static from(props: { value: string }): Result<TodoTitle, never> {
    return Result.ok(new TodoTitle(props.value));  // ❌ バリデーションなしならVO化不要
  }
}

// throwを使用
static from(props: { value: string }): TodoStatus {
  if (!validValues.includes(props.value)) {
    throw new Error("無効なステータス");  // ❌ Result型を使う
  }
}
```
