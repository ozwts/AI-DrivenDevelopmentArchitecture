# セキュリティ設定

## 核心原則

認証が必要なすべてのエンドポイントに`security`フィールドを設定し、認証不要なエンドポイントのみ省略する。

**関連ドキュメント**:
- **エラーレスポンス**: `40-error-responses.md` - 401 Unauthorized
- **URL設計**: `20-url-design.md` - Current Userパターン

## セキュリティスキーマ定義

```yaml
components:
  securitySchemes:
    CognitoAuthorizer:
      type: apiKey
      in: header
      name: Authorization
      x-amazon-apigateway-authtype: cognito_user_pools
```

## エンドポイントへの適用

### 認証必須エンドポイント

```yaml
paths:
  /todos:
    get:
      security:
        - CognitoAuthorizer: []
      responses:
        "200":
          description: TODO一覧取得成功
        "401":
          description: 認証エラー
```

**重要**: `security`フィールドと401エラーレスポンスをセットで定義する。

### 認証不要エンドポイント

```yaml
paths:
  /health:
    get:
      # security を省略 = 認証不要
      responses:
        "200":
          description: ヘルスチェック成功
```

## 認証不要エンドポイントの例

| エンドポイント | 用途                     |
| -------------- | ------------------------ |
| `/health`      | ヘルスチェック           |
| `/version`     | バージョン情報           |
| `/.well-known` | OpenID Connect Discovery |

## Do / Don't

### ✅ Good

```yaml
# 認証必須エンドポイント
/todos:
  get:
    security:
      - CognitoAuthorizer: []
    responses:
      "401":
        description: 認証エラー

# 認証不要エンドポイント（明示的に省略）
/health:
  get:
    # security なし = 認証不要
    responses:
      "200":
        description: OK
```

### ❌ Bad

```yaml
# セキュリティ設定忘れ
/todos:
  get:
    # ❌ security が未設定
    responses:
      "200":
        description: TODO一覧

# 401エラー定義忘れ
/todos:
  get:
    security:
      - CognitoAuthorizer: []
    responses:
      "200":
        description: TODO一覧
      # ❌ 401 が未定義
```
