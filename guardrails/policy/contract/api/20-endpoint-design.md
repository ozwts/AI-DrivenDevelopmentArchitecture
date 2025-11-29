# エンドポイント設計パターン

## 核心原則

RESTful設計原則に従い、**リソース中心のURL設計**と**適切なHTTPメソッドの使用**を徹底する。

## Current User パターン

**設計原則**: 認証されたユーザー自身のリソースには `/users/me` エンドポイントを使用する。

### パターン適用理由

1. **ユーザーIDの推測攻撃防止**: URLにユーザーIDを含めない
2. **認証トークンから自動解決**: JWTトークンの`sub`クレームからユーザー特定
3. **シンプルなクライアント実装**: クライアントはユーザーIDを管理不要
4. **RESTful慣習**: GitHub API、Stripe APIなど主要APIが採用

### エンドポイント例

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `POST /users/me` | POST | 現在のユーザーを登録 |
| `GET /users/me` | GET | 現在のユーザー情報を取得 |
| `PATCH /users/me` | PATCH | 現在のユーザー情報を更新 |
| `DELETE /users/me` | DELETE | 現在のユーザーを削除 |

### OpenAPI定義

```yaml
paths:
  /users/me:
    post:
      summary: 現在のユーザーを登録
      operationId: registerCurrentUser
      security:
        - CognitoAuthorizer: []
      responses:
        '201':
          description: ユーザー登録成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
```

**重要**: `security`フィールドで認証必須を明示する。

### Handler層での実装パターン

```typescript
// Cognitoから取得したuserSubを使用
const userSub = c.get(USER_SUB);

const result = await useCase.execute({
  userSub,  // URLパラメータではなく認証情報から取得
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

### 実装例: TODOと添付ファイル

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `GET /todos/{todoId}/attachments` | GET | TODO配下の添付ファイル一覧取得 |
| `POST /todos/{todoId}/attachments/prepare` | POST | 添付ファイルアップロード準備 |
| `PATCH /todos/{todoId}/attachments/{attachmentId}` | PATCH | 添付ファイル情報更新 |
| `GET /todos/{todoId}/attachments/{attachmentId}/download-url` | GET | ダウンロードURL取得 |
| `DELETE /todos/{todoId}/attachments/{attachmentId}` | DELETE | 添付ファイル削除 |

### URL設計の一貫性

**ルール1**: 子リソースは常に親リソースのパスに続ける

```yaml
# ✅ Good
/todos/{todoId}/attachments/{attachmentId}

# ❌ Bad
/attachments/{attachmentId}  # 親子関係が不明確
```

**ルール2**: パスパラメータ名は単数形+`Id`

```yaml
# ✅ Good
/todos/{todoId}/attachments/{attachmentId}

# ❌ Bad
/todos/{id}/attachments/{id}  # パラメータ名が重複
/todos/{todo_id}/attachments/{attachment_id}  # snake_case
```

### レスポンスボディに親IDを含める

**参照**: `10-api-overview.md` - ネストされたリソースの親ID

```yaml
AttachmentResponse:
  type: object
  required:
    - id
    - todoId  # 親リソースID（必須）
  properties:
    id:
      type: string
    todoId:
      type: string
    filename:
      type: string
