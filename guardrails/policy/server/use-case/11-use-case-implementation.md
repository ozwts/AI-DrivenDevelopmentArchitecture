# ユースケース実装パターン

## 核心原則

ユースケースは**executeメソッドで全体の流れを書き切り**、**プライベートメソッドに分割しない**。

## 基本実装テンプレート

```typescript
import { Result } from "@/util/result";
import type { UseCase } from "@/use-case/interfaces";

// Input型
export type {Action}{Entity}UseCaseInput = {
  // 入力パラメータ
};

// Output型（純粋なデータ型）
export type {Action}{Entity}UseCaseOutput = {Entity};

// Exception型
export type {Action}{Entity}UseCaseException =
  | DomainError
  | NotFoundError
  | UnexpectedError;

// Result型（Output と Exception を Result でラップ）
export type {Action}{Entity}UseCaseResult = Result<
  {Action}{Entity}UseCaseOutput,
  {Action}{Entity}UseCaseException
>;

// Props型（すべてreadonly）
export type {Action}{Entity}UseCaseProps = {
  readonly {entity}Repository: {Entity}Repository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// インターフェース定義（必ずUseCase型を使用）
export type {Action}{Entity}UseCase = UseCase<
  {Action}{Entity}UseCaseInput,
  {Action}{Entity}UseCaseOutput,
  {Action}{Entity}UseCaseException
>;

// 実装クラス（必ずインターフェースをimplements）
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

**必須要件**:

1. `Result` 型を `@/util/result` からインポート
2. `xxxUseCaseResult` 型を `Result<Output, Exception>` で定義
3. インターフェースは `UseCase<TInput, TOutput, TException>` を使用して定義
4. 実装クラスは必ずインターフェースを `implements` する
5. Props型のすべてのプロパティは `readonly` にする

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

### 型ガードによるエラーチェック

Result型は `isOk()` / `isErr()` 型ガードメソッドを提供する。これにより、エラーチェック後に `data` / `error` プロパティへの安全なアクセスが可能になる。

```typescript
const findResult = await todoRepository.findById({ id: input.todoId });

// 型ガードでエラーチェック
if (findResult.isErr()) {
  // findResult.error は E 型として推論される（非nullアサーション不要）
  return Result.err(findResult.error);
}

// findResult.data は T 型として推論される
const todo = findResult.data;
```

**型ガードの利点**:

- **型安全性**: `isErr()` 後は `error` が必ず存在、`isOk()` 後は `data` が必ず存在
- **非nullアサーション不要**: `result.error!` のような `!` が不要
- **コード可読性**: 意図が明確になる

### 早期リターンパターン

```typescript
const findResult = await this.#props.todoRepository.findById({
  id: input.todoId,
});
if (findResult.isErr()) {
  return Result.err(findResult.error); // エラーをそのまま伝播
}

if (findResult.data === undefined) {
  return Result.err(new NotFoundError("TODOが見つかりません"));
}

const todo = findResult.data;
```

**重要**: リポジトリのResult型エラーはそのまま伝播させる（新しいエラーで包まない）

### メソッドチェーンパターン

```typescript
// Result.map()はEntity/Result両方を透過的に扱える
const result = Result.ok(todo)
  .map((t) => t.clarify(description, now))
  .map((t) => t.reschedule(dueDate, now))
  .map((t) => t.complete(now));

if (result.isErr()) {
  return result;
}
```

**重要**: `Result.map()`はEntityを返すと自動で`Result.ok()`に包むため、UseCase側では戻り値の型を意識せずにチェーンできる。

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
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (existingResult.isErr()) {
    return Result.err(existingResult.error);
  }
  if (existingResult.data === undefined) {
    return Result.err(new NotFoundError("TODOが見つかりません"));
  }
  const existing = existingResult.data;

  // 2. Result.map()によるメソッドチェーン
  const now = dateToIsoString(this.#props.fetchNow());

  const updatedResult = Result.ok(existing)
    // Tier 1: クリア不可（'in' && !== undefined）
    .map((t: Todo) =>
      "title" in input && input.title !== undefined
        ? t.retitle(input.title, now)
        : t,
    )
    // Tier 2: undefinedでクリア可（'in' のみ）
    .map((t: Todo) =>
      "dueDate" in input ? t.reschedule(input.dueDate, now) : t,
    )
    // Tier 3: undefinedでクリア可（'in' のみ）
    .map((t: Todo) =>
      "description" in input ? t.clarify(input.description, now) : t,
    );

  if (updatedResult.isErr()) {
    return updatedResult;
  }

  // 3. 永続化（Entity組成とsaveは分離）
  const saveResult = await this.#props.todoRepository.save({
    todo: updatedResult.data,
  });
  if (saveResult.isErr()) {
    return Result.err(saveResult.error);
  }

  return Result.ok(updatedResult.data);
}
```

