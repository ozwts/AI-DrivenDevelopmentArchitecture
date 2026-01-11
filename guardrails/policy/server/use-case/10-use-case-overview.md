# ユースケース層の全体像

## 核心原則

1. **1シナリオ = 1ユースケース**として実装（ビジネス契約から1対1で導出）
2. **Result型で成功/失敗を明示的に表現**
3. **executeメソッドで書き切る**（プライベートメソッドを作らず、全体の流れをexecuteメソッド内に記述）

## 関連ドキュメント

| トピック | ファイル |
| --- | --- |
| ドメインモデル | `../domain-model/10-domain-model-overview.md` |
| ポート | `../port/10-port-overview.md` |
| ハンドラー | `../handler/10-handler-overview.md` |
| バリデーション戦略 | `../../constitution/structural-discipline/responsibility-principles.md` |

## UseCase層の責務

### 実施すること

1. **ビジネスロジック実行**: ユースケース固有のルール実装
2. **エンティティ協調**: 複数エンティティ/リポジトリの組み合わせ
3. **Result型返却**: 成功/失敗を型安全に表現
4. **トランザクション管理**: Unit of Workで複数操作を調整
5. **ビジネスエラー返却**: NotFoundError、ForbiddenError、ConflictError

### 実施しないこと

1. **HTTPリクエスト処理**: Handler層の責務
2. **型レベルのバリデーション**: Handler層でZodスキーマで実施済み
3. **ドメインルール検証**: Domain層（Value Object）で実施済み
4. **データベースアクセス実装**: Infrastructure層（リポジトリ）に委譲
5. **レスポンス変換**: Handler層のマッパーに委譲

## ポリシー構成

| ポリシー                            | 内容                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| **10-use-case-overview.md**         | 責務、命名規則、バリデーション階層、Result型概要、エラー型定義       |
| **11-use-case-implementation.md**   | 実装テンプレート、Props型、PATCH更新、トランザクション、時刻・DI     |
| **12-entity-operation-patterns.md** | Entity操作パターン（判断フロー、メソッド選択、VOエラー伝播）         |
| **20-refactoring-overview.md**      | リファクタリング契機（貧血症、重複、N+1、ドメインサービス、VO追加）  |
| **30-testing-overview.md**          | テスト戦略（Small/Medium Test、Dummy、カバレッジ、CI/CD）            |

## ファイル構成

```
application/
├── use-case/
│   ├── interfaces.ts                     # 基底インターフェース
│   └── {entity}/                         # エンティティごとのディレクトリ
│       ├── {action}-{entity}-use-case.ts
│       └── {action}-{entity}-use-case.small.test.ts
└── port/                                 # ポート層（別ポリシー参照）
    └── ...
```

**参照**: ポート層の詳細は `../port/10-port-overview.md`

## 命名規則

| 対象             | パターン                                   | 例                                      |
| ---------------- | ------------------------------------------ | --------------------------------------- |
| ファイル名       | `{action}-{entity}-use-case.ts`            | `create-project-use-case.ts`            |
| テストファイル   | `{action}-{entity}-use-case.small.test.ts` | `create-project-use-case.small.test.ts` |
| 実装クラス       | `{Action}{Entity}UseCaseImpl`              | `CreateProjectUseCaseImpl`              |
| インターフェース | `{Action}{Entity}UseCase`                  | `CreateProjectUseCase`                  |
| Input型          | `{Action}{Entity}UseCaseInput`             | `CreateProjectUseCaseInput`             |
| Output型         | `{Action}{Entity}UseCaseOutput`            | `CreateProjectUseCaseOutput`            |
| Result型         | `{Action}{Entity}UseCaseResult`            | `CreateProjectUseCaseResult`            |
| Props型          | `{Action}{Entity}UseCaseProps`             | `CreateProjectUseCaseProps`             |

## アクション命名規則

| アクション  | 用途         | 例                                   |
| ----------- | ------------ | ------------------------------------ |
| `register`  | 新規登録     | `register-todo-use-case`             |
| `create`    | リソース作成 | `create-project-use-case`            |
| `get`       | 単一取得     | `get-project-use-case`               |
| `list`      | リスト取得   | `list-projects-use-case`             |
| `update`    | 更新         | `update-project-use-case`            |
| `delete`    | 削除         | `delete-project-use-case`            |
| `prepare-*` | 準備処理     | `prepare-attachment-upload-use-case` |

