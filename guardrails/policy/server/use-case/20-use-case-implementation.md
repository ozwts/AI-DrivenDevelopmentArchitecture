# ユースケース実装パターン

## 核心原則

ユースケースは**単一のビジネスアクションを実行**し、**Result型で明示的に成功/失敗を返却**する。

## 基本実装テンプレート

```typescript
export type {Action}{Entity}UseCaseProps = {
  readonly {entity}Repository: {Entity}Repository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export class {Action}{Entity}UseCaseImpl
  implements {Action}{Entity}UseCase
{
  readonly #props: {Action}{Entity}UseCaseProps;

  constructor(props: {Action}{Entity}UseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: {Action}{Entity}UseCaseInput,
  ): Promise<{Action}{Entity}UseCaseResult> {
    const { logger } = this.#props;

    // 1. 入力値の正規化・前処理

    // 2. ビジネスルール検証（DB参照を伴う場合）

    // 3. エンティティの取得・操作

    // 4. リポジトリ操作
    const saveResult = await this.#props.{entity}Repository.save(entity);
    if (!saveResult.success) {
      return saveResult;
    }

    // 5. 成功レスポンス返却
    return Result.ok({ /* output */ });
  }
}
```

## executeメソッドの実装原則

### プライベートメソッドを作らない

**原則**: executeメソッド内で全体の流れを書き切り、プライベートメソッドに分割しない。

**理由**:

- **全体像の把握**: executeメソッドを読むだけでユースケース全体の流れが理解できる
- **追跡容易性**: ロジックが一箇所に集約され、デバッグ・修正が容易
- **単一責任原則**: 1ユースケース = 1ユーザーアクション = 1メソッド
- **AI支援の恩恵**: LLMがexecuteメソッド全体を一度に理解・修正可能

### ✅ Good: executeメソッドで書き切る

```typescript
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    const { projectRepository, logger, fetchNow } = this.#props;

    // 1. ID・時刻生成
    const projectId = projectRepository.projectId();
    const now = fetchNow();

    // 2. Value Object生成
    const colorResult = ProjectColor.from({ value: input.color });
    if (!colorResult.success) {
      logger.warn("プロジェクト色のバリデーションエラー", {
        color: input.color,
      });
      return Result.err(colorResult.error);
    }

    // 3. Entity生成
    const project = new Project({
      id: projectId,
      name: input.name,
      description: input.description,
      color: colorResult.data,
      createdAt: now,
      updatedAt: now,
    });

    // 4. 永続化
    const saveResult = await projectRepository.save({ project });
    if (!saveResult.success) {
      logger.error("プロジェクト保存エラー", {
        projectId,
        error: saveResult.error,
      });
      return Result.err(saveResult.error);
    }

    logger.info("プロジェクト作成成功", { projectId });
    return Result.ok({ project });
  }
}
```

### ❌ Bad: プライベートメソッドで分割

```typescript
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  async execute(
    input: CreateProjectUseCaseInput,
  ): Promise<CreateProjectUseCaseResult> {
    // ❌ executeメソッドだけ見ても全体像が分からない
    const colorResult = await this.#validateColor(input.color);
    if (!colorResult.success) {
      return Result.err(colorResult.error);
    }

    const project = this.#createProjectEntity(input, colorResult.data);
    return await this.#saveProject(project);
  }

  // ❌ プライベートメソッドに分割すると、各メソッドを追いかける必要がある
  async #validateColor(
    color: string,
  ): Promise<Result<ProjectColor, DomainError>> {
    const colorResult = ProjectColor.from({ value: color });
    if (!colorResult.success) {
      this.#props.logger.warn("プロジェクト色のバリデーションエラー", {
        color,
      });
    }
    return colorResult;
  }

  #createProjectEntity(
    input: CreateProjectUseCaseInput,
    color: ProjectColor,
  ): Project {
    const projectId = this.#props.projectRepository.projectId();
    const now = this.#props.fetchNow();
    return new Project({
      id: projectId,
      name: input.name,
      description: input.description,
      color,
      createdAt: now,
      updatedAt: now,
    });
  }

  async #saveProject(project: Project): Promise<CreateProjectUseCaseResult> {
    const saveResult = await this.#props.projectRepository.save({ project });
    if (!saveResult.success) {
      this.#props.logger.error("プロジェクト保存エラー", {
        projectId: project.id,
        error: saveResult.error,
      });
      return Result.err(saveResult.error);
    }

    this.#props.logger.info("プロジェクト作成成功", { projectId: project.id });
    return Result.ok({ project });
  }
}
```

### 複雑になる場合の対処法

