# エラーレスポンス設計

## 核心原則

エラーレスポンスは**発生階層に応じたHTTPステータスコード**を返し、**統一されたエラーレスポンス形式**で詳細を伝える。

**関連ドキュメント**:
- **ドメインバリデーション**: `../../server/domain-model/11-validation-strategy.md`
- **HTTP操作**: `30-http-operations-overview.md`

## エラーステータスコード一覧

| HTTPステータスコード      | エラー型            | 発生階層          | 用途                                        |
| ------------------------- | ------------------- | ----------------- | ------------------------------------------- |
| 400 Bad Request           | `ValidationError`   | Handler層         | 型レベルバリデーションエラー（OpenAPI/Zod） |
| 401 Unauthorized          | `UnauthorizedError` | 認証ミドルウェア  | 認証エラー（トークン無効・未提供）          |
| 403 Forbidden             | `ForbiddenError`    | UseCase層         | 認可エラー（権限不足）                      |
| 404 Not Found             | `NotFoundError`     | UseCase層         | リソース未検出                              |
| 409 Conflict              | `ConflictError`     | UseCase層         | データ競合                                  |
| 422 Unprocessable Entity  | `DomainError`       | Domain層          | ドメインルールエラー                        |
| 500 Internal Server Error | `UnexpectedError`   | 任意              | 予期せぬエラー                              |

## エラーレスポンス形式

```yaml
ErrorResponse:
  type: object
  required:
    - name
    - message
  properties:
    name:
      type: string
      description: エラー型名
    message:
      type: string
      description: エラーメッセージ
```

### レスポンス例

```json
{"name": "ValidationError", "message": "入力値が不正です"}
{"name": "UnauthorizedError", "message": "認証が必要です"}
{"name": "ForbiddenError", "message": "アクセスが拒否されました"}
{"name": "NotFoundError", "message": "リソースが見つかりませんでした"}
{"name": "ConflictError", "message": "データが競合しています"}
{"name": "DomainError", "message": "18歳以上である必要があります"}
{"name": "UnexpectedError", "message": "予期せぬエラーが発生しました"}
```

## 各エラー型の詳細

### ValidationError（400）

OpenAPI/Zodで自動検証される型レベルの制約違反。

**発生条件**:
- maxLength、pattern、enum、required等の制約違反
- Handler層で自動的にキャッチされる

**責務**: 型レベルバリデーションはOpenAPI/Zodの責務。

### UnauthorizedError（401）

認証エラー。

**発生条件**:
- JWTトークンが無効、期限切れ、または未提供
- API Gateway/認証ミドルウェア層で発生

**重要**: 認証が必要な全てのエンドポイントに定義必須（`50-security.md` 参照）

### ForbiddenError（403）

認可エラー。

**発生条件**:
- 認証は成功したが、リソースへのアクセス権限がない
- 例: 他人のTODOを更新、削除しようとした
- UseCase層で発生

### NotFoundError（404）

リソース未検出。

**発生条件**:
- 指定されたIDのリソースが存在しない
- UseCase層で発生

### ConflictError（409）

データ競合。

**発生条件**:
- 楽観的ロックの競合
- 一意制約違反
- UseCase層で発生

### DomainError（422）

ドメインロジックを含むビジネスルール違反。

**発生条件**:
- 例: 18歳以上、会社ドメインのメールアドレスのみ、完了済みTODOのステータス変更不可
- Domain層（Value Object/Entity）で発生する
- OpenAPIでも表現可能な場合があるが、**実施しない**

**理由**: ドメインロジックはValue Objectに集約し、責務を明確にする。

### UnexpectedError（500）

予期せぬエラー。

**発生条件**:
- システム障害、データベース接続エラー等
- 本番環境では詳細を隠す

## OpenAPI定義例

```yaml
post:
  summary: TODOを登録
  responses:
    "201":
      description: TODO登録成功
    "400":
      description: バリデーションエラー（型レベル）
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    "401":
      description: 認証エラー
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
    "500":
      description: 予期せぬエラー
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
```

## エンドポイント別のエラー定義指針

| エンドポイント種別 | 必須エラー                          |
| ------------------ | ----------------------------------- |
| POST（作成）       | 400, 401, 422, 500                  |
| GET（単一）        | 401, 404, 500                       |
| GET（一覧）        | 401, 500                            |
| PATCH（更新）      | 400, 401, 403, 404, 422, 500        |
| DELETE（削除）     | 401, 403, 404, 500                  |

## Do / Don't

### ✅ Good

```yaml
# 適切なエラーレスポンス定義
responses:
  "400":
    description: バリデーションエラー
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/ErrorResponse"
  "422":
    description: ドメインルールエラー
```

```typescript
// 適切な階層でエラーを発生させる
// Domain層: DomainError
if (age < 18) {
  return err(new DomainError("18歳以上である必要があります"));
}

// UseCase層: NotFoundError
if (!todo) {
  return err(new NotFoundError("TODOが見つかりません"));
}
```

### ❌ Bad

```yaml
# エラーレスポンス定義なし
responses:
  "201":
    description: 成功
  # ❌ エラーレスポンスが未定義
```

```typescript
// 誤った階層でエラーを発生
// ❌ Handler層でドメインロジックを実装
if (age < 18) {
  return c.json({ error: "18歳以上である必要があります" }, 400);
}
```
