# ユースケース層の全体像

## 核心原則

1. **1つのユーザーアクション = 1つのユースケース**として実装
2. **Result型で成功/失敗を明示的に表現**
3. **ドメインモデル貧血症を防ぐ**（常にドメインメソッドの追加・改修を検討）
4. **executeメソッドで書き切る**（プライベートメソッドを作らず、全体の流れをexecuteメソッド内に記述）

**参照**: `15-domain-model-interaction.md` - ドメインモデルとの関係性

## UseCase層の責務

### 実施すること

1. **ビジネスロジック実行**: ユースケース固有のルール実装
2. **エンティティ協調**: 複数エンティティ/リポジトリの組み合わせ
3. **Result型返却**: 成功/失敗を型安全に表現
4. **トランザクション管理**: Unit of Workで複数操作を調整
5. **ドメインエラー定義**: ビジネス文脈に基づくエラー

### 実施しないこと

1. **HTTPリクエスト処理**: Handler層の責務
2. **型レベルのバリデーション**: Handler層でZodスキーマで実施済み
3. **データベースアクセス実装**: Infrastructure層（リポジトリ）に委譲
4. **レスポンス変換**: Handler層のマッパーに委譲

## ポリシー構成

| ポリシー                           | 内容                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **10-use-case-overview.md**        | ユースケース層の全体像、責務、命名規則、バリデーション戦略、Result型パターン、エラー型定義                                                                 |
| **15-domain-model-interaction.md** | ドメインモデル貧血症防止、Entity操作パターン（新規作成・PATCH更新・ビジネスメソッド）、Value Objectエラー変換                                              |
| **20-use-case-implementation.md**  | 実装テンプレート、Props型設計、ビジネスルール検証パターン、Result型伝播、トランザクション管理、PATCH更新マージロジック、時刻取得・ログ出力・DIコンテナ登録 |
| **30-use-case-testing.md**         | Small Test/Medium Test実装パターン、Dummyリポジトリパターン、テストカバレッジ戦略、テストヘルパー、テスト実行戦略                                          |

## ファイル構成

```
use-case/
├── interfaces.ts                     # 基底インターフェース
├── {entity}/                         # エンティティごとのディレクトリ
│   ├── {action}-{entity}-use-case.ts
│   └── {action}-{entity}-use-case.small.test.ts
```

## 命名規則

| 対象             | パターン                                   | 例                                      |
| ---------------- | ------------------------------------------ | --------------------------------------- |
| ファイル名       | `{action}-{entity}-use-case.ts`            | `create-project-use-case.ts`            |
| テストファイル   | `{action}-{entity}-use-case.small.test.ts` | `create-project-use-case.small.test.ts` |
| 実装クラス       | `{Action}{Entity}UseCaseImpl`              | `CreateProjectUseCaseImpl`              |
| インターフェース | `{Action}{Entity}UseCase`                  | `CreateProjectUseCase`                  |
| Input型          | `{Action}{Entity}UseCaseInput`             | `CreateProjectUseCaseInput`             |
| Output型         | `{Action}{Entity}UseCaseOutput`            | `CreateProjectUseCaseOutput`            |
| Exception型      | `{Action}{Entity}UseCaseException`         | `CreateProjectUseCaseException`         |
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

## レイヤー間の関係

```
Handler層
  ↓ (Zodバリデーション済みInput)
ユースケース層（このドキュメント）
  - ビジネスロジック実行
  - エンティティ協調
  ↓ (リポジトリインターフェース呼び出し)
Domain層
  - エンティティ操作
  ↓
Infrastructure層
  - データ永続化
  ↓ (Result型)
ユースケース層
  ↓ (Result型)
Handler層
  - レスポンス変換
  - エラー変換
```

## バリデーション戦略（MECE原則）

**参照**:

- `guardrails/constitution/validation-principles.md` - バリデーション原則の詳細
- `20-use-case-implementation.md` - ビジネスルール検証パターン