```

**理由**:
- URLから親IDが取得できない場合（WebSocket/SSE）に対応
- フロントエンド状態管理の簡素化
- レスポンス自己完結性の向上

## HTTPメソッドとCRUD操作のマッピング

| HTTPメソッド | CRUD操作 | ステータスコード（成功時） | 説明 |
|-------------|---------|--------------------------|------|
| POST | Create | 201 Created | リソース作成 |
| GET | Read | 200 OK | リソース取得 |
| PATCH | Update | 200 OK | リソース更新（**PATCH統一原則**） |
| DELETE | Delete | 204 No Content | リソース削除 |

**重要**: 更新操作はすべてPATCHを使用する。PUTは使用しない（詳細は「HTTPメソッド統一ポリシー」参照）。

## エラーレスポンスとHTTPステータスコード

**参照**: `policy/server/domain-model/26-validation-strategy.md` - エラー型とHTTPステータスコードのマッピング

### エラーステータスコード一覧

| HTTPステータスコード | エラー型 | 用途 | レスポンス例 |
|--------------------|---------|------|-------------|
| 400 Bad Request | `ValidationError` | 型レベルバリデーションエラー（OpenAPI/Zod） | `{"name": "ValidationError", "message": "入力値が不正です"}` |
| 403 Forbidden | `ForbiddenError` | アクセス拒否 | `{"name": "ForbiddenError", "message": "アクセスが拒否されました"}` |
| 404 Not Found | `NotFoundError` | リソース未検出 | `{"name": "NotFoundError", "message": "リソースが見つかりませんでした"}` |
| 409 Conflict | `ConflictError` | データ競合 | `{"name": "ConflictError", "message": "データが競合しています"}` |
| 422 Unprocessable Entity | `DomainError` | ドメインルールエラー | `{"name": "DomainError", "message": "18歳以上である必要があります"}` |
| 500 Internal Server Error | `UnexpectedError` | 予期せぬエラー | `{"name": "UnexpectedError", "message": "予期せぬエラーが発生しました"}` |

### エラーレスポンスの設計原則

1. **ValidationError（400）**: OpenAPI/Zodで自動検証される型レベルの制約違反
   - minLength、maxLength、pattern、enum、required等
   - Handler層で自動的にキャッチされる

2. **DomainError（422）**: ドメインロジックを含むビジネスルール違反
   - 例: 18歳以上、会社ドメインのメールアドレスのみ、完了済みTODOのステータス変更不可
   - Domain層（Value Object/Entity）で発生する
   - OpenAPIでも表現可能な場合があるが、**実施しない**

3. **その他のエラー**: UseCase層で発生するビジネスルール違反
   - NotFoundError（404）: リソース未検出
   - ForbiddenError（403）: アクセス拒否、権限エラー
   - ConflictError（409）: データ競合

### POST: リソース作成

```yaml
post:
  summary: TODOを登録
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/RegisterTodoParams'
  responses:
    '201':
      description: TODO登録成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/TodoResponse'
    '400':
      description: バリデーションエラー（型レベル）
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    '422':
      description: ドメインルールエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

**重要**:
- 201 Createdを返す
- レスポンスボディに作成されたリソースを含める
- 400: 型レベルバリデーションエラー（OpenAPI/Zod）
- 422: ドメインルールエラー（Domain層（Value Object/Entity））
- `Location`ヘッダーは通常省略（RESTful純粋主義では推奨されるが実用上不要なことが多い）

### GET: リソース取得

```yaml
get:
  summary: TODO取得
  parameters:
    - name: todoId
      in: path
      required: true
      schema:
        type: string
  responses:
    '200':
      description: TODO取得成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/TodoResponse'
    '404':
      description: TODOが見つかりません
```

### GET: リソース一覧取得

```yaml
get:
  summary: TODO一覧取得
  responses:
    '200':
      description: TODO一覧取得成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/TodosResponse'
```

**重要**:
- 空配列も200 OKで返す（404ではない）
- ページネーションパラメータは将来的に追加可能

### PATCH: リソース更新

```yaml
patch:
  summary: TODO更新
  parameters:
    - name: todoId
      in: path
      required: true
      schema:
        type: string
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/UpdateTodoParams'
  responses:
    '200':
      description: TODO更新成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/TodoResponse'
    '400':
      description: バリデーションエラー（型レベル）
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    '403':
      description: アクセス拒否
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    '404':
      description: TODOが見つかりません
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    '422':
      description: ドメインルールエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

**重要**:
- 更新後のリソース全体を返す
- 204 No Contentではなく200 OKを使用（レスポンスボディあり）
- UpdateTodoParamsのフィールドはすべてオプショナル（PATCH統一原則）
- 400: 型レベルバリデーションエラー（OpenAPI/Zod）
- 403: アクセス拒否（他人のリソース更新等）
- 404: リソース未検出
- 422: ドメインルールエラー（Domain層（Value Object/Entity））

#### PATCH操作でのフィールドクリア（null使用）

**課題**: PATCHで既存フィールドをクリア（`undefined`に設定）する方法

**解決策**: JSON層では`null`を使用し、Handler層で`undefined`に変換する

**OpenAPI定義**:

```yaml
UpdateTodoParams:
  type: object
  properties:
    dueDate:
      type: string
      format: date-time
      nullable: true  # nullを許可（クリア操作のため）
      description: 期限（nullで\"期限なし\"に設定）
    completedAt:
      type: string
      format: date-time
      nullable: true
      description: 完了日時（nullで\"未完了\"に設定）
```

**3値の区別**:

| クライアント送信 | JSON表現 | 意味 | TypeScript内部 |
|---------------|---------|------|---------------|
| フィールド省略 | `{}` | 変更しない | プロパティなし（`'dueDate' in input === false`） |
| `null`送信 | `{"dueDate": null}` | クリアする | `undefined` |
| 値を送信 | `{"dueDate": "2025-01-01T00:00:00Z"}` | 値を設定 | `string` |

**クライアント例**:

```typescript
// ケース1: フィールドを変更しない（省略）
PATCH /todos/123
{}