**executeメソッドが長くなる場合**: ドメインモデルのメソッドに抽出する

```typescript
// ❌ Bad: UseCase内で複雑なステータス遷移ロジックを実装
export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
    const existingTodo = /* ... */;

    // ❌ ステータス遷移ロジックがUseCase内に記述されている
    if (existingTodo.status === "COMPLETED" && input.status !== "COMPLETED") {
      return Result.err(new DomainError("完了済みTODOのステータスは変更できません"));
    }
    if (input.status === "COMPLETED" && !existingTodo.dueDate) {
      return Result.err(new DomainError("期限のないTODOは完了できません"));
    }

    const updatedTodo = existingTodo.updateStatus(input.status);
    // ...
  }
}

// ✅ Good: ドメインモデルのメソッドに抽出
export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
  async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
    const { todoRepository, fetchNow } = this.#props;

    const existingTodoResult = await todoRepository.findById({ id: input.todoId });
    if (!existingTodoResult.success || !existingTodoResult.data) {
      return Result.err(new NotFoundError("TODOが見つかりません"));
    }

    const statusResult = TodoStatus.from({ value: input.status });
    if (!statusResult.success) {
      return Result.err(statusResult.error);
    }

    // ✅ ステータス遷移ロジックはEntityメソッドに委譲
    const updatedTodoResult = existingTodoResult.data.changeStatus(statusResult.data, fetchNow());
    if (!updatedTodoResult.success) {
      return Result.err(updatedTodoResult.error);
    }

    const saveResult = await todoRepository.save({ todo: updatedTodoResult.data });
    if (!saveResult.success) {
      return Result.err(saveResult.error);
    }

    return Result.ok({ todo: updatedTodoResult.data });
  }
}

// Todo Entity
export class Todo {
  changeStatus(newStatus: TodoStatus, updatedAt: string): Result<Todo, DomainError> {
    // ✅ ステータス遷移ロジックはEntity内に集約
    const canTransitionResult = this.status.canTransitionTo(newStatus);
    if (!canTransitionResult.success) {
      return canTransitionResult;
    }

    if (newStatus.isCompleted() && this.dueDate === undefined) {
      return Result.err(new DomainError("期限のないTODOは完了できません"));
    }

    return Result.ok(new Todo({ ...this, status: newStatus, updatedAt }));
  }
}
```

**ポイント**:

- **UseCase層**: オーケストレーション（リポジトリ呼び出し、Entity操作の組み合わせ）
- **Domain層**: ビジネスロジック（ステータス遷移、不変条件チェック）
- プライベートメソッドではなく、ドメインメソッドに抽出することで、他のユースケースでも再利用可能

## Props型の設計

### 基本パターン

```typescript
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};
```

**原則**:

- すべてのプロパティを `readonly` にする
- 必要な依存のみを含める（Logger、fetchNowは必須ではない）
- 具象型ではなくインターフェース型を指定（DIコンテナで注入）

### 複数リポジトリパターン（非トランザクション）

```typescript
export type RegisterTodoUseCaseProps = {
  readonly todoRepository: TodoRepository;
  readonly userRepository: UserRepository; // ユーザー情報取得用
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};
```

**注**: 複数リポジトリをトランザクションで操作する場合は、Unit of Work Runnerを使用

## ビジネスルール検証パターン

**参照**: `guardrails/constitution/validation-principles.md` - 第3階層：ビジネスルール

UseCase層は**データベース参照を伴うビジネスルール**のみを検証する。型レベル検証（Handler層）・ドメインルール検証（Domain層）は実施しない（MECE原則）。

### パターン1: リソース存在確認

```typescript
const projectResult = await this.#props.projectRepository.findById({
  id: input.projectId,
});

if (!projectResult.success) {
  return projectResult;
}

if (projectResult.data === undefined) {
  return Result.err(new NotFoundError("プロジェクトが見つかりません"));
}
```

### パターン2: 権限チェック

```typescript
// プロジェクトの所有者確認
if (project.userSub !== input.userSub) {
  return Result.err(
    new ForbiddenError("プロジェクトへのアクセス権限がありません"),
  );
}
```

### パターン3: 重複チェック

```typescript
const existingResult = await this.#props.userRepository.findByEmail({
  email: input.email,
});

if (!existingResult.success) {
  return existingResult;
}

if (existingResult.data !== undefined) {
  return Result.err(
    new ConflictError("このメールアドレスは既に登録されています"),
  );
}
```

### パターン4: 状態遷移ルール

