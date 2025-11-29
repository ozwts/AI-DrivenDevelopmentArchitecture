# ルーター実装パターン

## 核心原則

ルーターは**エンティティごとに分離**し、**エンドポイントとハンドラーの紐付けのみ**を実施する。

## ルーターの責務

### 実施すること

1. エンドポイント定義（HTTPメソッドとパス）
2. ハンドラー紐付け（ビルダー関数から生成）
3. Honoルーター構築（`Hono`インスタンス返却）

### 実施しないこと

1. ビジネスロジック
2. バリデーション → ハンドラー層に委譲
3. エラーハンドリング → ハンドラー層に委譲
4. 認証・認可 → ミドルウェアで実施

## 基本実装パターン

```typescript
import { Hono } from "hono";
import { Container } from "inversify";
import {
  build{Action1}{Entity}Handler,
  build{Action2}{Entity}Handler,
} from "./{action}-{entity}-handler";

export const build{Entity}Router = ({
  container,
}: {
  container: Container;
}): Hono => {
  const router = new Hono();

  // ハンドラー生成
  const {action1}Handler = build{Action1}{Entity}Handler({ container });
  const {action2}Handler = build{Action2}{Entity}Handler({ container });

  // エンドポイント定義（RESTful）
  router.post("/{entities}", {action1}Handler);
  router.get("/{entities}", {action2}Handler);
  router.get("/{entities}/:id", getHandler);
  router.put("/{entities}/:id", updateHandler);
  router.delete("/{entities}/:id", deleteHandler);

  return router;
};
```

## エンドポイント命名規則

### RESTful設計

| HTTPメソッド | パス | 説明 |
|-------------|------|------|
| POST | `/{entities}` | 作成 |
| GET | `/{entities}` | リスト取得 |
| GET | `/{entities}/:id` | 単一取得 |
| PUT | `/{entities}/:id` | 更新 |
| DELETE | `/{entities}/:id` | 削除 |

### パスパラメータ命名

```
:{entity}Id
```

**例**: `:projectId`, `:todoId`, `:userId`, `:attachmentId`

**ルール**:
- 単数形を使用
- キャメルケース

### 子リソースのパス

```
/{parent-entities}/:parentId/{child-entities}
/{parent-entities}/:parentId/{child-entities}/:childId
/{parent-entities}/:parentId/{child-entities}/:childId/{action}
```

**例**:
```
GET    /todos/:todoId/attachments
POST   /todos/:todoId/attachments/prepare
PUT    /todos/:todoId/attachments/:attachmentId
GET    /todos/:todoId/attachments/:attachmentId/download-url
DELETE /todos/:todoId/attachments/:attachmentId
```

### Current Userパターン

```
POST   /users/me           # 登録（初回）
GET    /users/me           # 自分の情報取得
PUT    /users/me           # 自分の情報更新
DELETE /users/me           # 自分のアカウント削除
```

**重要**: `/users/me` を `/users/:userId` より**先に定義**（ルーティング優先度）

## Honoアプリケーション構築

```typescript
export const buildApp = ({ container }: { container: Container }): Hono => {
  const app = new Hono();
  const logger = container.get<Logger>(serviceId.LOGGER);
  const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);

  // ミドルウェア（順序重要）
  app.use("*", cors({ ... }));
  app.use("*", honoLogger());
  app.use("*", authMiddleware);  // 認証

  // ルーター登録
  app.route("/", buildProjectRouter({ container }));
  app.route("/", buildTodoRouter({ container }));
  app.route("/", buildUserRouter({ container }));

  return app;
};
```

## 命名規則

### ルーター関数

```typescript
build{Entity}Router
```

**例**: `buildProjectRouter`, `buildTodoRouter`, `buildUserRouter`

### ルーターファイル

```
{entity}-router.ts
```

**例**: `project-router.ts`, `todo-router.ts`, `user-router.ts`

### ハンドラー変数

```typescript
const {action}{Entity}Handler = build{Action}{Entity}Handler({ container });
```

**例**:
```typescript
const createProjectHandler = buildCreateProjectHandler({ container });
const listTodosHandler = buildListTodosHandler({ container });
```

## Do / Don't

### ✅ Good

```typescript
// ビルダーパターン
export const buildProjectRouter = ({ container }: { container: Container }): Hono => {
  const router = new Hono();

  // ハンドラー生成
  const createProjectHandler = buildCreateProjectHandler({ container });

  // RESTful設計
  router.post("/projects", createProjectHandler);
  router.get("/projects/:projectId", getProjectHandler);

  return router;
};

// Current Userを先に定義
router.post("/users/me", registerCurrentUserHandler);
router.get("/users/me", getCurrentUserHandler);
router.get("/users/:userId", getUserHandler);  // 後
```

### ❌ Bad

```typescript
// ビルダーパターン不使用
export const projectRouter = new Hono();
projectRouter.post("/projects", async (c) => {
  // ❌ ルーター内でハンドラーロジックを直接実装
});

// 非RESTful設計
router.post("/create-project", createProjectHandler);  // ❌ 動詞を含む
router.get("/project", listProjectsHandler);  // ❌ 単数形

// Current Userの定義順序ミス
router.get("/users/:userId", getUserHandler);  // 先
router.get("/users/me", getCurrentUserHandler);  // ❌ :userId に me がマッチ
```

## チェックリスト

```
[ ] ビルダーパターン（build{Entity}Router）
[ ] DIコンテナ注入
[ ] ハンドラー生成（ビルダー関数から）
[ ] RESTful設計に準拠
[ ] 複数形エンティティ名（/{entities}）
[ ] パスパラメータ: :{entity}Id形式
[ ] 子リソースは親パスパラメータを含む
[ ] Current Userパターンは優先定義
[ ] Honoインスタンス返却
```