// ケース2: フィールドをクリア（nullを送信）
PATCH /todos/123
{
  "dueDate": null  // 期限なしに設定
}

// ケース3: フィールドを更新（値を送信）
PATCH /todos/123
{
  "dueDate": "2025-01-01T00:00:00Z"
}
```

**TypeScript内部への変換**:

**参照**: `policy/server/handler/10-handler-overview.md` - null → undefined 変換パターン

- **API層（JSON）**: `null`を許可（`nullable: true`）
- **Handler層**: `null` → `undefined`変換を実施
- **TypeScript内部**: `undefined`のみ使用（TypeScriptベストプラクティス）

**重要**: TypeScript内部では`null`を使用しない。`undefined`のみ使用する。

### DELETE: リソース削除

```yaml
delete:
  summary: TODO削除
  parameters:
    - name: todoId
      in: path
      required: true
      schema:
        type: string
  responses:
    '204':
      description: TODO削除成功
    '404':
      description: TODOが見つかりません
```

**重要**:
- 204 No Contentを返す（レスポンスボディなし）
- 削除成功時はボディ不要（べき等性）

## HTTPメソッド統一ポリシー（PATCH統一）

**核心原則**: すべての更新操作に **PATCH** を使用し、PUT/PATCHの使い分けはしない。

### PATCH統一の理由

#### 1. ガードレールとしての機能

使い分けルールは守られない。統一ルールが開発体験を向上させる。

**問題**:
- PUT（全フィールド必須）とPATCH（部分更新）の使い分けは複雑
- 「どちらを使うべきか」の判断コストが発生
- レビュー時に使い分けの妥当性検証が必要
- 開発者間で解釈のブレが生じる

**解決**:
- **すべてPATCHに統一** → 判断不要
- OpenAPIスキーマ設計パターンが統一
- UseCase実装パターンが統一
- クライアント実装パターンが統一

#### 2. 実装の一貫性

すべての更新操作で同じパターンを使用する。

**メリット**:
- OpenAPIスキーマは常にオプショナルフィールド
- クライアントは常に同じパターン（変更したいフィールドのみ送信）
- 認知負荷の削減

### OpenAPI定義パターン

**すべてオプショナル**（requiredには含めない）

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
      description: TODOのタイトル
    description:
      type: string
      description: 説明（オプショナル）
    status:
      $ref: '#/components/schemas/TodoStatus'
    dueDate:
      type: string
      format: date-time
      description: 期限（ISO 8601形式、undefinedで"期限なし"）
    priority:
      type: integer
      minimum: 1
      maximum: 5
      description: 優先度
```

**重要**:
- `required`フィールドは空（すべてオプショナル）
- クライアントは変更したいフィールドのみ送信
- `description`で意図を明確に記載

### クライアント実装パターン

クライアントは**変更したいフィールドのみ送信**する。

```typescript
// ステップ1不要（GETなし）
// ステップ2: 変更したいフィールドのみPATCH
await fetch(`/todos/${todoId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "新しいタイトル",  // 変更したいフィールドのみ
  }),
});
```

**メリット**:
- 1回のHTTPリクエストで完結
- ネットワーク帯域節約
- クライアントコードがシンプル
- GETが不要（楽観的ロック実装時のみGET）

### PUTを使用しない理由

| 項目 | PATCH統一 | PUT/PATCH使い分け |
|------|-----------|------------------|
| ガードレール | ✅ 判断不要 | ❌ 使い分け判断が必要 |
| 実装一貫性 | ✅ 常に同じパターン | ❌ 2種類のパターン混在 |
| クライアント負荷 | ✅ PATCH（1回） | △ GET + PUT（2回） |
| 認知負荷 | ✅ 低い | ❌ 高い（判断コスト） |

**結論**: 使い分けの認知負荷を削減し、**ガードレールとしての機能を優先**する。

### 例外: ビジネス操作専用エンドポイント

重要なビジネス操作は、専用エンドポイントを検討（RPC風アプローチ）。

```yaml
# ✅ 専用エンドポイント（重要なビジネス操作）
PUT /todos/{todoId}/complete
  requestBody:
    CompleteTodoParams:
      required: [completedAt]
      properties:
        completedAt:
          type: string
          format: date-time
          description: 完了日時