## バリデーション階層（MECE原則）

**参照**: `guardrails/constitution/structural-discipline/responsibility-principles.md`

ユースケース層は**第3階層：ビジネスルール**を担当する。

| 階層                  | 責務                         | 実装場所                 | 例                             |
| --------------------- | ---------------------------- | ------------------------ | ------------------------------ |
| 1. 型レベル           | 形式・長さ・型・必須性       | Handler層（Zod）         | `name: string（1文字以上）`    |
| 2. ドメインルール     | ドメイン固有制約             | Domain層（Value Object） | `ProjectColor.fromString()`    |
| **3. ビジネスルール** | **権限・状態・関連チェック** | **ユースケース層**       | **権限チェック、重複チェック** |
| 4. 構造的整合性       | エンティティ不変条件         | Entity層（最小限）       | readonly等で保護               |

### ユースケース層の責務（第3階層）

**実施すること**: データベース参照を伴うビジネスルールの検証

1. **権限チェック**: リソースへのアクセス権限確認
2. **リソース存在確認**: 参照先データの存在チェック
3. **重複チェック**: ユニーク制約の検証
4. **状態遷移ルール**: ビジネス文脈での状態変更可否

**実施しないこと**:

- **型レベルのバリデーション**（第1階層）: Handler層でZodスキーマで検証済み
- **ドメインルールの検証**（第2階層）: Domain層のValue Objectで検証済み

**詳細な実装パターン**: `11-use-case-implementation.md`

## Result型パターン

**参照**: `@/util/result`

ユースケースは必ず`Result<T, E>`型を返却する。

**Result型の特徴**:

- `success: boolean` で成功/失敗を判定
- 成功時は `data: T`、失敗時は `error: E` を持つ
- `Result.ok(data)` で成功を生成
- `Result.err(error)` で失敗を生成
- `isOk()` / `isErr()` 型ガードで型安全にプロパティアクセス
- `then()` メソッドでメソッドチェーン可能

**原則**:

- 例外を投げず、Result型でエラーを表現
- 型システムでエラーハンドリング強制
- 成功/失敗の判定は `isOk()` / `isErr()` 型ガードを使用

**基本的な使用パターン**:

```typescript
// UseCase基底インターフェース（application/use-case/interfaces.ts）
export type UseCase<TInput, TOutput, TException extends Error> = {
  execute(input: TInput): Promise<Result<TOutput, TException>>;
};

// 成功を返す
return Result.ok({ project });

// 失敗を返す
return Result.err(new NotFoundError("プロジェクトが見つかりません"));
```

**詳細な実装パターン**: `11-use-case-implementation.md`

## インターフェース定義

**必須要件**: 各ユースケースのインターフェースは `interfaces.ts` の `UseCase<TInput, TOutput, TException>` を使用して定義する。

```typescript
// ✅ Good: UseCase型を使用
export type CreateProjectUseCase = UseCase<
  CreateProjectUseCaseInput,
  CreateProjectUseCaseOutput,
  DomainError | UnexpectedError
>;

// ❌ Bad: 独自に定義
export type CreateProjectUseCase = {
  execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult>;
};
```

**理由**:

- **統一性**: 全ユースケースが同じ構造を持つことを保証
- **型安全性**: 基底インターフェースにより戻り値の型が統一される
- **保守性**: インターフェース変更時に一箇所で対応可能

**実装クラスの定義**:

```typescript
// 実装クラスは必ずインターフェースをimplementsする
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  // ...
}
```

## エラー型の定義

**参照**: `@/util/error-util`

| エラー型        | 発生場所  | 用途                         | HTTPステータス            |
| --------------- | --------- | ---------------------------- | ------------------------- |
| ValidationError | Handler層 | 型レベルバリデーションエラー | 400 Bad Request           |
| DomainError     | Domain層  | ドメインルール違反           | 422 Unprocessable Entity  |
| NotFoundError   | UseCase層 | リソース未存在               | 404 Not Found             |
| ForbiddenError  | UseCase層 | アクセス権限なし             | 403 Forbidden             |
| ConflictError   | UseCase層 | 重複データ、競合状態         | 409 Conflict              |
| UnexpectedError | 全層      | 予期しないエラー             | 500 Internal Server Error |

