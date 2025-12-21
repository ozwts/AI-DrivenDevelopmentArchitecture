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

**重要**: `security`フィールドで認証必須を明示する。

### Handler層での実装パターン

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

### 実装例: 親リソースと子リソース

| エンドポイント                                                                  | メソッド | 説明                               |
| ------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `GET /{parentEntities}/{parentEntityId}/{childEntities}`                        | GET      | 親リソース配下の子リソース一覧取得 |
| `POST /{parentEntities}/{parentEntityId}/{childEntities}/prepare`               | POST     | 子リソース準備                     |
| `PATCH /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}`      | PATCH    | 子リソース情報更新                 |
| `GET /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}/action` | GET      | 子リソースに対する特殊アクション   |
| `DELETE /{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}`     | DELETE   | 子リソース削除                     |

### URL設計の一貫性

**ルール1**: 子リソースは常に親リソースのパスに続ける

```yaml
# ✅ Good
/{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}

# ❌ Bad
/{childEntities}/{childEntityId}  # 親子関係が不明確
```

**ルール2**: パスパラメータ名は単数形+`Id`

```yaml
# ✅ Good
/{parentEntities}/{parentEntityId}/{childEntities}/{childEntityId}

# ❌ Bad
/{parentEntities}/{id}/{childEntities}/{id}  # パラメータ名が重複
/todos/{todo_id}/attachments/{attachment_id}  # snake_case
```

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
    name:
      type: string
```

**理由**:

- URLから親IDが取得できない場合（WebSocket/SSE）に対応
- フロントエンド状態管理の簡素化
- レスポンス自己完結性の向上

## HTTPメソッドとCRUD操作のマッピング

| HTTPメソッド | CRUD操作 | ステータスコード（成功時） | 説明                              |
| ------------ | -------- | -------------------------- | --------------------------------- |
| POST         | Create   | 201 Created                | リソース作成                      |
| GET          | Read     | 200 OK                     | リソース取得                      |
| PATCH        | Update   | 200 OK                     | リソース更新（**PATCH統一原則**） |
| DELETE       | Delete   | 204 No Content             | リソース削除                      |

**重要**: 更新操作はすべてPATCHを使用する。PUTは使用しない（詳細は「HTTPメソッド統一ポリシー」参照）。

## エラーレスポンスとHTTPステータスコード

**参照**: `policy/server/domain-model/26-validation-strategy.md` - エラー型とHTTPステータスコードのマッピング

### エラーステータスコード一覧

| HTTPステータスコード      | エラー型            | 用途                                        | レスポンス例                                                             |
| ------------------------- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| 400 Bad Request           | `ValidationError`   | 型レベルバリデーションエラー（OpenAPI/Zod） | `{"name": "ValidationError", "message": "入力値が不正です"}`             |
| 401 Unauthorized          | `UnauthorizedError` | 認証エラー（トークン無効・未提供）          | `{"name": "UnauthorizedError", "message": "認証が必要です"}`             |
| 403 Forbidden             | `ForbiddenError`    | 認可エラー（権限不足）                      | `{"name": "ForbiddenError", "message": "アクセスが拒否されました"}`      |
| 404 Not Found             | `NotFoundError`     | リソース未検出                              | `{"name": "NotFoundError", "message": "リソースが見つかりませんでした"}` |
| 409 Conflict              | `ConflictError`     | データ競合                                  | `{"name": "ConflictError", "message": "データが競合しています"}`         |
| 422 Unprocessable Entity  | `DomainError`       | ドメインルールエラー                        | `{"name": "DomainError", "message": "18歳以上である必要があります"}`     |
| 500 Internal Server Error | `UnexpectedError`   | 予期せぬエラー                              | `{"name": "UnexpectedError", "message": "予期せぬエラーが発生しました"}` |

### エラーレスポンスの設計原則

1. **ValidationError（400）**: OpenAPI/Zodで自動検証される型レベルの制約違反
   - minLength、maxLength、pattern、enum、required等
   - Handler層で自動的にキャッチされる

2. **UnauthorizedError（401）**: 認証エラー
   - JWTトークンが無効、期限切れ、または未提供
   - API Gateway/認証ミドルウェア層で発生
   - **認証が必要な全てのエンドポイントに定義必須**

3. **ForbiddenError（403）**: 認可エラー
   - 認証は成功したが、リソースへのアクセス権限がない
   - 例: 他人のTODOを更新、削除しようとした
   - UseCase層で発生

4. **DomainError（422）**: ドメインロジックを含むビジネスルール違反
   - 例: 18歳以上、会社ドメインのメールアドレスのみ、完了済みTODOのステータス変更不可
   - Domain層（Value Object/Entity）で発生する
   - OpenAPIでも表現可能な場合があるが、**実施しない**

5. **その他のエラー**: UseCase層で発生するビジネスルール違反
   - NotFoundError（404）: リソース未検出
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
          $ref: "#/components/schemas/RegisterTodoParams"
  responses:
    "201":
      description: TODO登録成功
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/TodoResponse"
    "400":
      description: バリデーションエラー（型レベル）
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    "422":
      description: ドメインルールエラー
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
```

