# Handler層の全体像

## 核心原則

Handler層は**HTTPリクエスト/レスポンスの薄いアダプター**でなければならない。

## Handler層の責務

### 実施すること

1. **リクエストパラメータの取得**: パスパラメータ、クエリパラメータ、リクエストボディ
2. **入力バリデーション**: Zodスキーマによる型・形式チェック
3. **ユースケース呼び出し**: ビジネスロジックの実行を委譲
4. **エラーハンドリング**: ドメインエラーをHTTPステータスコードに変換
5. **レスポンス変換**: ドメインエンティティをAPIレスポンス形式に変換
6. **出力バリデーション**: レスポンスデータのZodスキーマ検証
7. **HTTPレスポンス返却**: 適切なステータスコードとボディの返却

### 実施しないこと

1. **ビジネスロジック**: ドメインルール・ビジネスルールの実装
2. **データベースアクセス**: 直接的なデータ取得・永続化
3. **複雑な計算**: ビジネス計算・集計処理
4. **状態管理**: エンティティの状態遷移ロジック

## ファイル構成

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

### ファイル配置ルール

#### ルール1: エンティティごとにディレクトリを作成

```
hono-handler/
├── project/
│   ├── project-router.ts
│   ├── create-project-handler.ts
│   ├── get-project-handler.ts
│   ├── list-projects-handler.ts
│   ├── update-project-handler.ts
│   ├── delete-project-handler.ts
│   └── project-response-mapper.ts
├── todo/
│   ├── todo-router.ts
│   ├── register-todo-handler.ts
│   ├── get-todo-handler.ts
│   ├── list-todos-handler.ts
│   ├── update-todo-handler.ts
│   ├── delete-todo-handler.ts
│   └── todo-response-mapper.ts
└── user/
    ├── user-router.ts
    ├── register-current-user-handler.ts
    ├── get-current-user-handler.ts
    ├── list-users-handler.ts
    ├── get-user-handler.ts
    ├── update-current-user-handler.ts
    ├── delete-current-user-handler.ts
    └── user-response-mapper.ts
```

#### ルール2: ルーターとハンドラーを分離

- **ルーター** (`{entity}-router.ts`): エンドポイント定義・ルーティング
- **ハンドラー** (`{action}-{entity}-handler.ts`): 個別のHTTP処理
- **レスポンスマッパー** (`{entity}-response-mapper.ts`): レスポンス変換関数

#### ルール3: 子リソースのハンドラーは親ディレクトリに配置

```
todo/
├── register-todo-handler.ts
├── list-attachments-handler.ts            # GET /todos/:todoId/attachments
├── prepare-attachment-upload-handler.ts   # POST /todos/:todoId/attachments/prepare
├── update-attachment-status-handler.ts    # PATCH /todos/:todoId/attachments/:attachmentId
├── get-attachment-download-url-handler.ts # GET /todos/:todoId/attachments/:attachmentId/download-url
└── delete-attachment-handler.ts           # DELETE /todos/:todoId/attachments/:attachmentId
```

## 命名規則

### ハンドラー関数

```typescript
build{Action}{Entity}Handler
```

**Action動詞の選択**:

| HTTPメソッド | Action | 例 |
|-------------|--------|-----|
| POST（作成） | Create, Register | `buildCreateProjectHandler`, `buildRegisterTodoHandler` |
| GET（単一取得） | Get | `buildGetProjectHandler`, `buildGetTodoHandler` |
| GET（リスト取得） | List | `buildListProjectsHandler`, `buildListTodosHandler` |
| PATCH（更新） | Update | `buildUpdateProjectHandler`, `buildUpdateTodoHandler` |
| DELETE | Delete | `buildDeleteProjectHandler`, `buildDeleteTodoHandler` |

### ルーター関数

```typescript
build{Entity}Router
```

例: `buildProjectRouter`, `buildTodoRouter`, `buildUserRouter`

### 変換関数

```typescript
convertTo{Entity}Response
```

例: `convertToProjectResponse`, `convertToTodoResponse`, `convertToUserResponse`

### ファイル名

| 種類 | パターン | 例 |
|------|---------|-----|
| ハンドラー | `{action}-{entity}-handler.ts` | `create-project-handler.ts`, `get-todo-handler.ts` |
| ルーター | `{entity}-router.ts` | `project-router.ts`, `todo-router.ts` |
| レスポンスマッパー | `{entity}-response-mapper.ts` | `project-response-mapper.ts`, `todo-response-mapper.ts` |

## HTTPステータスコード一覧

| 操作 | 成功時 | エラー時 |
|------|--------|----------|
| POST（作成） | 201 Created | 400 Bad Request（バリデーション）, 409 Conflict（重複） |
| GET（取得） | 200 OK | 404 Not Found（未存在） |
| GET（リスト） | 200 OK | - |
| PATCH（更新） | 200 OK | 400 Bad Request（バリデーション）, 404 Not Found（未存在） |
| DELETE | 204 No Content | 404 Not Found（未存在） |

### エラーステータスコードマッピング

| ドメインエラー | HTTPステータス | 使用例 |
|---------------|---------------|--------|
| ValidationError | 400 Bad Request | リクエスト不正、ビジネスルール違反 |
| NotFoundError | 404 Not Found | リソース未検出 |
| ConflictError | 409 Conflict | 重複データ、競合状態 |
| ForbiddenError | 403 Forbidden | アクセス権限なし |
| UnexpectedError | 500 Internal Server Error | 予期しないエラー |

## レイヤー間の関係