**UseCase層の責務**: NotFoundError、ForbiddenError、ConflictErrorを返す

## シナリオとの整合性

ユースケースは `contracts/business/{domain}/scenario/*.md` から導出する。実装時に以下の整合性を確認すること。

**参照先**:
- 用語集: `contracts/business/glossary.md`
- シナリオ: `contracts/business/{domain}/scenario/{scenario}.md`

### ユースケース名の一致

シナリオのファイル名・タイトルとユースケース名が対応しているか確認する。

```typescript
// contracts/business/todo/scenario/register-todo.md
// タイトル: TODOを登録する

// ✅ Good: シナリオと一致
// register-todo-use-case.ts
export class RegisterTodoUseCaseImpl { ... }

// ❌ Bad: シナリオと異なる命名
// create-todo-use-case.ts  // シナリオは「登録」
// add-todo-use-case.ts     // シナリオにない命名
```

### 入力の一致

シナリオの「何を」セクションとUseCaseInputが対応しているか確認する。

```typescript
// contracts/business/todo/scenario/register-todo.md
// ## 何を
// - タイトル（必須）
// - 説明
// - 優先度
// - 期限
// - プロジェクト

// ✅ Good: シナリオの入力と一致
export type RegisterTodoUseCaseInput = {
  title: string;         // タイトル（必須）
  description?: string;  // 説明
  priority?: string;     // 優先度
  dueDate?: string;      // 期限
  projectId?: string;    // プロジェクト
};

// ❌ Bad: シナリオにない入力を追加
export type RegisterTodoUseCaseInput = {
  title: string;
  tags?: string[];       // ❌ シナリオにない
  isImportant?: boolean; // ❌ シナリオにない
};
```

### 振る舞いの一致

シナリオの「どうなる」セクションがユースケースで実装されているか確認する。

```typescript
// contracts/business/todo/scenario/register-todo.md
// ## どうなる
// - TODOが作成される
// - 作成者が担当者として設定される
// - ステータスは未着手で初期化される
// - 優先度は中で初期化される（指定がない場合）

// ✅ Good: シナリオの振る舞いを実装
const todoResult = Todo.from({
  ...input,
  assigneeId: input.userId,                           // 作成者が担当者
  status: TodoStatus.notStarted(),                    // 未着手で初期化
  priority: input.priority ?? Priority.medium(),     // デフォルトは中
});
```

### 例外の一致

シナリオの「例外」セクションがユースケースでエラーとして返されるか確認する。

```typescript
// contracts/business/todo/scenario/register-todo.md
// ## 例外
// - タイトルが空の場合、登録できない

// ✅ Good: シナリオの例外がバリデーション層で処理される
// → Handler層のZodスキーマで title: z.string().min(1) として検証済み
// → UseCase層では型レベルバリデーション済みの入力を受け取る
```

## Do / Don't

### ✅ Good

```typescript
// 明示的な型定義
export type CreateProjectUseCaseInput = {
  name: string;
  description?: string;
  color: string;
};

// Result型での明示的エラー処理
if (!saveResult.success) {
  return Result.err(saveResult.error);
}

// 単一責任原則（1アクション = 1ユースケース）
// create-project-use-case.ts - プロジェクト作成のみ
// delete-project-use-case.ts - プロジェクト削除のみ
```

### ❌ Bad

```typescript
// any型の使用
async execute(input: any): Promise<any>

// 例外を投げる
try {
  await this.#projectRepository.save(...);
} catch (error) {
  throw error; // ❌ Result型で返すべき
}

// 型レベルのバリデーション（Handler層の責務）
if (input.name.length === 0) {
  // ❌ Handler層でZodスキーマで検証済み
}

// 複数のアクションを1つに含める
// manage-project-use-case.ts（作成・削除・更新を全て含む）

// 異なるビジネス意図を汎用化する
class ChangeRoleUseCaseImpl {
  async execute(input: { memberId: string; newRole: string }) {
    if (input.newRole === 'owner') {
      // 昇格ロジック
    } else {
      // 降格ロジック ← 異なる意図・権限・制約を条件分岐で処理
    }
  }
}
// ✅ 正しくは PromoteToOwnerUseCase と DemoteFromOwnerUseCase に分離
```