```

**適用判断**:
- 重要なビジネスドメイン操作
- 複雑なビジネスルールが付随
- ドメインエキスパートとの会話に頻出
- 操作の意図を明確にしたい

**注意**: 安易な専用エンドポイント乱発はAPI設計を複雑化するため慎重に判断

## 特殊なアクション用エンドポイント

CRUDに当てはまらない操作は、**動詞を含むパス**を使用する。

### パターン

```
/{resource}/{id}/{action}
```

### 実装例

| エンドポイント | 説明 | 理由 |
|--------------|------|------|
| `POST /todos/{todoId}/attachments/prepare` | アップロード準備 | 単純なPOSTではない（Pre-signed URL発行） |
| `GET /todos/{todoId}/attachments/{attachmentId}/download-url` | ダウンロードURL取得 | 単純なGETではない（Pre-signed URL発行） |

### OpenAPI定義

```yaml
/todos/{todoId}/attachments/prepare:
  post:
    summary: 添付ファイルアップロード準備
    operationId: prepareAttachmentUpload
    responses:
      '200':
        description: アップロード準備成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PrepareAttachmentResponse'
```

**重要**:
- `operationId`は動詞を含む（`prepareAttachmentUpload`）
- レスポンススキーマも動作を表す名前（`PrepareAttachmentResponse`）

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

**注意**: 現在の実装ではクエリパラメータ未使用（将来拡張用）

## セキュリティ設定

すべての認証が必要なエンドポイントに `security` フィールドを設定する。

```yaml
paths:
  /todos:
    get:
      security:
        - CognitoAuthorizer: []
```

### セキュリティスキーマ定義

```yaml
components:
  securitySchemes:
    CognitoAuthorizer:
      type: apiKey
      in: header
      name: Authorization
      x-amazon-apigateway-authtype: cognito_user_pools
```

**重要**: 認証不要なエンドポイント（`/health`など）のみ`security`を省略する。

## Do / Don't

### ✅ Good

```yaml
# Current Userパターン
/users/me

# 階層的なURL
/todos/{todoId}/attachments/{attachmentId}

# 明確なHTTPメソッド使用
POST /todos        # 作成（201）
GET /todos/{id}    # 取得（200）
PATCH /todos/{id}  # 更新（200）
DELETE /todos/{id} # 削除（204）

# PATCH: すべてオプショナル（PATCH統一）
UpdateTodoParams:
  properties: [title, description, status, dueDate, priority]
  # requiredは空（すべてオプショナル）

# クライアント実装: PATCH（変更フィールドのみ）
await fetch(`/todos/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ title: "新しいタイトル" })
});

# 特殊アクションは動詞を含む
POST /todos/{todoId}/attachments/prepare

# セキュリティ明示
security:
  - CognitoAuthorizer: []
```

### ❌ Bad

```yaml
# ユーザーIDをURLに含める
/users/{userId}  # ❌ Current Userパターンを使うべき

# フラットなURL構造
/attachments/{attachmentId}  # ❌ 親子関係が不明確

# 不適切なHTTPメソッド
GET /todos/create  # ❌ POSTを使うべき
POST /todos/{id}/delete  # ❌ DELETEを使うべき

# PUTの使用（全体更新）
PUT /todos/{id}  # ❌ PATCHに統一すべき
UpdateTodoParams:
  required: [title, status, dueDate, priority]  # ❌ requiredは空にすべき

# UseCase層で全フィールドを要求
const updated = new Todo({
  ...input,  # ❌ 全フィールド必須、部分更新ができない
});

# 動詞のみのパス
POST /prepare  # ❌ リソース名が不明確

# セキュリティ設定忘れ
paths:
  /todos:
    get:
      # ❌ security が未設定
```

## チェックリスト

```
[ ] Current Userパターンを認証済みユーザー操作に使用
[ ] ネストされたリソースは階層的URL構造
[ ] パスパラメータは単数形+Id
[ ] HTTPメソッドとCRUD操作が正しくマッピング
[ ] POST成功時は201、レスポンスボディあり
[ ] PATCH成功時は200、更新後リソース全体を返す
[ ] DELETE成功時は204、レスポンスボディなし
[ ] PATCH更新パラメータはすべてオプショナル（PATCH統一）
[ ] フィールドクリアが必要な場合はnullable: trueを設定（OpenAPI）
[ ] Handler層でnull → undefined変換を実装
[ ] TypeScript内部ではundefinedのみ使用（nullは使用しない）
[ ] PUTは使用しない（例外: RPC風ビジネス操作エンドポイント）
[ ] クライアントは変更フィールドのみPATCH送信
[ ] 特殊アクションは動詞を含むパス
[ ] 認証必須エンドポイントにsecurityフィールド設定
[ ] ネストされたレスポンスに親IDを含める
[ ] エラーレスポンスを適切に定義（400、403、404、409、422、500）
[ ] 400: 型レベルバリデーションエラー（OpenAPI/Zod）
[ ] 422: ドメインルールエラー（Domain層（Value Object/Entity））
[ ] 403/404/409: ビジネスルールエラー（UseCase層）
```