```typescript
// TODOのステータス遷移ルール検証
if (currentStatus === "COMPLETED" && newStatus === "PENDING") {
  return Result.err(
    new DomainError("完了済みTODOを未完了に戻すことはできません"),
  );
}
```

## ドメインモデルとの関係

**参照**: `15-domain-model-interaction.md`

UseCase実装時は、常にドメインメソッドの追加・改修を検討し、ドメインモデル貧血症を防ぐ。

- エンティティ操作パターン（新規作成、PATCH更新、ビジネスメソッド）
- 個別メソッドによる更新（Result.then()メソッドチェーン）
- Value Objectエラーの変換
- ドメインメソッド追加のタイミング

## Result型の伝播パターン

### 早期リターンパターン

```typescript
// リポジトリ操作の結果チェック
const findResult = await this.#props.todoRepository.findById({
  id: input.todoId,
});
if (!findResult.success) {
  return findResult; // エラーをそのまま伝播
}

// undefinedチェック（NotFoundError）
if (findResult.data === undefined) {
  return Result.err(new NotFoundError("TODOが見つかりません"));
}

const todo = findResult.data;
```

**重要**: リポジトリのResult型エラーはそのまま伝播させる（新しいエラーで包まない）

## トランザクション管理

### Unit of Workパターン

複数のリポジトリ操作を1つのトランザクションで実行する場合、Unit of Work Runnerを使用する。

```typescript
// UoWContext定義（ユースケースごと）
export type DeleteProjectUoWContext = {
  projectRepository: ProjectRepository;
  todoRepository: TodoRepository;
};

export type DeleteProjectUseCaseProps = {
  readonly logger: Logger;
  readonly uowRunner: UnitOfWorkRunner<DeleteProjectUoWContext>;
};

// 実装例
async execute(input: Input): Promise<Result> {
  try {
    await this.#uowRunner.run(async (uow) => {
      // トランザクション内の操作
      const findResult = await uow.projectRepository.findById({ id });
      if (!findResult.success) {
        throw findResult.error;  // エラーは例外でスロー
      }

      const removeResult = await uow.todoRepository.remove({ id: todoId });
      if (!removeResult.success) {
        throw removeResult.error;
      }

      // 成功時は自動commit
    });

    return Result.ok(undefined);
  } catch (error) {
    // 失敗時は自動rollback済み
    if (error instanceof DomainError) {
      return Result.err(error);
    }
    if (error instanceof NotFoundError) {
      return Result.err(error);
    }
    if (error instanceof ForbiddenError) {
      return Result.err(error);
    }
    return Result.err(new UnexpectedError());
  }
}
```

**重要**:

- UoW内では例外をthrowし、外側のcatchでResult型に変換
- ユースケースごとにUoWContext型を定義
- 成功時は自動commit、失敗時は自動rollback

**注**: 単一リポジトリ操作の場合はUnit of Work不要（リポジトリ内でトランザクション管理）

## エラーハンドリングパターン

### 予期しないエラーの処理

```typescript
// リポジトリエラーの伝播
const findResult = await this.#props.userRepository.findBySub({ sub: userSub });
if (!findResult.success) {
  this.#props.logger.error("ユーザー情報の取得に失敗", findResult.error);
  return Result.err(findResult.error);
}
```

## 時刻取得パターン

```typescript
export type FetchNow = () => Date;

// 使用例
import { dateToIsoString } from "@/util/date-util";

const now = dateToIsoString(this.#props.fetchNow());

const project = new Project({
  // ...
  createdAt: now,
  updatedAt: now,
});
```

**重要**: `fetchNow()` は `Date` を返し、必ず `dateToIsoString()` でISO 8601文字列に変換する

**dateToIsoStringを使う理由**:

1. **JSTタイムゾーン適用**: dayjs内部で`tz("Asia/Tokyo")`が適用され、タイムゾーンオフセット`+09:00`付きで統一
2. **標準フォーマット**: `YYYY-MM-DDTHH:mm:ss.SSSZ`形式に統一（ミリ秒とタイムゾーンオフセット含む）
3. **テスト容易性**: `fetchNow`をモック可能、タイムゾーンの一貫性保証

**禁止**: `fetchNow().toISOString()`を直接使用しない（UTCになりJSTにならない）

## ログ出力パターン

| 場面                 | ログレベル | 例                                      |
| -------------------- | ---------- | --------------------------------------- |
| ビジネスルール違反   | debug      | `"権限チェック失敗"` + 詳細             |
| リソース未検出       | debug      | `"プロジェクトが見つかりません"` + ID   |
| Value Object生成失敗 | debug      | `"カラー値が不正"` + 入力値             |
| 予期しないエラー     | error      | `"予期しないエラー"` + スタックトレース |
| リポジトリエラー     | error      | リポジトリ層でログ出力済み（伝播のみ）  |

