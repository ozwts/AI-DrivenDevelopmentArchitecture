# ハンドラー実装パターン

## 核心原則

すべてのハンドラーは**統一された処理フロー**に従い、**単一のユースケースのみを呼び出す**。

## 基本実装テンプレート

```typescript
export const build{Action}{Entity}Handler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<UseCase>(serviceId.USE_CASE);

    try {
      // 1. リクエストパラメータ取得
      const param = c.req.param("id");
      const rawBody = await c.req.json();

      // 2. 入力バリデーション（Zod）
      const parseResult = schemas.RequestSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return c.json(
          { name: "ValidationError", message: formatZodError(parseResult.error) },
          400,
        );
      }

      // 3. ユースケース実行（単一）
      const result = await useCase.execute(parseResult.data);

      // 4. Result型チェック
      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // 5. レスポンス変換
      const responseData = convertTo{Entity}Response(result.data);

      // 6. 出力バリデーション（Zod）
      const responseParseResult = schemas.ResponseSchema.safeParse(responseData);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", {
          errors: responseParseResult.error.errors,
        });
        return c.json({ name: new UnexpectedError().name, ... }, 500);
      }

      // 7. HTTPレスポンス返却
      return c.json(responseParseResult.data, 200);
    } catch (error) {
      logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
      return c.json({ name: new UnexpectedError().name, ... }, 500);
    }
  };
```

## HTTPメソッド別の特徴

| HTTPメソッド  | ステータスコード | リクエストボディ | レスポンスボディ | 特記事項              |
| ------------- | ---------------- | ---------------- | ---------------- | --------------------- |
| POST（作成）  | 201 Created      | 必須             | エンティティ     | ConflictError対応     |
| GET（単一）   | 200 OK           | なし             | エンティティ     | undefinedチェック→404 |
| GET（リスト） | 200 OK           | なし             | 配列             | 空配列も正常系        |
| PUT（更新）   | 200 OK           | 必須             | エンティティ     | NotFoundError対応     |
| DELETE        | 204 No Content   | なし             | なし             | `c.body(null, 204)`   |

## レスポンス変換パターン

### 基本原則

**変換関数はプレゼンテーション層の関心事のみを扱う**

- **実施すること**: OpenAPIレスポンススキーマに合わせた変換
- **実施しないこと**: ビジネスロジック・ドメインルールの実装

### 変換関数の配置

```
hono-handler/
└── {entity}/
    ├── {entity}-router.ts
    ├── {action}-{entity}-handler.ts
    └── {entity}-response-mapper.ts       # レスポンス変換関数を配置
```

### 実装パターン

#### パターン1: 基本的な変換

```typescript
// project-response-mapper.ts
export const convertToProjectResponse = (
  project: Project,
): ProjectResponse => ({
  id: project.id,
  name: project.name,
  description: project.description,
  color: project.color.value, // Value Objectから値を取得
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});
```

#### パターン2: プレゼンテーション層のフィルタリング

```typescript
/**
 * OpenAPIレスポンス仕様:
 * - UPLOADEDステータスの添付ファイルのみを含める
 * - PREPAREDステータスは除外（アップロード未完了）
 */
export const convertToTodoResponse = (todo: Todo): TodoResponse => ({
  id: todo.id,
  title: todo.title,
  // OpenAPIで定義された表示ルールに基づくフィルタリング
  attachments: todo.attachments
    .filter((attachment) => attachment.status === "UPLOADED")
    .map((attachment) => convertToAttachmentResponse(todo.id, attachment)),
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
});
```

#### パターン3: ネストされたエンティティの変換

```typescript
export const convertToAttachmentResponse = (
  todoId: string,
  attachment: Attachment,
): AttachmentResponse => ({
  id: attachment.id,
  todoId, // 親IDを追加
  filename: attachment.fileName,
  contentType: attachment.contentType,
  size: attachment.fileSize,
  status: attachment.status,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});
```

### 変換関数の設計ガイドライン

#### ✅ 許可される操作

- **プロパティ名の変換**: `fileName` → `filename`（OpenAPI仕様に合わせる）
- **Value Objectからの値取得**: `color.value` → `"#FF5733"`
- **表示ルールによるフィルタリング**: OpenAPIで定義された条件（例：`status === "UPLOADED"`）
- **親子関係の明示**: 親IDの追加
- **配列のマッピング**: ネストされたエンティティの変換

#### ❌ 禁止される操作

- **ビジネスロジックの実装**: 権限チェック、状態遷移ルール
- **データベースアクセス**: リポジトリ呼び出し
- **複雑な計算**: 集計、統計処理
- **ドメインルールの実装**: エンティティの制約違反チェック

### 命名規則

```typescript
convertTo{Entity}Response(entity: {Entity}): {Entity}Response
```

**例**:

- `convertToProjectResponse`
- `convertToTodoResponse`
- `convertToUserResponse`
- `convertToAttachmentResponse`

## 認証パターン

### Current User（認証済みユーザー）

```typescript
const userSub = c.get(USER_SUB);

if (typeof userSub !== "string" || userSub === "") {
  logger.error("userSubがコンテキストに設定されていません");
  return c.json({ name: new UnexpectedError().name, ... }, 500);
}

const result = await useCase.execute({ sub: userSub });
```

**特徴**:

- コンテキストから取得（トークンから抽出済み）
- 型チェック必須
- パスパラメータではなくトークンベース

## 入力正規化パターン

### オプショナルIDの空文字列対応

```typescript
const parseResult = schemas.RegisterTodoParams.safeParse(rawBody);
if (!parseResult.success) {
  return c.json({ name: "ValidationError", ... }, 400);
}

const body = parseResult.data;

// 空文字列はundefinedに正規化
const projectId =
  body.projectId?.trim() === "" ? undefined : body.projectId;

const result = await useCase.execute({
  userSub,
  title: body.title,
  projectId,  // undefinedまたは有効なID
});
```

## 禁止パターン

### ❌ 複数ユースケースの呼び出し

```typescript
// ❌ Bad: ハンドラー内で複数ユースケースを連鎖実行
const updateResult = await updateUseCase.execute({ ... });
const getResult = await getUseCase.execute({ ... });  // 禁止

// ✅ Good: 単一ユースケースのみ
const result = await updateUseCase.execute({ ... });
// UseCaseが更新後のデータを返す設計にする
```

### ❌ ハンドラーでのビジネスロジック

```typescript
// ❌ Bad
if (rawBody.color === "#000000") {
  return c.json(
    { name: "ValidationError", message: "黒は使用できません" },
    400,
  );
}

// ✅ Good: UseCaseまたはValue Objectで実装
const result = await useCase.execute({ color: rawBody.color });
// UseCaseがビジネスルールをチェック
```

### ❌ データベース直接アクセス

```typescript
// ❌ Bad
const repository = container.get<ProjectRepository>(
  serviceId.PROJECT_REPOSITORY,
);
const project = await repository.findById({ id: projectId });

// ✅ Good: UseCaseに委譲
const result = await useCase.execute({ projectId });
```

