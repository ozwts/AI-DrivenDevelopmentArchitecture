# ユースケース実装パターン

## 核心原則

ユースケースは**executeメソッドで全体の流れを書き切り**、**プライベートメソッドに分割しない**。

## 基本実装テンプレート

```typescript
export type {Action}{Entity}UseCaseProps = {
  readonly {entity}Repository: {Entity}Repository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

export class {Action}{Entity}UseCaseImpl implements {Action}{Entity}UseCase {
  readonly #props: {Action}{Entity}UseCaseProps;

  constructor(props: {Action}{Entity}UseCaseProps) {
    this.#props = props;
  }

  async execute(
    input: {Action}{Entity}UseCaseInput,
  ): Promise<{Action}{Entity}UseCaseResult> {
    const { {entity}Repository, logger, fetchNow } = this.#props;

    // 1. ビジネスルール検証（DB参照を伴う場合）

    // 2. Value Object生成

    // 3. エンティティの取得・操作

    // 4. リポジトリ操作
    const saveResult = await {entity}Repository.save({ {entity} });
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

### 複雑になる場合の対処法

executeメソッドが長くなる場合は、**ドメインモデルのメソッドに抽出**する。

**参照**: `20-refactoring-overview.md` - 貧血症防止

## Props型の設計

```typescript
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};
```

**原則**:

- すべてのプロパティを `readonly` にする
- 必要な依存のみを含める
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

UseCase層は**データベース参照を伴うビジネスルール**のみを検証する。

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

## Result型の伝播パターン

### 早期リターンパターン

```typescript
const findResult = await this.#props.todoRepository.findById({
  id: input.todoId,
});
if (!findResult.success) {
  return findResult; // エラーをそのまま伝播
}

if (findResult.data === undefined) {
  return Result.err(new NotFoundError("TODOが見つかりません"));
}

const todo = findResult.data;
```

**重要**: リポジトリのResult型エラーはそのまま伝播させる（新しいエラーで包まない）

### メソッドチェーンパターン

```typescript
// Result.then()はEntity/Result両方を透過的に扱える
const result = Result.ok(todo)
  .then((t) => t.clarify(description, now))
  .then((t) => t.reschedule(dueDate, now))
  .then((t) => t.complete(completedAt, now));

if (!result.success) {
  return result;
}
```

**重要**: `Result.then()`はEntityを返すと自動で`Result.ok()`に包むため、UseCase側では戻り値の型を意識せずにチェーンできる。

## PATCH更新パターン

OpenAPIでPATCH更新を定義する場合、Handler層で`'in'`演算子を使用して3値を区別し、UseCase層で個別メソッドチェーンで更新する。

### 実装フロー

1. **OpenAPI層**: `nullable: true`で`null`を許可（フィールドクリア用）
2. **Handler層**: `'in'`演算子で3値区別、`null` → `undefined`変換
3. **UseCase層**: 送られたフィールドのみ個別メソッドで更新（メソッドチェーン）
4. **Entity層**: `undefined`のみ扱う（`null`は使用しない）

### 3値の区別

| クライアント送信 | JSON                        | UseCase層での判定              | 意味       |
| ---------------- | --------------------------- | ------------------------------ | ---------- |
| フィールド省略   | `{}`                        | `'dueDate' in input === false` | 変更しない |
| `null`送信       | `{"dueDate": null}`         | `input.dueDate === undefined`  | クリアする |
| 値送信           | `{"dueDate": "2025-01-01"}` | `input.dueDate === "2025-...`  | 値を設定   |

### 実装例

```typescript
async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoResult> {
  // 1. 既存Entity取得・権限チェック
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return Result.err(new NotFoundError());
  }
  const existing = existingResult.data;

  if (existing.userSub !== input.userSub) {
    return Result.err(new ForbiddenError());
  }

  // 2. Result.then()によるメソッドチェーン
  const now = dateToIsoString(this.#props.fetchNow());

  const updatedResult = Result.ok(existing)
    .then(t => 'title' in input
      ? TodoTitle.from({ title: input.title })
          .then(title => t.rename(title, now))
      : t
    )
    .then(t => 'dueDate' in input
      ? t.reschedule(input.dueDate, now)
      : t
    )
    .then(t => 'description' in input
      ? t.clarify(input.description, now)
      : t
    );

  if (!updatedResult.success) {
    return updatedResult;
  }

  // 3. 永続化（Entity組成とsaveは分離）
  const saveResult = await this.#props.todoRepository.save({
    todo: updatedResult.data,
  });
  if (!saveResult.success) {
    return saveResult;
  }

  return Result.ok({ todo: updatedResult.data });
}
```

