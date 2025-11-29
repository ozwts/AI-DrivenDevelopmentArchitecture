# バリデーションとエラーハンドリング

## 核心原則

Handler層は**OpenAPI定義に基づくZodスキーマで型レベルのバリデーションを実施**し、**ドメインエラーを適切なHTTPステータスコードに変換**する。

## バリデーション戦略（MECE原則）

**参照**: `policy/server/domain-model/26-validation-strategy.md` - バリデーション戦略の大原則

### Handler層の責務（第1階層: 型レベルバリデーション）

**実施すること**: OpenAPIで定義された型レベル制約の検証

- 必須性、型、長さ、形式、enum値、数値範囲
- **ValidationError（400 Bad Request）**を返す

**実施しないこと**:

- **ドメインルールの検証** → Domain層（Value Object/Entity）
  - 例: 18歳以上、会社ドメインのメールアドレスのみ、完了済みTODOのステータス変更不可
  - OpenAPIでも表現可能な場合があるが、**実施しない**（Domain層（Value Object/Entity）の責務）
  - **DomainError（422 Unprocessable Entity）**を返す
- **ビジネスルールの検証** → UseCase層
  - 例: リソース存在チェック（NotFoundError）、権限チェック（ForbiddenError）
- **DB参照を伴う検証** → UseCase層

## 入力バリデーション

### リクエストボディ

```typescript
const rawBody = await c.req.json();

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

### エラー型とHTTPステータスコードのマッピング

**参照**: `policy/server/domain-model/26-validation-strategy.md` - エラー型とHTTPステータスコードのマッピング

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

### エラーマッピング表

| エラー型          | HTTPステータス            | ログレベル | 発生場所                        | 使用例                                                                               |
| ----------------- | ------------------------- | ---------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `ValidationError` | 400 Bad Request           | warn       | Handler層（OpenAPI/Zod）        | 型レベルバリデーションエラー（minLength、maxLength、pattern、enum等）                |
| `DomainError`     | 422 Unprocessable Entity  | warn       | Domain層（Value Object/Entity） | ドメインルールエラー（18歳以上、会社ドメインのメールアドレスのみ、状態遷移ルール等） |
| `ForbiddenError`  | 403 Forbidden             | warn       | UseCase層                       | アクセス権限なし                                                                     |
| `NotFoundError`   | 404 Not Found             | warn       | UseCase層                       | リソース未検出                                                                       |
| `ConflictError`   | 409 Conflict              | warn       | UseCase層                       | 重複データ、競合状態                                                                 |
| `UnexpectedError` | 500 Internal Server Error | error      | 全層                            | 予期しないエラー                                                                     |

### ハンドラー内での使用

```typescript
const result = await useCase.execute({ ... });

// Result型チェック
if (result.success === false) {
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

```typescript
const userSub = c.get(USER_SUB);

if (typeof userSub !== "string" || userSub === "") {
  logger.error("userSubがコンテキストに設定されていません");
  return c.json({ name: new UnexpectedError().name, ... }, 500);
}
```

**理由**: ミドルウェア設定ミスの検出（500エラー）

### 外部システムエラーの処理

```typescript
try {
  const cognitoUser = await authClient.getUserById(userSub);
  email = cognitoUser.email;
} catch (error) {
  logger.warn("Cognitoからのユーザー情報取得に失敗（続行）", { error });
  // 取得失敗してもエラーにせず続行（オプション情報の場合）
}
```

## チェックリスト

### バリデーション実装

```
[ ] 入力バリデーション（Zod）
    - safeParse()使用
    - エラー時は400返却
    - formatZodError()でメッセージ整形

[ ] クエリパラメータバリデーション
    - 空文字列チェック
    - undefinedに正規化

[ ] 出力バリデーション（Zod）
    - 検証失敗時は500返却
    - エラーログに詳細出力
```

### エラーハンドリング

```
[ ] handleError()使用
    - Result型のエラーを渡す
    - 適切なHTTPステータスに変換
    - ValidationError → 400（型レベルバリデーション）
    - DomainError → 422（ドメインルール）
    - ForbiddenError → 403（アクセス拒否）
    - NotFoundError → 404（リソース未検出）
    - ConflictError → 409（データ競合）

[ ] try-catch実装
    - 全体をラップ
    - 予期しない例外をキャッチ
    - 500エラーレスポンス

[ ] ログ出力
    - バリデーションエラー: debug（Handler層）
    - ドメインエラー: warn（Value Object層）
    - ビジネスルールエラー: warn（UseCase層）
    - 予期しないエラー: error
```