**重要**:

- 201 Createdを返す
- レスポンスボディに作成されたリソースを含める
- 400: 型レベルバリデーションエラー（OpenAPI/Zod）
- 422: ドメインルールエラー（Domain層（Value Object/Entity））
- `Location`ヘッダーは通常省略（RESTful純粋主義では推奨されるが実用上不要なことが多い）

#### POST操作の2値セマンティクス

**参照**: `15-validation-constraints.md` - Register*ParamsとUpdate*Paramsの違い

POSTリクエスト（新規作成）では、PATCHと異なり**2値のみ**を区別する：

| クライアント送信 | JSON表現 | 意味 | TypeScript内部 |
| -------------- | -------- | ---- | -------------- |
| フィールド省略 | `{}` | 未設定（デフォルト値） | `undefined` |
| 値を送信 | `{"projectId": "proj-123"}` | 値を設定 | `string` |

**重要**: `null` 送信は許可されない（`nullable: true` が設定されていないため）

##### Register*Paramsでの nullable: true 禁止

```yaml
# ❌ Bad: Register*Paramsに nullable: true を設定
RegisterTodoParams:
  properties:
    projectId:
      type: string
      minLength: 1
      nullable: true    # ❌ 新規作成時に「クリア」操作は不要

# ✅ Good: Register*Paramsは nullable: true なし
RegisterTodoParams:
  properties:
    projectId:
      type: string
      minLength: 1      # 空文字列禁止
      # nullable なし → 有効な値 or 省略 の2値のみ
```

##### クライアント実装

**参照**: `policy/web/api/20-request-normalization.md` - フロントエンドでの正規化

```typescript
// POST: 空文字列フィールドを省略（nullではなく送信しない）
const normalized = normalizePostRequest(data);
// { title: "タスク", description: "" } → { title: "タスク" }

await fetch("/todos", {
  method: "POST",
  body: JSON.stringify(normalized),
});
```

### GET: リソース取得

```yaml
get:
  summary: リソース取得
  parameters:
    - name: {entity}Id
      in: path
      required: true
      schema:
        type: string
  responses:
    '200':
      description: リソース取得成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/{Entity}Response'
    '404':
      description: リソースが見つかりません
```

### GET: リソース一覧取得

```yaml
get:
  summary: リソース一覧取得
  responses:
    "200":
      description: リソース一覧取得成功
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/{Entity}sResponse"
```

**重要**:

- 空配列も200 OKで返す（404ではない）
- ページネーションパラメータは将来的に追加可能

### PATCH: リソース更新