```
HTTP Request
    ↓
Handler層（このドキュメント）
  - リクエスト取得
  - 入力バリデーション（Zod）
    ↓
UseCase層
  - ビジネスロジック実行
    ↓
Domain層
  - エンティティ操作
    ↓
Infrastructure層
  - データ永続化
    ↓（Result型）
UseCase層
    ↓（Result型）
Handler層
  - レスポンス変換
  - 出力バリデーション（Zod）
  - エラー変換
    ↓
HTTP Response
```

## OpenAPI-First開発フロー

```
1. OpenAPI仕様書を更新
   - リクエストスキーマ定義
   - レスポンススキーマ定義
   - エンドポイント定義

2. Zodスキーマ自動生成
   npm run codegen

3. ハンドラー実装
   - 生成されたZodスキーマを使用
   - 入力バリデーション
   - 出力バリデーション

4. ルーターに登録
   - エンドポイントとハンドラーを紐付け
```

## バリデーション戦略（MECE原則）

Handler層は**型レベルのバリデーション**のみを実施する。

### Handler層の責務

- **OpenAPIで定義された制約**: 必須性、型、長さ、形式、enum
- **Zodスキーマによる自動検証**: `safeParse()` で実施
- **バリデーションエラー**: 400 Bad Requestを返す

### Handler層で実施しないバリデーション

- **ドメインルール**: UseCase層またはDomain層（Value Object）で実施
- **ビジネスルール**: UseCase層で実施（DB参照を伴う権限・状態チェック）
- **構造的整合性**: Entity層でreadonly等で保護

## 共通パターン

### ビルダーパターン（Builder Pattern）

すべてのハンドラは高階関数で実装し、DIコンテナを注入する。

```typescript
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    // ハンドラ実装
  };
```

**利点**:

- DIコンテナを明示的に宣言
- テスト時にモックコンテナを注入可能
- 関数型プログラミングスタイル
- クロージャで状態を保持

### Result型パターン

ユースケースから返される `Result<T, E>` 型を使用して、成功・失敗を明示的に扱う。

```typescript
const result = await useCase.execute({ projectId });

if (result.success === false) {
  return handleError(result.error, c, logger);
}

// result.dataが型安全に利用可能
const responseData = convertToProjectResponse(result.data);
```

### try-catch必須

すべてのハンドラーは全体を `try-catch` でラップし、予期しない例外をキャッチする。

```typescript
export const buildXxxHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);

    try {
      // ハンドラ実装
    } catch (error) {
      logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
      return c.json(
        {
          name: new UnexpectedError().name,
          message: unexpectedErrorMessage,
        },
        500,
      );
    }
  };
```

## テスト戦略

### Handler層のテスト方針

**ユニットテストは通常実装しない**

Handler層は薄いアダプターであり、ロジックが少ないため、ユニットテストは通常不要。

**E2Eテストで検証**

1. 認証フロー全体
2. リクエスト/レスポンスの形式
3. エラーハンドリングと適切なステータスコード
4. バリデーションエラーメッセージ
5. レスポンスボディの型正確性

## Do / Don't

### ✅ Good

```typescript
// ビルダーパターンでDI注入
export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE);

    try {
      const rawBody = await c.req.json();

      // Zodバリデーション
      const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
      if (!parseResult.success) {
        return c.json({ name: "ValidationError", ... }, 400);
      }

      // ユースケース実行
      const result = await useCase.execute(parseResult.data);

      // Result型チェック
      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンス変換
      const responseData = convertToProjectResponse(result.data);

      // 出力バリデーション
      const responseParseResult = schemas.ProjectResponse.safeParse(responseData);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", ...);
        return c.json({ name: new UnexpectedError().name, ... }, 500);
      }

      return c.json(responseParseResult.data, 201);
    } catch (error) {
      logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
      return c.json({ name: new UnexpectedError().name, ... }, 500);
    }
  };
```

### ❌ Bad

```typescript
// ビルダーパターン不使用（DI注入なし）
export const createProjectHandler = async (c: Context) => {
  // DIコンテナが使えない
  const logger = new ConsoleLogger();  // ❌ ハードコーディング
  const useCase = new CreateProjectUseCaseImpl();  // ❌ ハードコーディング
};

// バリデーション不実施
const rawBody = await c.req.json();
const result = await useCase.execute(rawBody);  // ❌ 型安全でない

// Result型チェック不実施
const result = await useCase.execute(data);
const responseData = convertToProjectResponse(result.data);  // ❌ errorの可能性

// 出力バリデーション不実施
const responseData = convertToProjectResponse(result.data);
return c.json(responseData, 201);  // ❌ OpenAPI仕様との不一致を検出できない

// try-catchなし
export const buildXxxHandler = ({ container }: { container: Container }) =>
  async (c: Context) => {
    // ❌ 予期しない例外が上位に伝播
    const result = await useCase.execute(data);
    return c.json(result.data, 200);
  };

// ビジネスロジックの実装
export const buildCreateProjectHandler = ({ container }: { container: Container }) =>
  async (c: Context) => {
    const rawBody = await c.req.json();

    // ❌ ハンドラでビジネスロジックを実装（UseCaseに委譲すべき）
    if (rawBody.color === "#000000") {
      return c.json({ name: "ValidationError", message: "黒は使用できません" }, 400);
    }

    const result = await useCase.execute(rawBody);
    return c.json(result.data, 201);
  };

// 直接データベースアクセス
export const buildGetProjectHandler = ({ container }: { container: Container }) =>
  async (c: Context) => {
    const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);

    // ❌ ハンドラから直接リポジトリを呼び出し（UseCaseに委譲すべき）
    const project = await repository.findById({ id: projectId });

    return c.json(project, 200);
  };
```