## DIコンテナ登録パターン

```typescript
// init-handler.ts
container
  .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
  .toDynamicValue((context) => {
    return new CreateProjectUseCaseImpl({
      projectRepository: context.container.get(serviceId.PROJECT_REPOSITORY),
      logger: context.container.get(serviceId.LOGGER),
      fetchNow: context.container.get(serviceId.FETCH_NOW),
    });
  })
  .inSingletonScope();
```

## PATCH更新時の個別メソッド更新

**参照**: `15-domain-model-interaction.md` - Entity操作パターン

OpenAPIでPATCH更新を定義する場合、Handler層で`'in'`演算子を使用して3値（省略/null/値）を区別し、UseCase層で個別メソッドチェーンで更新する。

### 実装フロー

1. **OpenAPI層**: `nullable: true`で`null`を許可（フィールドクリア用）
2. **Handler層**: `'in'`演算子で3値区別、`null` → `undefined`変換
3. **UseCase層**: 送られたフィールドのみ個別メソッドで更新（メソッドチェーン）
4. **Entity層**: `undefined`のみ扱う（`null`は使用しない）

### 3値の区別（Handler層）

**参照**: `policy/server/handler/10-handler-overview.md` - null → undefined 変換パターン

| クライアント送信 | JSON                        | Handler層      | UseCase層                        | 意味       |
| ---------------- | --------------------------- | -------------- | -------------------------------- | ---------- |
| フィールド省略   | `{}`                        | プロパティなし | `'dueDate' in input === false`   | 変更しない |
| `null`送信       | `{"dueDate": null}`         | `undefined`    | `input.dueDate === undefined`    | クリアする |
| 値送信           | `{"dueDate": "2025-01-01"}` | 値そのまま     | `input.dueDate === "2025-01-01"` | 値を設定   |

### 実装例

```typescript
// PATCH更新のユースケース実装（メソッドチェーンパターン）
async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoResult> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return Result.err(new NotFoundError());
  }

  // 2. 権限チェック
  const existing = existingResult.data;
  if (existing.userSub !== input.userSub) {
    return Result.err(new ForbiddenError());
  }

  // 3. Result.then()によるメソッドチェーン（Entity組成）
  const now = dateToIsoString(this.#props.fetchNow());

  const updatedResult = Result.ok(existing)
    .then(t => 'title' in input
      ? TodoTitle.from({ title: input.title })
          .then(title => t.changeTitle(title, now))
      : t
    )
    .then(t => 'status' in input
      ? TodoStatus.from({ status: input.status })
          .then(status => t.changeStatus(status, now))
      : t
    )
    .then(t => 'dueDate' in input
      ? t.changeDueDate(input.dueDate, now)
      : t
    )
    .then(t => 'completedAt' in input
      ? t.changeCompletedAt(input.completedAt, now)
      : t
    )
    .then(t => 'description' in input
      ? t.changeDescription(input.description, now)
      : t
    )
    .then(t => 'memo' in input
      ? t.changeMemo(input.memo, now)
      : t
    );

  if (!updatedResult.success) {
    return updatedResult;
  }

  // 4. 永続化（Entity組成とsaveは分離）
  const saveResult = await this.#props.todoRepository.save({ todo: updatedResult.data });
  if (!saveResult.success) {
    return saveResult;
  }

  return Result.ok({ todo: updatedResult.data });
}
```

**重要なポイント**:

1. **Result.then()の自動変換**: Entityを返すと自動で`Result.ok()`に包まれる

   ```typescript
   .then(t => t.changeDueDate(input.dueDate, now))  // Todo返す → Result<Todo>に自動変換
   .then(t => t.changeStatus(status, now))          // Result<Todo>返す → そのまま
   ```

2. **'in'演算子**: フィールド存在確認（Handler層で送られたか判定）

   ```typescript
   .then(t => 'dueDate' in input
     ? t.changeDueDate(input.dueDate, now)
     : t  // 送られていない → 既存値のまま
   )
   ```

3. **null不使用**: TypeScript内部は`undefined`のみ（Handler層でnull→undefined変換済み）

   ```typescript
   // ✅ Good
   dueDate: string | undefined;

   // ❌ Bad
   dueDate: string | null | undefined;
   ```

4. **Entity組成とsaveは分離**: メソッドチェーンでEntity組成後、別ステップで永続化
   ```typescript
   // Entity組成
   const updatedResult = Result.ok(existing)
     .then(...)
     .then(...);

   if (!updatedResult.success) {
     return updatedResult;
   }

   // 永続化（別ステップ）
   const saveResult = await this.#props.todoRepository.save({ todo: updatedResult.data });
   ```