### バリデーション階層におけるユースケース層の位置付け

バリデーションは4つの階層に分類され、ユースケース層は**第3階層：ビジネスルール**を担当する。

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

- **型レベルのバリデーション**（第1階層）: Handler層でZodスキーマによる検証が完了済み
- **ドメインルールの検証**（第2階層）: Domain層のValue Objectで検証済み

**詳細な実装パターン**: `20-use-case-implementation.md` - ビジネスルール検証パターン

### MECE原則の適用

**Mutually Exclusive（相互排他的）**: 同じバリデーションを複数層で重複しない

**Collectively Exhaustive（網羅的）**: ビジネスルールはすべてユースケース層で検証

**利点**:

- 保守性: ビジネスルール変更が一箇所で完結
- 信頼性: 各層の責務が明確で検証漏れを防止
- テスタビリティ: 各層を独立してテスト可能

## Result型パターン

**参照**: `@/util/result` - Result型の定義

ユースケースは必ず`Result<T, E>`型を返却する。

**Result型の特徴**:

- クラスベースの実装（`Result<T, E extends Error>`）
- `success: boolean` で成功/失敗を判定
- 成功時は `data: T`、失敗時は `error: E` を持つ
- `Result.ok(data)` で成功を生成
- `Result.err(error)` で失敗を生成
- `then()` メソッドでメソッドチェーン可能（モナディックバインド）

**原則**:

- 例外を投げず、Result型でエラーを表現
- 型システムでエラーハンドリング強制
- success/errorの判定は`result.success`で実施

**基本的な使用パターン**:

```typescript
// UseCase基底インターフェース（use-case/interfaces.ts）
export type UseCase<TInput, TOutput, TException extends Error> = {
  execute(input: TInput): Promise<Result<TOutput, TException>>;
};

// 成功を返す
async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
  const projectId = this.#props.projectRepository.projectId();

  // Result型の判定
  const colorResult = ProjectColor.from({ value: input.color });
  if (!colorResult.success) {
    return Result.err(colorResult.error);  // 失敗を返す
  }

  const project = new Project({ id: projectId, color: colorResult.data, ... });

  const saveResult = await this.#props.projectRepository.save({ project });
  if (!saveResult.success) {
    return Result.err(saveResult.error);  // 失敗を返す
  }

  return Result.ok({ project });  // 成功を返す
}
```

**メソッドチェーンパターン**:

```typescript
// then()を使ったメソッドチェーン
const result = Result.ok(todo)
  .then((t) => t.updateTitle("新しいタイトル")) // Todoを返す → 自動でResult.ok()に包む
  .then((t) => todoRepository.save({ todo: t })); // Result<void>を返す
```

**詳細**: `20-use-case-implementation.md` - Result型伝播パターン

## エラー型の定義

**参照**: `@/util/error-util` - エラー型の定義

ユースケース層で使用する主なエラー型：

| エラー型        | 発生場所  | 用途                         | HTTPステータス            |
| --------------- | --------- | ---------------------------- | ------------------------- |
| ValidationError | Handler層 | 型レベルバリデーションエラー | 400 Bad Request           |
| DomainError     | Domain層  | ドメインルール違反           | 422 Unprocessable Entity  |
| NotFoundError   | UseCase層 | リソース未存在               | 404 Not Found             |
| ForbiddenError  | UseCase層 | アクセス権限なし             | 403 Forbidden             |
| ConflictError   | UseCase層 | 重複データ、競合状態         | 409 Conflict              |
| UnexpectedError | 全層      | 予期しないエラー             | 500 Internal Server Error |

**UseCase層の責務**: NotFoundError、ForbiddenError、ConflictErrorを返す（ビジネスルール検証）

## テスト戦略

**詳細**: `30-use-case-testing.md` - テスト実装パターン

ユースケース層は2種類のテストを実施：

