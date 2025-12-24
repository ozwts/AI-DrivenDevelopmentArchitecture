# HTTP操作パターン

## 核心原則

すべての更新操作に**PATCHを使用**し、PUT/PATCHの使い分けはしない。各HTTPメソッドは明確なCRUD操作にマッピングする。

**関連ドキュメント**:
- **URL設計**: `20-url-design.md`
- **PATCH 3値セマンティクス**: `31-patch-semantics.md`
- **エラーレスポンス**: `40-error-responses.md`
- **バリデーション制約**: `15-validation-constraints.md`

## HTTPメソッドとCRUD操作のマッピング

| HTTPメソッド | CRUD操作 | ステータスコード | 説明                              |
| ------------ | -------- | ---------------- | --------------------------------- |
| POST         | Create   | 201 Created      | リソース作成                      |
| GET          | Read     | 200 OK           | リソース取得                      |
| PATCH        | Update   | 200 OK           | リソース更新（**PATCH統一原則**） |
| DELETE       | Delete   | 204 No Content   | リソース削除                      |

## PATCH統一ポリシー

### 統一の理由

#### 1. ガードレールとしての機能

使い分けルールは守られない。統一ルールが開発体験を向上させる。

**問題**:
- PUT（全フィールド必須）とPATCH（部分更新）の使い分けは複雑
- 「どちらを使うべきか」の判断コストが発生
- 開発者間で解釈のブレが生じる

**解決**:
- **すべてPATCHに統一** → 判断不要
- OpenAPIスキーマ設計パターンが統一
- クライアント実装パターンが統一

#### 2. 実装の一貫性

| 項目             | PATCH統一           | PUT/PATCH使い分け      |
| ---------------- | ------------------- | ---------------------- |
| ガードレール     | ✅ 判断不要         | ❌ 使い分け判断が必要  |
| 実装一貫性       | ✅ 常に同じパターン | ❌ 2種類のパターン混在 |
| クライアント負荷 | ✅ PATCH（1回）     | △ GET + PUT（2回）     |

### 例外: ビジネス操作専用エンドポイント

重要なビジネス操作は、専用エンドポイントを検討（RPC風アプローチ）。

```yaml
# 専用エンドポイント（重要なビジネス操作）
PUT /todos/{todoId}/complete
  requestBody:
    CompleteTodoParams:
      required: [completedAt]
      properties:
        completedAt:
          type: string
          format: date-time
```

**適用判断**:
- 重要なビジネスドメイン操作
- 複雑なビジネスルールが付随
- 操作の意図を明確にしたい

## POST: リソース作成

### OpenAPI定義

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
      description: バリデーションエラー
    "422":
      description: ドメインルールエラー
```

### 2値セマンティクス

POSTリクエストでは**2値のみ**を区別する：

| クライアント送信 | JSON表現                        | 意味                   |
| ---------------- | ------------------------------- | ---------------------- |
| フィールド省略   | `{}`                            | 未設定（デフォルト値） |
| 値を送信         | `{"projectId": "proj-123"}`     | 値を設定               |

**重要**: `null` 送信は許可されない（`nullable: true` が設定されていないため）

### Register*Paramsの設計

```yaml
# Register*Paramsは nullable: true なし
RegisterTodoParams:
  type: object
  required:
    - title
  properties:
    title:
      type: string
      maxLength: 200
    projectId:
      type: string
      # nullable なし → 有効な値 or 省略 の2値のみ
```

**参照**: `15-validation-constraints.md` - 空文字列の扱い

## GET: リソース取得

### 単一リソース

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
    "200":
      description: リソース取得成功
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/{Entity}Response"
    "404":
      description: リソースが見つかりません
```

### リソース一覧

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

**重要**: 空配列も200 OKで返す（404ではない）

## PATCH: リソース更新

### OpenAPI定義

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
          $ref: "#/components/schemas/Update{Entity}Params"
  responses:
    "200":
      description: リソース更新成功
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/{Entity}Response"
    "400":
      description: バリデーションエラー
    "403":
      description: アクセス拒否
    "404":
      description: リソースが見つかりません
    "422":
      description: ドメインルールエラー
```

### Update*Paramsの設計

**すべてオプショナル**（requiredには含めない）

```yaml
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
      maxLength: 200
    description:
      type: string
      maxLength: 5000
      nullable: true  # クリア操作を許可
    dueDate:
      type: string
      format: date-time
      nullable: true  # クリア操作を許可
```

**3値セマンティクスの詳細**: `31-patch-semantics.md` を参照

## DELETE: リソース削除

```yaml
delete:
  summary: リソース削除
  parameters:
    - name: {entity}Id
      in: path
      required: true
      schema:
        type: string
  responses:
    "204":
      description: リソース削除成功
    "404":
      description: リソースが見つかりません
```

**重要**:
- 204 No Contentを返す（レスポンスボディなし）
- 削除成功時はボディ不要（べき等性）

## クライアント実装パターン

```typescript
// POST: 新規作成
await fetch("/todos", {
  method: "POST",
  body: JSON.stringify({ title: "新しいタスク" }),
});

// PATCH: 変更したいフィールドのみ送信
await fetch(`/todos/${todoId}`, {
  method: "PATCH",
  body: JSON.stringify({ title: "新しいタイトル" }),
});

// DELETE: ボディなし
await fetch(`/todos/${todoId}`, { method: "DELETE" });
```

## Do / Don't

### ✅ Good

```yaml
# PATCH: すべてオプショナル
UpdateTodoParams:
  type: object
  properties:
    title:
      type: string
    description:
      type: string
      nullable: true
  # requiredは空

# 明確なHTTPメソッド使用
POST /todos        # 作成（201）
GET /todos/{id}    # 取得（200）
PATCH /todos/{id}  # 更新（200）
DELETE /todos/{id} # 削除（204）
```

### ❌ Bad

```yaml
# PUTの使用
PUT /todos/{id}  # ❌ PATCHに統一すべき

# requiredに更新フィールドを含める
UpdateTodoParams:
  required: [title, status]  # ❌ requiredは空にすべき

# 不適切なHTTPメソッド
GET /todos/create  # ❌ POSTを使うべき
POST /todos/{id}/delete  # ❌ DELETEを使うべき
```
