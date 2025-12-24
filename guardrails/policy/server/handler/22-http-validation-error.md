# HTTPバリデーションとエラーハンドリング

## 核心原則

HTTPハンドラーは**OpenAPI定義に基づくZodスキーマで型レベルのバリデーションを実施**し、**UseCase/Domain層から返されたエラーを適切なHTTPステータスコードに変換**する。

## バリデーション戦略（MECE原則）

**参照**: `policy/server/domain-model/11-domain-validation-strategy.md`

### Handler層の責務（型レベルバリデーション）

**実施すること**: OpenAPIで定義された型レベル制約の検証

- 必須性、型、長さ、形式、enum値、数値範囲
- **ValidationError（400 Bad Request）**を返す

**実施しないこと**:

- **ドメインルールの検証** → Domain層（Value Object/Entity）で実施
- **ビジネスルールの検証** → UseCase層で実施
- **DB参照を伴う検証** → UseCase層で実施

## 入力バリデーション

### リクエストボディ

```typescript
const rawBody: unknown = await c.req.json();

const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
if (!parseResult.success) {
  logger.debug("リクエストバリデーションエラー", {
    errors: parseResult.error.errors,
    rawBody,
  });
  return c.json(
    {
      name: "ValidationError",
      message: formatZodError(parseResult.error),
    },
    400,
  );
}

const body = parseResult.data; // 型安全なデータ
```

### クエリパラメータ

```typescript
const statusParam = c.req.query("status");

// 空文字列チェックと個別バリデーション
if (statusParam !== undefined && statusParam !== "") {
  const parseResult = schemas.TodoStatus.safeParse(statusParam);
  if (!parseResult.success) {
    return c.json({ name: "ValidationError", ... }, 400);
  }
}

// undefinedに正規化
const status =
  statusParam !== undefined && statusParam !== ""
    ? (statusParam as TodoStatus)
    : undefined;
```

### パスパラメータ

```typescript
const projectId = c.req.param("projectId");
// Honoルーター定義で存在保証、Zodバリデーション不要
```

## 出力バリデーション

```typescript
const responseData = convertToProjectResponse(result.data);

const responseParseResult = schemas.ProjectResponse.safeParse(responseData);
if (!responseParseResult.success) {
  logger.error("レスポンスバリデーションエラー", {
    errors: responseParseResult.error.errors,
    responseData,
  });
  return c.json({ name: new UnexpectedError().name, ... }, 500);
}

return c.json(responseParseResult.data, 200);
```

**目的**: OpenAPI仕様との不一致を検出、開発時のバグ検出

## エラーハンドリング

### エラー変換関数

```typescript
export const handleError = (error: Error, c: Context, logger: Logger) => {
  if (error instanceof ValidationError) {
    logger.warn("バリデーションエラー", { error });
    return c.json({ name: error.name, message: error.message }, 400);
  }

  if (error instanceof DomainError) {
    logger.warn("ドメインエラー", { error });
    return c.json({ name: error.name, message: error.message }, 422);
  }

  if (error instanceof NotFoundError) {
    logger.warn("リソース未検出", { error });
    return c.json({ name: error.name, message: error.message }, 404);
  }

  if (error instanceof ConflictError) {
    logger.warn("競合エラー", { error });
    return c.json({ name: error.name, message: error.message }, 409);
  }

  if (error instanceof ForbiddenError) {
    logger.warn("アクセス拒否", { error });
    return c.json({ name: error.name, message: error.message }, 403);
  }

  if (error instanceof UnexpectedError) {
    logger.error("予期せぬエラー", error);
    return c.json({ name: error.name, message: unexpectedErrorMessage }, 500);
  }

  logger.error("不明なエラー", error);
  return c.json({ name: "UnknownError", message: unexpectedErrorMessage }, 500);
};
```

### エラー型とHTTPステータスコードのマッピング

| エラー型          | HTTPステータス            | ログレベル | 発生場所         |
| ----------------- | ------------------------- | ---------- | ---------------- |
| `ValidationError` | 400 Bad Request           | warn       | Handler層        |
| `DomainError`     | 422 Unprocessable Entity  | warn       | Domain層         |
| `ForbiddenError`  | 403 Forbidden             | warn       | UseCase層        |
| `NotFoundError`   | 404 Not Found             | warn       | UseCase層        |
| `ConflictError`   | 409 Conflict              | warn       | UseCase層        |
| `UnexpectedError` | 500 Internal Server Error | error      | 全層             |

### ハンドラー内での使用

```typescript
const result = await useCase.execute({ ... });

// Result型チェック
if (!result.isOk()) {
  return handleError(result.error, c, logger);
}

// undefinedチェック（オプショナルな戻り値）
if (result.data === undefined) {
  return c.json({ name: "NotFoundError", message: "..." }, 404);
}
```

## Zodエラーフォーマット

```typescript
export const formatZodError = (zodError: ZodError): string =>
  zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");

// 出力例: "title: String must contain at least 1 character(s), color: Invalid enum value"
```

## ログ出力パターン

| 場面                           | ログレベル | 例                                              |
| ------------------------------ | ---------- | ----------------------------------------------- |
| リクエストバリデーションエラー | debug      | `"リクエストバリデーションエラー"` + エラー詳細 |
| レスポンスバリデーションエラー | error      | `"レスポンスバリデーションエラー"` + エラー詳細 |
| ドメインエラー                 | warn/error | `handleError()`内で自動出力                     |
| 予期しない例外                 | error      | `"ハンドラーで予期せぬエラーをキャッチ"`        |

## 特殊なエラーケース

### コンテキスト値の検証

`AppContext`型を使用すると`c.get(USER_SUB)`は`string`型を返すため、`typeof`チェックは不要。

```typescript
// AppContext型を使用
const userSub = c.get(USER_SUB);  // string型

// 空文字チェックのみ
if (userSub === "") {
  logger.error("userSubがコンテキストに設定されていません");
  return c.json({ name: new UnexpectedError().name, ... }, 500);
}
```

**理由**: ミドルウェア設定ミスの検出（500エラー）

## 関連ドキュメント

- **HTTPハンドラー概要**: `20-http-handler-overview.md`
- **実装詳細**: `21-http-handler-implementation.md`
- **バリデーション戦略**: `policy/server/domain-model/11-domain-validation-strategy.md`
- **API契約エラー定義**: `policy/contract/api/40-error-responses.md`