- **Small Test** (`.small.test.ts`): Dummy実装を使用した高速ユニットテスト
- **Medium Test** (`.medium.test.ts`): 実DynamoDBを使用した統合テスト（トランザクション動作確認）

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

// 依存性の明示（Props型）
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// 単一責任原則（1アクション = 1ユースケース）
// create-project-use-case.ts - プロジェクト作成のみ
// delete-project-use-case.ts - プロジェクト削除のみ

// executeメソッドで書き切る（プライベートメソッドを作らない）
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    // ビジネスロジック全体がexecuteメソッド内に記述されている
    const projectId = this.#projectRepository.projectId();
    const now = this.#fetchNow();

    const colorResult = ProjectColor.from({ value: input.color });
    if (!colorResult.success) {
      return Result.err(colorResult.error);
    }

    const project = new Project({
      id: projectId,
      name: input.name,
      description: input.description,
      color: colorResult.data,
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await this.#projectRepository.save({ project });
    if (!saveResult.success) {
      return Result.err(saveResult.error);
    }

    return Result.ok({ project });
  }
}
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

// 型レベルのバリデーション
if (input.name.length === 0) {
  // ❌ Handler層でZodスキーマで検証済み
}

// 複数のアクションを1つに含める
// manage-project-use-case.ts（作成・削除・更新を全て含む）

// プライベートメソッドで分割
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
    // ❌ ロジックがプライベートメソッドに分散
    const colorResult = await this.#validateColor(input.color);
    if (!colorResult.success) {
      return Result.err(colorResult.error);
    }

    const project = this.#createProjectEntity(input, colorResult.data);
    return await this.#saveProject(project);
  }

  // ❌ プライベートメソッドでロジックを分割すると、executeメソッドだけ見ても全体像が分からない
  async #validateColor(color: string): Promise<Result<ProjectColor, DomainError>> {
    return ProjectColor.from({ value: color });
  }

  #createProjectEntity(input: CreateProjectUseCaseInput, color: ProjectColor): Project {
    const projectId = this.#projectRepository.projectId();
    const now = this.#fetchNow();
    return new Project({ id: projectId, name: input.name, color, createdAt: now, updatedAt: now });
  }

  async #saveProject(project: Project): Promise<CreateProjectUseCaseResult> {
    const saveResult = await this.#projectRepository.save({ project });
    if (!saveResult.success) {
      return Result.err(saveResult.error);
    }
    return Result.ok({ project });
  }
}
```

## 実装の必要最小限化

**憲法参照**: `guardrails/constitution/implementation-minimization-principles.md`

### 1. 使われていないユースケースは実装しない

**現在必要なユーザーアクションのみをユースケースとして実装する。**

```typescript
// ❌ Bad: 使われていないユースケースを「念のため」実装
// archive-project-use-case.ts - どこからも呼ばれていない
// export-projects-use-case.ts - 今のところ必要ない
// bulk-delete-projects-use-case.ts - まだ要件にない

// ✅ Good: 現在必要なユースケースのみ実装
// create-project-use-case.ts - 必要
// get-project-use-case.ts - 必要
// update-project-use-case.ts - 必要
// delete-project-use-case.ts - 必要
```

### 2. ドメインモデル貧血症を防ぐ

**複数のユースケースで同じロジックを実装している場合、ドメインモデルのメソッドに抽出する。**

```typescript
// ❌ Bad: 複数のユースケースで同じステータス遷移チェックを実装
// update-todo-use-case.ts
if (existingTodo.status === "COMPLETED") {
  return Result.err(new DomainError("完了済みTODOは更新できません"));
}

// complete-todo-use-case.ts
if (existingTodo.status === "COMPLETED") {
  return Result.err(new DomainError("すでに完了しています"));
}

// ✅ Good: ドメインモデルのメソッドに抽出（Entity内で不変条件チェック）
// Todo Entity
changeStatus(newStatus: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
  const canTransitionResult = this.status.canTransitionTo(newStatus);
  if (!canTransitionResult.success) {
    return canTransitionResult;
  }
  return Result.ok(new Todo({ ...this, status: newStatus, updatedAt }));
}

