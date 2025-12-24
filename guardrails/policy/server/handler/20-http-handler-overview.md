# HTTPハンドラー概要

## 核心原則

HTTPハンドラーは**Honoフレームワークを使用した薄いHTTPアダプター**であり、**単一のUseCaseのみを呼び出す**。

## HTTPハンドラーの責務

### 実施すること

1. **リクエストパラメータの取得**: パスパラメータ、クエリパラメータ、リクエストボディ
2. **入力バリデーション**: Zodスキーマによる型・形式チェック
3. **ユースケース呼び出し**: 単一のUseCaseのみ実行
4. **エラーハンドリング**: エラーをHTTPステータスコードに変換
5. **レスポンス変換**: ドメインエンティティをAPIレスポンス形式に変換
6. **出力バリデーション**: レスポンスデータのZodスキーマ検証
7. **HTTPレスポンス返却**: 適切なステータスコードとボディの返却

### 実施しないこと

1. **ビジネスロジック** → UseCase層で実施
2. **データベースアクセス** → Repository層で実施（container.getで取得禁止）
3. **外部サービス呼び出し** → UseCase層で実施（container.getで取得禁止）
4. **複数UseCase呼び出し** → 単一UseCaseに統合

## ディレクトリ構成

```
handler/
├── client-side-app-handler.ts          # Lambda用エントリポイント
├── lambda-handler.ts                   # コールドスタート対策版
├── init-handler.ts                     # DIコンテナ初期化
├── hono-handler/
│   ├── client-side-app.ts              # Honoアプリケーション構築
│   ├── constants.ts                    # コンテキスト定数（USER_SUB等）
│   │
│   ├── {entity}/                       # エンティティごとのディレクトリ
│   │   ├── {entity}-router.ts          # ルーティング定義
│   │   ├── {action}-{entity}-handler.ts  # CRUDハンドラー
│   │   └── {entity}-response-mapper.ts # レスポンス変換関数
│   │
│   └── hono-handler-util/              # 共通ユーティリティ
│       ├── error-handler.ts            # エラー変換ロジック
│       └── validation-formatter.ts     # Zodエラーフォーマット
```

## 命名規則

### ハンドラー関数

```typescript
build{Action}{Entity}Handler
```

| HTTPメソッド      | Action           | 例                                                      |
| ----------------- | ---------------- | ------------------------------------------------------- |
| POST（作成）      | Create, Register | `buildCreateProjectHandler`, `buildRegisterTodoHandler` |
| GET（単一取得）   | Get              | `buildGetProjectHandler`, `buildGetTodoHandler`         |
| GET（リスト取得） | List             | `buildListProjectsHandler`, `buildListTodosHandler`     |
| PATCH（更新）     | Update           | `buildUpdateProjectHandler`, `buildUpdateTodoHandler`   |
| DELETE            | Delete           | `buildDeleteProjectHandler`, `buildDeleteTodoHandler`   |

### ファイル名

| 種類               | パターン                       | 例                                 |
| ------------------ | ------------------------------ | ---------------------------------- |
| ハンドラー         | `{action}-{entity}-handler.ts` | `create-project-handler.ts`        |
| ルーター           | `{entity}-router.ts`           | `project-router.ts`                |
| レスポンスマッパー | `{entity}-response-mapper.ts`  | `project-response-mapper.ts`       |

## HTTPステータスコード

| 操作          | 成功時         | 主なエラー                                    |
| ------------- | -------------- | --------------------------------------------- |
| POST（作成）  | 201 Created    | 400, 409, 422                                 |
| GET（取得）   | 200 OK         | 404                                           |
| GET（リスト） | 200 OK         | -                                             |
| PATCH（更新） | 200 OK         | 400, 403, 404, 422                            |
| DELETE        | 204 No Content | 404                                           |

**参照**: `22-http-validation-error.md` - エラー型とHTTPステータスコードの詳細マッピング

## container.getの制約

ハンドラーで`container.get`で取得してよいのは**Logger**と**UseCase**のみ。

```typescript
// ✅ Good
const logger = container.get<Logger>(serviceId.LOGGER);
const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);

// ❌ Bad
const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);
const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);
```

## Do / Don't

### ✅ Good

```typescript
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    // LoggerとUseCaseのみ取得
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);

    try {
      // 入力取得・バリデーション
      const rawBody: unknown = await c.req.json();
      const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
      if (!parseResult.success) {
        return c.json({ name: "ValidationError", message: formatZodError(parseResult.error) }, 400);
      }

      // 単一UseCase呼び出し
      const result = await useCase.execute(parseResult.data);
      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // レスポンス変換・出力バリデーション
      const responseData = convertToProjectResponse(result.data);
      const responseParseResult = schemas.ProjectResponse.safeParse(responseData);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", { errors: responseParseResult.error.errors });
        return c.json({ name: new UnexpectedError().name, message: unexpectedErrorMessage }, 500);
      }

      return c.json(responseParseResult.data, 201);
    } catch (error) {
      logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
      return c.json({ name: new UnexpectedError().name, message: unexpectedErrorMessage }, 500);
    }
  };
```

### ❌ Bad

```typescript
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    // ❌ Repository/AuthClientを取得
    const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);
    const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);

    // ❌ 複数UseCase呼び出し
    const createResult = await createUseCase.execute({ ... });
    const notifyResult = await notifyUseCase.execute({ ... });

    // ❌ ビジネスロジックをハンドラーで実装
    if (rawBody.color === "#000000") {
      return c.json({ name: "ValidationError", message: "黒は使用できません" }, 400);
    }

    // ❌ try-catchなし
    const result = await useCase.execute(data);
    return c.json(result.data, 201);
  };
```

## 関連ドキュメント

- **実装詳細**: `21-http-handler-implementation.md`
- **バリデーション・エラー**: `22-http-validation-error.md`
- **ルーターパターン**: `23-http-router-patterns.md`
- **API契約**: `policy/contract/api/30-http-operations-overview.md`