```yaml
patch:
  summary: リソース更新
  parameters:
    - name: {entity}Id
      in: path
      required: true
      schema:
        type: string
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Update{Entity}Params'
  responses:
    '200':
      description: リソース更新成功
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/{Entity}Response'
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
      description: リソースが見つかりません
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

##### nullable: true 設定の判断フレームワーク

**Update\*Params（PATCH）の各オプショナルフィールドについて、以下を検討する**:

```
┌─────────────────────────────────────────────────────────┐
│ Q: ユーザーが一度設定した値を「未設定」に戻したいか？ │
├─────────────────────────────────────────────────────────┤
│ YES → nullable: true を設定                             │
│ NO  → nullable: true は不要                             │
└─────────────────────────────────────────────────────────┘
```

##### フィールドタイプ別の判断基準

| フィールドタイプ                                 | nullable: true | 理由・ユースケース                   |
| ------------------------------------------------ | -------------- | ------------------------------------ |
| **日付フィールド**（`dueDate`, `completedAt`等） | ✅ **必須**    | 「期限なし」「未完了」に戻したい     |
| **外部ID**（`projectId`, `assigneeUserId`等）    | ✅ **必須**    | 「未割り当て」「関連なし」に戻したい |
| **説明文**（`description`等）                    | ✅ **必須**    | 説明を削除したい                     |
| **必須フィールド**（`title`, `name`等）          | ❌ 不要        | 削除の概念がない                     |
| **enum型**（`status`, `priority`等）             | ❌ 不要        | 別の値に遷移する（削除ではない）     |
| **boolean型**                                    | ❌ 不要        | true/falseで完結（削除の概念なし）   |

##### 具体例: 日付フィールド

**ユースケース**: 「日付を設定したが、やっぱり日付なしに戻したい」

```yaml
# ✅ Good: nullable: trueを設定
Update{Entity}Params:
  properties:
    dueDate:
      type: string
      format: date
      nullable: true  # クリア操作を許可
      description: 期限日（nullで"日付なし"に設定）

# ❌ Bad: nullable: trueがない
Update{Entity}Params:
  properties:
    dueDate:
      type: string
      format: date
      # 問題: 一度設定した日付を削除できない
      #       フィールド省略 = 変更なし となるため
```

##### 具体例: 外部ID

**ユースケース**: 「親リソースに割り当てたが、未割り当てに戻したい」

```yaml
# ✅ Good: nullable: trueを設定
Update{Entity}Params:
  properties:
    {parentEntity}Id:
      type: string
      minLength: 1
      nullable: true  # クリア操作を許可
      description: 親リソースID（省略可能、nullで"未割り当て"に設定）

# ❌ Bad: nullable: trueがない
Update{Entity}Params:
  properties:
    {parentEntity}Id:
      type: string
      minLength: 1
      # 問題: 一度割り当てた親リソースを解除できない
```

##### 具体例: 説明文

**ユースケース**: 「説明を書いたが、削除したい」

```yaml
# ✅ Good: nullable: trueとminLength: 1を両方設定
Update{Entity}Params:
  properties:
    description:
      type: string
      minLength: 1      # 送信する場合は1文字以上（空文字列禁止）
      maxLength: 5000
      nullable: true    # クリア操作を許可
      description: 説明（省略可能、nullで"説明なし"に設定）

# ❌ Bad: nullable: trueがない、またはminLength: 1がない
Update{Entity}Params:
  properties:
    description:
      type: string
      maxLength: 5000
      # 問題1: minLength: 1がない → 空文字列が許可される
      # 問題2: nullable: trueがない → 説明を削除できない
```

##### 3値の区別

| クライアント送信 | JSON表現                              | 意味       | TypeScript内部                                   |
| ---------------- | ------------------------------------- | ---------- | ------------------------------------------------ |
| フィールド省略   | `{}`                                  | 変更しない | プロパティなし（`'dueDate' in input === false`） |
| `null`送信       | `{"dueDate": null}`                   | クリアする | `undefined`                                      |
| 値を送信         | `{"dueDate": "2025-01-01T00:00:00Z"}` | 値を設定   | `string`                                         |

##### クライアント実装例

**参照**: `policy/web/api/20-request-normalization.md` - フロントエンドでの正規化実装

```typescript
// ケース1: フィールドを変更しない（省略）
PATCH /{resources}/123
{}

// ケース2: フィールドをクリア（nullを送信）
PATCH /{resources}/123
{
  "dueDate": null,                // 日付なしに戻す
  "{parentEntity}Id": null,       // 親リソース未割り当てに戻す
  "description": null             // 説明を削除
}