// UseCase層では単にメソッドを呼ぶだけ
const updateResult = existingTodo.changeStatus(newStatus, now);
if (!updateResult.success) {
  return Result.err(updateResult.error);
}
```

**参照**: `15-domain-model-interaction.md` - ドメインモデル貧血症防止の詳細

### 3. ビジネスルールの重複を避ける

**同じビジネスルールを複数のユースケースで重複実装せず、共通化する。**

```typescript
// ❌ Bad: 権限チェックを各ユースケースで重複実装
// update-project-use-case.ts
if (project.userSub !== currentUserSub) {
  return Result.err(
    new ForbiddenError("プロジェクトへのアクセス権限がありません"),
  );
}

// delete-project-use-case.ts
if (project.userSub !== currentUserSub) {
  return Result.err(
    new ForbiddenError("プロジェクトへのアクセス権限がありません"),
  );
}

// ✅ Good: 権限チェックを共通関数に抽出
// project-permission.ts
export const checkProjectOwnership = (
  project: Project,
  currentUserSub: string,
): Result<void, ForbiddenError> => {
  if (project.userSub !== currentUserSub) {
    return Result.err(
      new ForbiddenError("プロジェクトへのアクセス権限がありません"),
    );
  }
  return Result.ok(undefined);
};

// 各ユースケースで使用
const permissionResult = checkProjectOwnership(project, currentUserSub);
if (!permissionResult.success) {
  return Result.err(permissionResult.error);
}
```

### 4. 必要性が明確になった時点でリファクタリング

**非効率な実装を見つけたら、目先の修正で終わらせず、根本的にリファクタリングする。**

```typescript
// ❌ Bad: 複数のプロジェクトを個別に取得（N+1問題）
const projects: Project[] = [];
for (const projectId of projectIds) {
  const result = await projectRepository.findById({ id: projectId });
  if (result.success && result.data) {
    projects.push(result.data);
  }
}

// ✅ Good: リポジトリインターフェースにfindByIdsを追加
// project-repository.ts（インターフェースに遡って追加）
export type ProjectRepository = {
  findById(props: { id: string }): Promise<FindByIdResult>;
  findByIds(props: { ids: string[] }): Promise<FindByIdsResult>; // 追加
};

// UseCase層では新しいメソッドを使用
const projectsResult = await projectRepository.findByIds({ ids: projectIds });
```

## チェックリスト

### 核心原則

```
[ ] 1つのユーザーアクション = 1つのユースケースとして実装
[ ] Result型で成功/失敗を明示的に表現
[ ] ドメインモデル貧血症を防いでいる（ドメインメソッドを活用）
[ ] executeメソッドで書き切っている（プライベートメソッドなし）
```

### 責務

```
[ ] ビジネスロジックを実行している（ユースケース固有のルール）
[ ] Result型を返却している
[ ] HTTPリクエスト処理をしていない（Handler層の責務）
[ ] 型レベルのバリデーションをしていない（Handler層で実施済み）
[ ] データベースアクセス実装をしていない（Repositoryに委譲）
[ ] レスポンス変換をしていない（Handler層のマッパーに委譲）
```

### 実装パターン

```
[ ] 明示的な型定義（Input、Output、Exception、Result、Props）
[ ] Props型で依存性を明示
[ ] Propsパターン使用（オブジェクト形式の引数）
[ ] 例外を投げていない（Result型で返却）
[ ] 適切な命名規則（{Action}{Entity}UseCase）
```

### 実装の必要最小限化

```
[ ] 使われていないユースケースを実装していない
[ ] ドメインモデル貧血症を防いでいる（重複ロジックをEntityメソッドに抽出）
[ ] ビジネスルールの重複を避けている（共通化）
[ ] 非効率な実装を見つけたらリファクタリングしている
```
