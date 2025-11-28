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
    return {
      success: true,
      data: { /* output */ },
    };
  }
}
```

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
  readonly userRepository: UserRepository;  // ユーザー情報取得用
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
  return {
    success: false,
    error: new NotFoundError("プロジェクトが見つかりません"),
  };
}
```

### パターン2: 権限チェック

```typescript
// プロジェクトの所有者確認
if (project.userSub !== input.userSub) {
  return {
    success: false,
    error: new ForbiddenError("プロジェクトへのアクセス権限がありません"),
  };
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
  return {
    success: false,
    error: new ConflictError("このメールアドレスは既に登録されています"),
  };
}
```

### パターン4: 状態遷移ルール

```typescript
// TODOのステータス遷移ルール検証
if (currentStatus === "COMPLETED" && newStatus === "PENDING") {
  return {
    success: false,
    error: new ValidationError("完了済みTODOを未完了に戻すことはできません"),
  };
}
```

## ドメインモデルとの関係

**参照**: `15-domain-model-interaction.md`

UseCase実装時は、常にドメインメソッドの追加・改修を検討し、ドメインモデル貧血症を防ぐ。

- エンティティ操作パターン（新規作成、更新）
- `reconstruct()` vs 個別メソッドの使い分け
- Value Objectエラーの変換
- ドメインメソッド追加のタイミング

## Result型の伝播パターン

### 早期リターンパターン

```typescript
// リポジトリ操作の結果チェック
const findResult = await this.#props.todoRepository.findById({ id: input.todoId });
if (!findResult.success) {
  return findResult;  // エラーをそのまま伝播
}

// undefinedチェック（NotFoundError）
if (findResult.data === undefined) {
  return {
    success: false,
    error: new NotFoundError("TODOが見つかりません"),
  };
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

    return { success: true, data: undefined };
  } catch (error) {
    // 失敗時は自動rollback済み
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    return { success: false, error: new UnexpectedError() };
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
  return {
    success: false,
    error: findResult.error,
  };
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

| 場面 | ログレベル | 例 |
|------|----------|-----|
| ビジネスルール違反 | debug | `"権限チェック失敗"` + 詳細 |
| リソース未検出 | debug | `"プロジェクトが見つかりません"` + ID |
| Value Object生成失敗 | debug | `"カラー値が不正"` + 入力値 |
| 予期しないエラー | error | `"予期しないエラー"` + スタックトレース |
| リポジトリエラー | error | リポジトリ層でログ出力済み（伝播のみ） |

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

## PATCH更新時のマージロジック

**参照**: `15-domain-model-interaction.md` - Entity操作パターン

OpenAPIでPATCH更新を定義する場合、部分更新をサポートするためにUseCase層でマージロジックを実施する。

### 実装フロー

1. Handler層でZodバリデーション（部分的なフィールドのみ）
2. UseCase層で既存Entityを取得
3. UseCase層で変更されたフィールドのみValue Object生成
4. UseCase層でマージロジック実施（`input.field ?? existing.field`）
5. Entity.reconstruct()に全フィールドを渡す

### 実装例

```typescript
// PATCH更新のユースケース実装
async execute(input: UpdateTodoUseCaseInput): Promise<Result> {
  // 1. 既存Entity取得
  const existingResult = await this.#props.todoRepository.findById({
    id: input.todoId,
  });
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: new NotFoundError() };
  }
  const existing = existingResult.data;

  // 2. 権限チェック
  if (existing.userSub !== input.userSub) {
    return { success: false, error: new ForbiddenError() };
  }

  // 3. 変更されたフィールドのみValue Object生成
  let title = existing.title;
  if (input.title !== undefined) {
    const titleResult = TodoTitle.fromString(input.title);
    if (!titleResult.success) return titleResult;
    title = titleResult.data;
  }

  let status = existing.status;
  if (input.status !== undefined) {
    const statusResult = TodoStatus.fromString(input.status);
    if (!statusResult.success) return statusResult;
    status = statusResult.data;
  }

  // 4. マージロジック実施（プリミティブフィールド）
  const description = input.description !== undefined
    ? input.description
    : existing.description;

  // 5. Entity.reconstruct()に全フィールドを渡す
  const updated = Todo.reconstruct({
    id: existing.id,
    title,              // マージ済み
    description,        // マージ済み
    status,             // マージ済み
    userSub: existing.userSub,     // 変更不可
    createdAt: existing.createdAt, // 変更不可
    updatedAt: dateToIsoString(this.#props.fetchNow()),
  });

  // 6. 保存
  const saveResult = await this.#props.todoRepository.save({ todo: updated });
  if (!saveResult.success) {
    return saveResult;
  }

  return { success: true, data: updated };
}
```

**重要**:
- `??`演算子はプリミティブ型フィールドのマージに使用
- Value Objectフィールドは個別に生成・検証してからマージ
- reconstruct()は常に全フィールドを受け取る（部分的な引数は不可）

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
  return {
    success: false,
    error: colorResult.error,
  };
}

// 時刻取得の注入
const now = dateToIsoString(this.#props.fetchNow());
createdAt: now

// PATCH更新時: マージロジック実施後に全フィールドを渡す
let title = existing.title;
if (input.title !== undefined) {
  const titleResult = TodoTitle.fromString(input.title);
  if (!titleResult.success) return titleResult;
  title = titleResult.data;
}

const description = input.description !== undefined
  ? input.description
  : existing.description;

const updated = Todo.reconstruct({
  id: existing.id,
  title,              // マージ済み
  description,        // マージ済み
  status: existing.status,
  userSub: existing.userSub,     // 変更不可
  createdAt: existing.createdAt, // 変更不可
  updatedAt: now,
});
```