// ケース3: フィールドを更新（値を送信）
PATCH /{resources}/123
{
  "dueDate": "2025-01-01",
  "{parentEntity}Id": "parent-456",
  "description": "新しい説明"
}
```

**重要**: フロントエンドでは `dirtyFields` を使用して変更フィールドを検出し、空文字列は `null` に変換して送信する。

##### TypeScript内部への変換

**参照**: `policy/server/handler/10-handler-overview.md` - null → undefined 変換パターン

- **API層（JSON）**: `null`を許可（`nullable: true`）
- **Handler層**: `null` → `undefined`変換を実施
- **TypeScript内部**: `undefined`のみ使用（TypeScriptベストプラクティス）

**重要**: TypeScript内部では`null`を使用しない。`undefined`のみ使用する。

##### 完全なOpenAPI定義例

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      minLength: 1
      maxLength: 200
      description: TODOのタイトル
      # nullable: true 不要（必須フィールドの概念）

    description:
      type: string
      minLength: 1 # 空文字列禁止
      maxLength: 5000
      nullable: true # クリア操作を許可
      description: TODOの詳細説明（省略可能、nullで"説明なし"に設定）

    status:
      $ref: "#/components/schemas/TodoStatus"
      # nullable: true 不要（enum、削除ではなく遷移）

    priority:
      $ref: "#/components/schemas/TodoPriority"
      # nullable: true 不要（enum、削除ではなく変更）

    dueDate:
      type: string
      format: date
      nullable: true # クリア操作を許可
      description: 期限日（nullで"期限なし"に設定）

    projectId:
      type: string
      minLength: 1 # 空文字列禁止
      nullable: true # クリア操作を許可
      description: プロジェクトID（省略可能、nullで"未割り当て"に設定）

    assigneeUserId:
      type: string
      minLength: 1 # 空文字列禁止
      nullable: true # クリア操作を許可
      description: 担当者のユーザーID（省略可能、nullで"未割り当て"に設定）
```

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
    "204":
      description: TODO削除成功
    "404":
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
      $ref: "#/components/schemas/TodoStatus"
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
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "新しいタイトル", // 変更したいフィールドのみ
  }),
});
```

**メリット**:

- 1回のHTTPリクエストで完結
- ネットワーク帯域節約
- クライアントコードがシンプル
- GETが不要（楽観的ロック実装時のみGET）

### PUTを使用しない理由

| 項目             | PATCH統一           | PUT/PATCH使い分け      |
| ---------------- | ------------------- | ---------------------- |
| ガードレール     | ✅ 判断不要         | ❌ 使い分け判断が必要  |
| 実装一貫性       | ✅ 常に同じパターン | ❌ 2種類のパターン混在 |
| クライアント負荷 | ✅ PATCH（1回）     | △ GET + PUT（2回）     |
| 認知負荷         | ✅ 低い             | ❌ 高い（判断コスト）  |

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

### エンドポイント（paths）

```
[ ] Current Userパターンを使用（/users/me）
[ ] ネストされたリソースは階層的URL（/parent/{parentId}/child/{childId}）
[ ] パスパラメータは単数形+Id、camelCase
[ ] 特殊アクションは動詞を含むパス（/prepare, /download-url）
[ ] HTTPメソッドとCRUD操作が正しくマッピング（POST=Create, GET=Read, PATCH=Update, DELETE=Delete）
[ ] PUTは使用しない
```

### リクエストスキーマ（Register\*Params）

```
[ ] 必須フィールドをrequiredに列挙
[ ] すべての文字列フィールドにminLength: 1
```

### リクエストスキーマ（Update\*Params）

```
[ ] requiredは空（全フィールドoptional）
[ ] すべての文字列フィールドにminLength: 1
[ ] 値のクリアが必要なフィールドにnullable: true（日付、外部ID、説明文等）
```

### レスポンススキーマ

```
[ ] POST: 201 Created、作成されたリソースを返す
[ ] PATCH: 200 OK、更新後リソース全体を返す
[ ] DELETE: 204 No Content、レスポンスボディなし
[ ] ネストされたリソースに親IDを含める
```

### エラーレスポンス

```
[ ] 400: ValidationError（型レベルバリデーション）
[ ] 401: UnauthorizedError（認証が必要なエンドポイント）
[ ] 403: ForbiddenError（認可チェックがあるエンドポイント）
[ ] 404: NotFoundError（IDによる取得を行うエンドポイント）
[ ] 422: DomainError（ドメインルール検証があるエンドポイント）
[ ] 500: UnexpectedError（全エンドポイント）
```

### セキュリティ

```
[ ] 認証必須エンドポイントにsecurityフィールド設定
```
