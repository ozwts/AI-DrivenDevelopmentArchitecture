# URL設計パターン

## 核心原則

RESTful設計原則に従い、**リソース中心のURL設計**と**階層的なパス構造**で親子関係を表現する。

**関連ドキュメント**:
- **HTTP操作詳細**: `30-http-operations-overview.md`
- **PATCH 3値セマンティクス**: `31-patch-semantics.md`
- **エラーレスポンス**: `40-error-responses.md`

## Current User パターン

**設計原則**: 認証されたユーザー自身のリソースには `/users/me` エンドポイントを使用する。

### パターン適用理由

1. **ユーザーIDの推測攻撃防止**: URLにユーザーIDを含めない
2. **認証トークンから自動解決**: JWTトークンの`sub`クレームからユーザー特定
3. **シンプルなクライアント実装**: クライアントはユーザーIDを管理不要
4. **RESTful慣習**: GitHub API、Stripe APIなど主要APIが採用

### エンドポイント例

| エンドポイント     | メソッド | 説明                     |
| ------------------ | -------- | ------------------------ |
| `POST /users/me`   | POST     | 現在のユーザーを登録     |
| `GET /users/me`    | GET      | 現在のユーザー情報を取得 |
| `PATCH /users/me`  | PATCH    | 現在のユーザー情報を更新 |
| `DELETE /users/me` | DELETE   | 現在のユーザーを削除     |

### OpenAPI定義

```yaml
paths:
  /{resources}/me:
    post:
      summary: 現在のリソースを登録
      operationId: registerCurrentResource
      security:
        - Authorizer: []
      responses:
        "201":
          description: リソース登録成功
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{Entity}Response"
```

### Handler層での実装

```typescript
// Cognitoから取得したuserSubを使用
const userSub = c.get(USER_SUB);

const result = await useCase.execute({
  userSub, // URLパラメータではなく認証情報から取得
  name: input.name,
  email: input.email,
});
```

## ネストされたリソース設計

**設計原則**: 親子関係があるリソースは **階層的なURL構造** で表現する。

### 基本パターン

```
/{parent-resource}/{parent-id}/{child-resource}/{child-id}
```

### 実装例

| エンドポイント                                                                  | メソッド | 説明                               |
| ------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `GET /{parentEntities}/{parentEntityId}/{childEntities}`                        | GET      | 親リソース配下の子リソース一覧取得 |
| `POST /{parentEntities}/{parentEntityId}/{childEntities}/prepare`               | POST     | 子リソース準備                     |
| `PATCH /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}`      | PATCH    | 子リソース情報更新                 |
| `DELETE /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}`     | DELETE   | 子リソース削除                     |

### レスポンスボディに親IDを含める

**参照**: `10-api-overview.md` - ネストされたリソースの親ID

```yaml
{ChildEntity}Response:
  type: object
  required:
    - id
    - {parentEntity}Id  # 親リソースID（必須）
  properties:
    id:
      type: string
    {parentEntity}Id:
      type: string
```

**理由**:
- URLから親IDが取得できない場合（WebSocket/SSE）に対応
- フロントエンド状態管理の簡素化
- レスポンス自己完結性の向上

## パスパラメータとクエリパラメータ

### パスパラメータ

**用途**: リソースの識別

```yaml
/todos/{todoId}/attachments/{attachmentId}
```

**ルール**:
- 必須のリソース識別子のみ
- 単数形 + `Id`サフィックス
- camelCase

### クエリパラメータ

**用途**: フィルタリング、ソート、ページネーション

```yaml
/todos?status=PENDING&sort=createdAt
```

## 特殊アクション用エンドポイント

CRUDに当てはまらない操作は、**動詞を含むパス**を使用する。

### パターン

```
/{resource}/{id}/{action}
```

### 実装例

| エンドポイント                                                | 説明                | 理由                                     |
| ------------------------------------------------------------- | ------------------- | ---------------------------------------- |
| `POST /todos/{todoId}/attachments/prepare`                    | アップロード準備    | 単純なPOSTではない（Pre-signed URL発行） |
| `GET /todos/{todoId}/attachments/{attachmentId}/download-url` | ダウンロードURL取得 | 単純なGETではない（Pre-signed URL発行）  |

### OpenAPI定義

```yaml
/todos/{todoId}/attachments/prepare:
  post:
    summary: 添付ファイルアップロード準備
    operationId: prepareAttachmentUpload
    responses:
      "200":
        description: アップロード準備成功
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PrepareAttachmentResponse"
```

## Do / Don't

### ✅ Good

```yaml
# Current Userパターン
/users/me

# 階層的なURL（親子関係が明確）
/todos/{todoId}/attachments/{attachmentId}

# パスパラメータは単数形+Id、camelCase
/{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}

# 特殊アクションは動詞を含む
POST /todos/{todoId}/attachments/prepare
```

### ❌ Bad

```yaml
# ユーザーIDをURLに含める
/users/{userId}  # ❌ Current Userパターンを使うべき

# フラットなURL構造
/attachments/{attachmentId}  # ❌ 親子関係が不明確

# パラメータ名の重複
/{parentEntities}/{id}/{childEntities}/{id}  # ❌ 名前が重複

# snake_case
/todos/{todo_id}/attachments/{attachment_id}  # ❌ camelCaseを使う

# 動詞のみのパス
POST /prepare  # ❌ リソース名が不明確
```