### ❌ Bad

```typescript
// Props型でreadonlyなし
export type CreateProjectUseCaseProps = {
  projectRepository: ProjectRepository;  // ❌ mutable
};

// Result型をチェックせずdata参照
const findResult = await this.#props.projectRepository.findById({ id });
const project = findResult.data;  // ❌ errorの可能性

// 例外を投げる
if (!colorResult.success) {
  throw colorResult.error;  // ❌ Result型で返すべき
}

// 直接Date生成
createdAt: new Date().toISOString()  // ❌ テスト不可能
updatedAt: this.#props.fetchNow().toISOString()  // ❌ dateToIsoString()を使用すべき

// HTTPリクエスト処理
if (c.req.header("Authorization") === undefined) {  // ❌ Handler層の責務
  return { success: false, error: new ForbiddenError() };
}

// 型レベルバリデーション（MECE原則違反）
if (input.name.length === 0) {  // ❌ Handler層（Zod）で検証済み
  return { success: false, error: new ValidationError() };
}

// ドメインルール検証（MECE原則違反）
if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) {  // ❌ Domain層（Value Object）で検証済み
  return { success: false, error: new ValidationError() };
}

// reconstruct()にマージロジックを含める
const updatedTodo = Todo.reconstruct({
  id: existing.id,
  title: input.title ?? existing.title,  // ❌ reconstruct()外でマージすべき
  description: input.description ?? existing.description,
  status: input.status ?? existing.status,
  // ...
});
// 理由: reconstruct()は全フィールド受け取りが前提
// マージロジックは呼び出し側（UseCase層）で実施する

// レスポンス変換
return {
  success: true,
  data: {
    id: project.id,
    name: project.name,
    color: project.color.value,  // ❌ Handler層の責務
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
[ ] PATCH更新時はUseCase層でマージロジック実施（reconstruct()外で）
[ ] reconstruct()には全フィールドを渡す（マージ済み）
[ ] 不変条件検証（Aggregate全体を見て判定）
[ ] リポジトリ操作のResult型チェック
[ ] 適切なログ出力（debug/error）
[ ] 例外を投げない（Result型返却）
[ ] 時刻取得はfetchNowを使用（dateToIsoString()で変換）
```