**重要なポイント**:

1. **Result.map()の自動変換**: Entityを返すと自動で`Result.ok()`に包まれる
2. **'in'演算子**: フィールド存在確認（Handler層で送られたか判定）
3. **Tierによる判定パターンの使い分け**（参照: `../domain-model/21-entity-field-classification.md`）:
   - **Tier 1（Required）**: `'in' && !== undefined` → クリア不可
   - **Tier 2（Special Case）**: `'in'` のみ → `undefined`でクリア可（業務上の意味あり）
   - **Tier 3（Optional）**: `'in'` のみ → `undefined`でクリア可
4. **null不使用**: TypeScript内部は`undefined`のみ（Handler層で`null` → `undefined`変換済み）
5. **Entity組成とsaveは分離**: メソッドチェーンでEntity組成後、別ステップで永続化

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
  const { logger, uowRunner } = this.#props;

  // Unit of Work内でトランザクション実行（Result型で返す）
  return uowRunner.run(async (uow) => {
    const findResult = await uow.projectRepository.findById({ id: input.id });
    if (!findResult.success) {
      return findResult;  // エラーはResult型でそのまま返す → 自動rollback
    }

    if (findResult.data === undefined) {
      return Result.err(new NotFoundError("プロジェクトが見つかりません"));
    }

    const removeResult = await uow.todoRepository.remove({ id: todoId });
    if (!removeResult.success) {
      return removeResult;  // エラーはResult型でそのまま返す → 自動rollback
    }

    // 成功時は自動commit
    return Result.ok(undefined);
  });
}
```

**重要**:

- **throwを使用しない**: Result型でエラーを返す（UseCase層の原則と統一）
- UoWRunner内部でResult.err()の場合は自動rollback、Result.ok()の場合は自動commit
- ユースケースごとにUoWContext型を定義
- 単一リポジトリ操作の場合はUnit of Work不要

## 時刻取得パターン

```typescript
import { dateToIsoString } from "@/util/date-util";

const now = dateToIsoString(this.#props.fetchNow());

// Entity.from()でインスタンス生成（直接Entityを返す）
const newProject = Project.from({
  // ...
  createdAt: now,
  updatedAt: now,
});
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

    // Entity.from()でインスタンス生成（直接Entityを返す）
    const newProject = Project.from({
      id: projectId,
      name: input.name,
      color: input.color,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    });

    const saveResult = await projectRepository.save({ project: newProject });
    if (saveResult.isErr()) {
      return Result.err(saveResult.error);
    }

    return Result.ok(newProject);
  }
}

// Props型でreadonly指定
export type CreateProjectUseCaseProps = {
  readonly projectRepository: ProjectRepository;
  readonly logger: Logger;
  readonly fetchNow: FetchNow;
};

// PATCH更新: Result.map()でメソッドチェーン、'in'演算子でフィールド存在確認
.map((t: Todo) =>
  "dueDate" in input ? t.reschedule(input.dueDate, now) : t,
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

// !== undefinedのみでフィールド存在チェック
if (input.title !== undefined) {  // ❌ 'in'演算子を使うべき
  updated = updated.rename(input.title, now);
}

// Result.then()を使用（thenable問題）
.then(t => 'dueDate' in input  // ❌ thenはTypeScriptでthenable扱いされる
  ? t.reschedule(input.dueDate, now)
  : t
)
```