**重要なポイント**:

1. **Result.then()の自動変換**: Entityを返すと自動で`Result.ok()`に包まれる
2. **'in'演算子**: フィールド存在確認（Handler層で送られたか判定）
3. **null不使用**: TypeScript内部は`undefined`のみ
4. **Entity組成とsaveは分離**: メソッドチェーンでEntity組成後、別ステップで永続化

## トランザクション管理

### Unit of Workパターン

複数のリポジトリ操作を1つのトランザクションで実行する場合、Unit of Work Runnerを使用する。

```typescript
export type DeleteProjectUoWContext = {
  projectRepository: ProjectRepository;
  todoRepository: TodoRepository;
};

export type DeleteProjectUseCaseProps = {
  readonly logger: Logger;
  readonly uowRunner: UnitOfWorkRunner<DeleteProjectUoWContext>;
};

async execute(input: Input): Promise<Result> {
  try {
    await this.#uowRunner.run(async (uow) => {
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
    if (error instanceof DomainError) return Result.err(error);
    if (error instanceof NotFoundError) return Result.err(error);
    if (error instanceof ForbiddenError) return Result.err(error);
    return Result.err(new UnexpectedError());
  }
}
```

**重要**:

- UoW内では例外をthrowし、外側のcatchでResult型に変換
- ユースケースごとにUoWContext型を定義
- 単一リポジトリ操作の場合はUnit of Work不要

## 時刻取得パターン

```typescript
import { dateToIsoString } from "@/util/date-util";

const now = dateToIsoString(this.#props.fetchNow());

// Entity.from()でインスタンス生成
const projectResult = Project.from({
  // ...
  createdAt: now,
  updatedAt: now,
});
if (!projectResult.success) {
  return projectResult;
}
const project = projectResult.data;
```

**重要**: `fetchNow()` は `Date` を返し、必ず `dateToIsoString()` でISO 8601文字列に変換する

**禁止**: `fetchNow().toISOString()`を直接使用しない（UTCになりJSTにならない）

## DIコンテナ登録パターン

```typescript
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

## Do / Don't

### ✅ Good

```typescript
// executeメソッドで書き切る
export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
  async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
    const { projectRepository, fetchNow } = this.#props;

    const projectId = projectRepository.projectId();
    const now = dateToIsoString(fetchNow());

    const colorResult = ProjectColor.from({ value: input.color });
    if (!colorResult.success) {
      return Result.err(colorResult.error);
    }

    // Entity.from()でインスタンス生成（privateコンストラクタ）
    const projectResult = Project.from({
      id: projectId,
      name: input.name,
      color: colorResult.data,
      createdAt: now,
      updatedAt: now,
    });
    if (!projectResult.success) {
      return Result.err(projectResult.error);
    }

    const saveResult = await projectRepository.save({ project: projectResult.data });
    if (!saveResult.success) {
      return Result.err(saveResult.error);
    }

    return Result.ok({ project: projectResult.data });
  }
}

// Props型でreadonly指定
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// PATCH更新: 'in'演算子でフィールド存在確認
.then(t => 'dueDate' in input
  ? t.reschedule(input.dueDate, now)
  : t
)
```

### ❌ Bad

```typescript
// プライベートメソッドで分割
export class CreateProjectUseCaseImpl {
  async execute(input: CreateProjectUseCaseInput) {
    const colorResult = await this.#validateColor(input.color);  // ❌
    const project = this.#createProjectEntity(input, colorResult.data);  // ❌
    return await this.#saveProject(project);  // ❌
  }

  async #validateColor(color: string) { ... }  // ❌
  #createProjectEntity(input, color) { ... }  // ❌
  async #saveProject(project) { ... }  // ❌
}

// readonlyなし
export type CreateProjectUseCaseProps = {
  projectRepository: ProjectRepository; // ❌
};

// 直接Date生成
createdAt: new Date().toISOString(); // ❌ テスト不可能

// !== undefinedでフィールド存在チェック
if (input.title !== undefined) {  // ❌ 'in'演算子を使うべき
  updated = updated.rename(input.title, now);
}
```