## Do / Don't

### ✅ Good

```typescript
// Props型でreadonly指定
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// Result型の早期リターン
const findResult = await this.#props.projectRepository.findById({ id });
if (!findResult.success) {
  return findResult;
}

// Value Objectエラーの適切な変換
const colorResult = ProjectColor.fromString(input.color);
if (!colorResult.success) {
  return Result.err(colorResult.error);
}

// 時刻取得の注入
const now = dateToIsoString(this.#props.fetchNow());
createdAt: now;

// PATCH更新時: Result.then()メソッドチェーン（Entity組成とsaveは分離）
const now = dateToIsoString(this.#props.fetchNow());

const updatedResult = Result.ok(existing)
  .then((t) =>
    "title" in input
      ? TodoTitle.from({ title: input.title }).then((title) =>
          t.changeTitle(title, now),
        )
      : t,
  )
  .then((t) =>
    "description" in input ? t.changeDescription(input.description, now) : t,
  )
  .then((t) =>
    "dueDate" in input
      ? t.changeDueDate(input.dueDate, now) // Handler層でnull→undefined変換済み
      : t,
  );

if (!updatedResult.success) {
  return updatedResult;
}

const saveResult = await this.#props.todoRepository.save({ todo: updatedResult.data });
if (!saveResult.success) {
  return saveResult;
}

return Result.ok({ todo: updatedResult.data });
```

### ❌ Bad

```typescript
// Props型でreadonlyなし
export type CreateProjectUseCaseProps = {
  projectRepository: ProjectRepository; // ❌ mutable
};

// Result型をチェックせずdata参照
const findResult = await this.#props.projectRepository.findById({ id });
const project = findResult.data; // ❌ errorの可能性

// 例外を投げる
if (!colorResult.success) {
  throw colorResult.error; // ❌ Result型で返すべき
}

// 直接Date生成
createdAt: new Date().toISOString(); // ❌ テスト不可能
updatedAt: this.#props.fetchNow().toISOString(); // ❌ dateToIsoString()を使用すべき

// HTTPリクエスト処理
if (c.req.header("Authorization") === undefined) {
  // ❌ Handler層の責務
  return { success: false, error: new ForbiddenError() };
}

// 型レベルバリデーション（MECE原則違反）
if (input.name.length === 0) {
  // ❌ Handler層（Zod）で検証済み
  return { success: false, error: new ValidationError() };
}

// ドメインルール検証（MECE原則違反）
if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
  // ❌ Domain層（Value Object）で検証済み
  return { success: false, error: new DomainError() };
}

// nullを使用（TypeScript内部）
if ("dueDate" in input) {
  updated = updated.changeDueDate(
    input.dueDate === null ? undefined : input.dueDate,
    now,
  );
  // ❌ Handler層でnull→undefined変換すべき
}

// !== undefinedでフィールド存在チェック（'in'演算子を使うべき）
if (input.title !== undefined) {
  // ❌ フィールド省略とundefined送信を区別できない
  updated = updated.changeTitle(input.title, now);
}

// letパターン（非推奨）
let updated = existing;
if ("title" in input) {
  const titleResult = TodoTitle.from({ title: input.title });
  if (!titleResult.success) return titleResult;
  updated = updated.changeTitle(titleResult.data, now);
}
// ❌ メソッドチェーンを使うべき

// レスポンス変換
return {
  success: true,
  data: {
    id: project.id,
    name: project.name,
    color: project.color.value, // ❌ Handler層の責務
  },
};
```

## チェックリスト

```
[ ] Props型定義（readonly指定）
[ ] 依存性の注入（リポジトリ、Logger、FetchNow）
[ ] ビジネスルール検証実装
[ ] Result型の早期リターン
[ ] Value Objectエラーの適切な変換
[ ] エンティティ操作（create/update）
[ ] PATCH更新時はResult.then()でメソッドチェーン
[ ] Entity組成とsaveは分離（メソッドチェーン内でsaveしない）
[ ] 'in'演算子でフィールド存在確認（送られたフィールドのみ処理）
[ ] 送られなかったフィールドは既存値のまま（三項演算子で分岐）
[ ] TypeScript内部ではundefinedのみ扱う（Handler層でnull→undefined変換済み）
[ ] 適切なログ出力（debug/error）
[ ] 例外を投げない（Result型返却）
[ ] 時刻取得はfetchNowを使用（dateToIsoString()で変換）
```
